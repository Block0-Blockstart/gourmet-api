import { TransactionReceipt } from '@ethersproject/providers';
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { AppConfigService } from 'src/config/app/app.config.service';
import { ContractsService } from 'src/services/contracts/contracts.service';
import { MintNftRequestDto } from './dtos/request/mint-nft-request.dto';

/*
Important note:  
The user manages which data should be readable on-chain and which data should be hashed.
==> Data that must be hashed are hashed by the user before calling this API.

CREATE THE NOTARIZATION NFT

1.
Data are sent to the notarization SC 
  => the SC emits NotarizeData event
  => the API retreives the tx hash (A)

2.
The admin account mints a NFT to himself using the NFT SC
  => the SC emits Transfer event
  => the API retreives the token id (B)

3.
The admin account calls setTokenTransactionHash on the NFT SC
  => in a mapping, the SC stores the association between the token Id (B) and the tx hash of the notarization (A)
  => this is a one-time operation, cannot change this association later
  => the SC emits BatchIdTokenId event (with topics: batchId, tokenId)

FIND AND READ THE NOTARIZATION NFT

1.
Search all BatchIdTokenId events emitted by the NFT SC for a given Batch Id

2.
For each event found:
 - retrieve the associated token Id from the BatchIdTokenId event
 - retrieve the notarization tx hash for this token Id from the mapping in the NFT SC
 - retreive the tx matching the tx hash
 - from the tx, find the NotarizeData event that was emitted
 - extract the data from the event
 - back in the NFT SC, find the Transfer event matching the token Id
 - finaly, return data and all useful metadata retrieved until this point
*/

export interface HashedFile {
  name: string;
  hash: string;
}
export interface Link {
  name: string;
  url: string;
}

export interface Field {
  name: string;
  hash: string;
}

export interface MintNftResponse {
  batch: {
    id: string;
    files: HashedFile[];
    links: Link[];
    fields: Field[];
  };
  blockchain: {
    mintTransactionHash: string;
    notarizationTransactionHash: string;
    tokenSmartContractAddress: string;
    notarizationSmartContractAddress: string;
    tokenId: number;
  };
}

@Injectable()
export class NftNotarizationService {
  private readonly logger = new Logger('NftNotarizationService');
  private readonly wallet: ethers.Wallet;
  private readonly nftContract: ethers.Contract;
  private readonly notarizationContract: ethers.Contract;
  private readonly adminAddress: string;
  private readonly tokenSmartContractAddress: string;
  private readonly notarizationSmartContractAddress: string;
  private notzContractOwner: string;
  private nftContractOwner: string;
  private sanityChecked = false;
  private minterModeChecked = false;
  private readerModeChecked = false;

  constructor(private acs: AppConfigService, private readonly cs: ContractsService) {
    // if no admin key in env, use a random wallet to read data ==> this allows for app deployment
    // on a user premises for read-only features
    this.wallet = this.acs.ADMIN_KEY
      ? new ethers.Wallet(this.acs.ADMIN_KEY, this.cs.getProvider())
      : ethers.Wallet.createRandom().connect(this.cs.getProvider());
    this.nftContract = this.cs.getContractInstance('nft', this.acs.NFT_CONTRACT_ADDRESS, this.wallet);
    this.notarizationContract = this.cs.getContractInstance(
      'notarization',
      this.acs.NOTARIZATION_CONTRACT_ADDRESS,
      this.wallet
    );
    this.adminAddress = this.acs.ADMIN_ADDRESS;
    this.tokenSmartContractAddress = this.acs.NFT_CONTRACT_ADDRESS;
    this.notarizationSmartContractAddress = this.acs.NOTARIZATION_CONTRACT_ADDRESS;
  }

  private async getNotzContractOwner() {
    if (this.notzContractOwner) return this.notzContractOwner;

    try {
      const notzContractOwner = await this.cs.callContractFunction({
        contractName: 'notarization',
        fnName: 'owner',
        address: this.notarizationSmartContractAddress,
      });
      this.logger.log('Check Notarization Contract owner... done.');
      this.notzContractOwner = notzContractOwner;
    } catch (e) {
      if (e && e.status === 400) {
        const msg = 'Notarization contract cannot be called. Is it deployed?';
        this.logger.error(msg);
        throw new InternalServerErrorException(msg);
      } else throw e;
    }
  }

  private async getNftContractOwner() {
    if (this.nftContractOwner) return this.nftContractOwner;

    try {
      const nftContractOwner = await this.cs.callContractFunction({
        contractName: 'nft',
        fnName: 'owner',
        address: this.tokenSmartContractAddress,
      });
      this.logger.log('Check NFT Contract owner... done.');
      this.nftContractOwner = nftContractOwner;
    } catch (e) {
      if (e && e.status === 400) {
        const msg = 'NFT contract cannot be called. Is it deployed?';
        this.logger.error(msg);
        throw new InternalServerErrorException(msg);
      } else throw e;
    }
  }

  private async sanityCheck() {
    if (this.sanityChecked) return;

    const notzContractOwner = await this.getNotzContractOwner();
    const nftContractOwner = await this.getNftContractOwner();

    if (notzContractOwner !== nftContractOwner) {
      const msg = 'Owner of NFT contract and Notarization contract are not the same.';
      this.logger.error(msg);
      throw new InternalServerErrorException(msg);
    }

    this.logger.log('Check unique contract ownership... done.');
    this.sanityChecked = true;
  }

  private async minterModeCheck() {
    if (this.minterModeChecked) return;

    await this.sanityCheck();

    if (!this.acs.MINTER_KEY) {
      this.logger.warn('Received a write (mint) request, but Minter Mode is disabled.');
      this.logger.warn('MINTER_KEY is not provided by the environment.');
      throw new ForbiddenException('Minter Mode disabled.');
    }
    this.logger.log('Check Minter Mode enabled: MINTER_KEY exists... done.');

    const notzContractOwner = await this.getNotzContractOwner();

    if (this.wallet.address !== notzContractOwner) {
      this.logger.error('Minter Mode is enabled (MINTER_KEY is defined) but minting is impossible.');
      this.logger.error('The admin private key does not match the owner of NFT and Notarization contracts.');
      this.logger.error('Check that the ADMIN_KEY is set in env, and ensure this key was used to deploy contracts.');
      throw new InternalServerErrorException('Minter Mode failure.');
    }

    this.logger.log('Check Minter Mode enabled: ADMIN_KEY validity... done.');
    this.minterModeChecked = true;
  }

  private async readerModeCheck() {
    if (this.readerModeChecked) return;

    await this.sanityCheck();

    if (!this.acs.READER_KEY && !this.acs.MINTER_KEY) {
      this.logger.warn('Received a read request, but Reader Mode is disabled.');
      this.logger.warn('Neither READER_KEY nor MINTER_KEY are provided by the environment.');
      throw new ForbiddenException('Reader Mode disabled.');
    }

    this.logger.log('Check Reader Mode enabled: READER_KEY and/or MINTER_KEY exists... done.');
    this.readerModeChecked = true;
  }

  /**
   * Notarize data, then link the notarization event to a newly minted NFT.
   */
  async mintNft(accesskey: string, dto: MintNftRequestDto): Promise<MintNftResponse> {
    await this.minterModeCheck();

    if (accesskey !== this.acs.MINTER_KEY) {
      throw new ForbiddenException('Invalid access key.');
    }

    // dto to array (ensuring fields order)
    const data = [
      dto.id,
      dto.files.map(f => [f.name, f.hash]),
      dto.links.map(l => [l.name, l.url]),
      dto.fields.map(f => [f.name, f.hash]),
    ];

    // event-based notarization (Notarization contract)
    const { transactionHash: notarizationTransactionHash } = await this.cs.sendTx(() =>
      this.notarizationContract.notarizeData(data)
    );
    this.logger.log(`Data successfully notarized.`);

    // safe mint NFT
    const mintTxReceipt: TransactionReceipt = await this.cs.sendTx(() => this.nftContract.safeMint(this.adminAddress));
    // parse the logs to retrieve the token ID of the minted NFT
    const parsedLogs = this.nftContract.interface.parseLog({
      topics: mintTxReceipt.logs[0].topics,
      data: mintTxReceipt.logs[0].data,
    });
    const tokenId = parsedLogs.args['tokenId'];
    this.logger.log(`NFT with tokenId ${tokenId} successfully minted (txHash = ${notarizationTransactionHash}).`);

    // populate the NFT content with the txHash of the notarization
    await this.cs.sendTx(() => this.nftContract.setTokenTransactionHash(tokenId, dto.id, notarizationTransactionHash));
    this.logger.log(
      `NFT with tokenId ${tokenId} successfully populated with: batch Id = ${dto.id} and notarization tx hash = ${notarizationTransactionHash}.`
    );

    return {
      batch: dto,
      blockchain: {
        mintTransactionHash: mintTxReceipt.transactionHash,
        notarizationTransactionHash,
        tokenSmartContractAddress: this.tokenSmartContractAddress,
        notarizationSmartContractAddress: this.notarizationSmartContractAddress,
        tokenId: parseInt(tokenId),
      },
    };
  }

  async getNftData(accesskey: string, batchId: string) {
    await this.readerModeCheck();

    if (accesskey !== this.acs.MINTER_KEY && accesskey !== this.acs.READER_KEY) {
      throw new ForbiddenException('Invalid access key.');
    }

    // get all "BatchIdTokenId" events emitted by the NFT SC about this batchId
    // topic[0] = event signature
    // topic[1-4] = indexed event params (null to skip one). As 32 bytes (padded if needed).
    // !! if the value is a string (like the event sig for example), it must be converted to utf8bytes, then hashed (keccak)
    let events: ethers.Event[];
    try {
      events = await this.nftContract.queryFilter({
        address: this.tokenSmartContractAddress,
        topics: [ethers.utils.id('BatchIdTokenId(string,uint256)'), ethers.utils.id(batchId)],
      });
    } catch (err) {
      const msg = 'Unable to query events on NFT contract.';
      this.logger.error(msg);
      console.error(err);
      throw new InternalServerErrorException(msg);
    }

    if (events.length === 0) {
      throw new NotFoundException(`No notarization token for batch Id ${batchId}.`);
    }

    this.logger.log(`Successfully retrieved NFT notarization events for batchId ${batchId}.`);

    const res = await Promise.all(
      // for each "BatchIdTokenId" event...
      events.map(async event => {
        // retrieve the token Id emitted by the "BatchIdTokenId"
        const tokenId = event.args['tokenId'];

        // using this token Id, find the tx hash of the Notarization SC transaction
        const notarizationTransactionHash = await this.cs.callContractFunction({
          contractName: 'nft',
          fnName: 'tokenTxHash',
          fnParams: [tokenId],
          address: this.tokenSmartContractAddress,
        });

        // using the tx hash, find the transaction from Notarization SC
        let txReceipt: TransactionReceipt;
        try {
          txReceipt = await this.cs.getTxReceipt(notarizationTransactionHash, false);
        } catch (e) {
          const msg = 'Unable to retrieve the notarization transaction from its transaction hash.';
          this.logger.error(msg);
          console.error(e);
          throw new InternalServerErrorException(msg);
        }

        // in this transaction, find the "NotarizeData" event that was emitted
        const parsedLogs = this.notarizationContract.interface.parseLog({
          topics: txReceipt.logs[0].topics,
          data: txReceipt.logs[0].data,
        });

        // retrieve the data emitted in the event
        const data = parsedLogs.args.data;
        const batch = this.parseNotarizationData({ data });

        // back to the NFT SC, find the "Transfer" event emitted when the token was minted
        let mintEvent: ethers.Event[];
        try {
          mintEvent = await this.nftContract.queryFilter({
            address: this.tokenSmartContractAddress,
            topics: [
              ethers.utils.id('Transfer(address,address,uint256)'),
              ethers.utils.hexZeroPad('0x0', 32), // should always be 0x0 address for mint event
              ethers.utils.hexZeroPad(this.adminAddress, 32), // only tokens minted by the admin (= owner)
              ethers.utils.hexZeroPad(tokenId, 32),
            ],
          });
        } catch (err) {
          const msg = 'Unable to query events on NFT contract.';
          this.logger.error(msg);
          console.error(err);
          throw new InternalServerErrorException(msg);
        }

        // At this point, we cannot figure out how this error could happen...
        if (mintEvent.length === 0) {
          this.logger.error(`Token with id ${tokenId} was minted but no event was emitted.`);
          throw new InternalServerErrorException('Fatal error.');
        }

        const mintTransactionHash = mintEvent[0].transactionHash;

        const response: MintNftResponse = {
          batch,
          blockchain: {
            mintTransactionHash,
            notarizationTransactionHash,
            tokenSmartContractAddress: this.tokenSmartContractAddress,
            notarizationSmartContractAddress: this.notarizationSmartContractAddress,
            tokenId: parseInt(tokenId),
          },
        };

        return response;
      })
    );

    this.logger.log(`Successfully retrieved all NFT's and their linked notarized data for batchId ${batchId}.`);
    return res;
  }

  // parse the event from the notarization contract to retrieve the content
  parseNotarizationData({ data }) {
    const id = data.id;
    const rawFiles = data.files;
    const rawLinks = data.links;
    const rawFields = data.fields;

    const files = [];
    for (const file of rawFiles) {
      files.push({ name: file.name, hash: file.hash });
    }

    const links = [];
    for (const link of rawLinks) {
      links.push({ name: link.name, url: link.url });
    }

    const fields = [];
    for (const field of rawFields) {
      fields.push({ name: field.name, hash: field.hash });
    }

    return {
      id,
      files,
      links,
      fields,
    };
  }
}
