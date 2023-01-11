import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { errors, ethers } from 'ethers';
import { TransactionResponse, TransactionReceipt } from '@ethersproject/abstract-provider';
import { getPattern as importPattern } from '../../config/contracts/getPattern';

export interface IContractPattern {
  name: string;
  abi: Array<any>;
  bytecode: {
    object: string;
    [propName: string]: any;
  };
}

export interface IDefaultTxParams {
  chainId: number;
  gasPrice: ethers.BigNumber;
  gasLimit: ethers.BigNumber;
  type: number;
}

export interface IEthersError {
  code: errors;
  reason: string;
  [index: string]: any;
}

export interface IReadContractStorage {
  contractName: string;
  address: string;
  fnName: string;
  fnParams?: any[];
}

@Injectable()
export class ContractsService {
  private logger = new Logger('ContractsService');

  constructor(
    @Inject('CHAIN_PROVIDER') private chainProvider: ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider
  ) {}

  /**
   *
   * Returns the provider used by this service.
   *
   */
  getProvider() {
    return this.chainProvider;
  }

  /**
   *
   * Returns { name, abi, bytecode } for the given contractName.
   * If this contractName is not known by this service, app will throw.
   *
   */
  getPattern(contractName: string): IContractPattern {
    return importPattern(contractName);
  }

  /**
   *
   * Returns an ethers Contract instance for this contractName. The instance
   * is linked to the given address and to the jsonRpc provider from env.
   * If the wallet (third) argument is provided, the contract is linked to
   * this wallet as a signer.
   *
   * WARNING: this function will NOT
   *  * check the address.
   *  * check if the contract name matches the contract deployed at the given address.
   *
   */
  getContractInstance(contractName: string, address: string, wallet?: ethers.Wallet) {
    return new ethers.Contract(
      address,
      this.getPattern(contractName.toLowerCase()).abi,
      wallet && wallet instanceof ethers.Wallet ? wallet : this.chainProvider
    );
  }

  /**
   *
   * Util that removes null bytes from an event log
   *
   */
  removeNullBytes(str: string): string {
    return str
      .split('')
      .filter(c => c.codePointAt(0))
      .join('');
  }

  /**
   *
   * Wraps a "transaction function" and manages errors.
   * Returns the transaction receipt.
   * Note: a "transaction function" is any function without args and returning a Transaction Response.
   *
   */
  async sendTx(txFn: () => Promise<TransactionResponse>): Promise<TransactionReceipt> {
    let txResponse: TransactionResponse;
    try {
      txResponse = await txFn();
    } catch (e) {
      await this.manageEthersErrors(e);
    }

    let txReceipt: TransactionReceipt;
    try {
      txReceipt = await txResponse.wait();
    } catch (e) {
      await this.manageEthersErrors(e);
    }
    return txReceipt;
  }

  /*
   *
   * Make a simple call to any smart contract function
   *
   */
  async callContractFunction({ contractName, fnName, fnParams, address }: IReadContractStorage): Promise<any> {
    const contract = new ethers.Contract(address, this.getPattern(contractName).abi, this.chainProvider);
    try {
      const data =
        fnParams && fnParams.length && fnParams.length > 0
          ? await contract[fnName](...fnParams)
          : await contract[fnName]();
      return data;
    } catch (e) {
      await this.manageEthersErrors(e);
    }
  }

  /**
   * Retrieves a transaction receipt from a transaction hash.
   * If "allowNull" param is true, returns null when no receipt is found.
   * If "allowNull" param is false, throws an error when no receipt is found.
   *
   * Also throws any ethers error that could occur while trying to retreive the receipt.
   */
  async getTxReceipt(txHash: string, allowNull: true): Promise<TransactionReceipt | null>;
  async getTxReceipt(txHash: string, allowNull: false): Promise<TransactionReceipt>;
  async getTxReceipt(txHash: string, allowNull: boolean): Promise<TransactionReceipt | null>;
  async getTxReceipt(txHash: string, allowNull: boolean): Promise<TransactionReceipt | null> {
    const txReceipt = await this.chainProvider.getTransactionReceipt(txHash); // may return null or undefined or txReceipt
    if (txReceipt) return txReceipt;
    if (allowNull) return null;
    throw new Error(`No transaction receipt found for transaction hash ${txHash}.`);
  }

  /**
   *
   * Parses ethers error and:
   *  * if the error is thrown by a smart contract (revert): throws an http 400 with revert message.
   *  * if the error results from bad connection (server unavailable, timeout): throws an http 500 with explicit message.
   *  * any other error is considered "fatal" (it should never happen => if it happens, it means this app does not manage something as it should be).
   *  Those "fatal" errors are not rethrown as http exceptions but as nodeJS Errors that crash the app.
   *
   */
  private async manageEthersErrors(ee: IEthersError, creationTime = false): Promise<void> {
    if (!ee.code) {
      this.logger.error('Unexpected non-ethers error in ethers error manager');
      throw ee;
    }
    switch (ee.code) {
      ///////////////////////////////////////////////////////////
      /// Fatal errors.
      /// If this happens, developers have missed something.
      /// This is a bug to fix !
      ///////////////////////////////////////////////////////////

      case errors.UNKNOWN_ERROR:
      case errors.BUFFER_OVERRUN:
      case errors.MISSING_NEW:
      case errors.NOT_IMPLEMENTED:
      case errors.NUMERIC_FAULT:
      case errors.UNSUPPORTED_OPERATION:
      // We fix the gasLimit manually, so this should never happen.
      case errors.UNPREDICTABLE_GAS_LIMIT:
      // Gas is free, so it should never happen.
      case errors.INSUFFICIENT_FUNDS:
      // The replacement fee for the transaction is too low
      // We do not support replacements, so this should not happen.
      // If it happens, it means we have allowed repeating a tx that is currently pending.
      // And it should be fixed.
      case errors.REPLACEMENT_UNDERPRICED:
      // Idem, we do not support replacements, so this should not happen.
      case errors.TRANSACTION_REPLACED: {
        this.logger.error('Fatal error. Bug to fix.');
        throw ee;
      }

      ///////////////////////////////////////////////////////////
      /// Errors from provider.
      /// If this happens, the provider is probably unreachable.
      /// This is a bug to fix, but probably on the provider side !
      /// We should mention an internal error, but not crash.
      ///
      /// Addendum: sometimes, ethers does not catch nonce errors
      /// and throws a server error instead.So we need to check,
      /// and it's nested very deeply !
      ///////////////////////////////////////////////////////////

      case errors.SERVER_ERROR: {
        if (
          ee.reason === 'processing response error' &&
          ee.error &&
          ee.error.data &&
          ee.error.data.stack &&
          ee.error.data.stack.split &&
          ee.error.data.stack.split("doesn't have the correct nonce").length > 1
        ) {
          throw new BadRequestException(`${ee.code}: bad nonce`);
        } else {
          this.logger.error('Error with rpc provider. See stack below: ');
          console.error(ee);
          throw new InternalServerErrorException();
        }
      }

      case errors.NETWORK_ERROR:
      case errors.TIMEOUT: {
        this.logger.error('Error with rpc provider. See stack below: ');
        console.error(ee);
        throw new InternalServerErrorException();
      }

      ///////////////////////////////////////////////////////////
      /// Bad requests.
      /// Cannot be retried: will always fail if the request stays unchanged.
      /// Consumer is faulthy and may fix this.
      ///////////////////////////////////////////////////////////

      // Nonce has already been used. Consumer app can retry with higher nonce.
      case errors.NONCE_EXPIRED: {
        throw new BadRequestException(`${ee.code}: ${ee.reason}`);
      }

      case errors.CALL_EXCEPTION: {
        // This error needs further analysis.
        // Ethers is expected to join the failed tx to the error.
        if (!ee.transaction) {
          throw new BadRequestException(`${ee.code}. Impossible to get the reason why the tx failed.`);
        }

        // if it's a simple CALL, there is no tx hash provided
        if (!ee.transaction.hash) {
          throw new BadRequestException(
            `${ee.code}. Bad call to address ${ee.address}. Reason: ${ee.reason || 'no revert reason provided'}.`
          );
        }

        // else, we expect a hash and we replay the tx to find the reason
        let failedTx: TransactionResponse;
        try {
          failedTx = await this.chainProvider.getTransaction(ee.transaction.hash);
        } catch (e) {
          this.logger.error(`Crashed when trying to fetch transaction with hash ${ee.transaction.hash}`);
          throw e;
        }

        if (!failedTx) {
          this.logger.error(`Unexpected undefined Tx with hash ${ee.transaction.hash}`);
          throw new Error(`Unexpected undefined Tx with hash ${ee.transaction.hash}`);
        }

        let code: string;
        try {
          code = await this.chainProvider.call(failedTx, failedTx.blockNumber);
        } catch (e) {
          this.logger.error(`Crashed when trying to replay failed transaction with hash ${ee.transaction.hash}`);
          throw e;
        }

        this.logger.verbose(`Replaying tx to detect error reason. Retrieved tx code is: '${code}'`);
        const reason = this.removeNullBytes(ethers.utils.toUtf8String('0x' + code.substring(138)));
        this.logger.verbose(`Found error reason for tx (hash=${ee.transaction.hash}). Reason is ${reason}`);
        //assuming that at this point, a failure is caused by a revert, for which the client is responsible and needs to know it
        throw new BadRequestException(reason);
      }

      ///////////////////////////////////////////////////////////
      /// Edge cases.
      /// These errors depends on the moment they are thrown.
      /// If thrown when WE CREATE THE TRANSACTION,
      /// we are responsible and they are Fatal errors, requiring bug fix.
      /// But if they are thrown when WE FORWARD A TRANSACTION created by someone else
      /// it means that the sender or a hacker has somehow broken the transaction,
      /// by mistake or by purpose(e.g. trying to modify some props after it is
      /// signed, or adding an arg that does not exist on function).
      ///////////////////////////////////////////////////////////

      // Invalid argument to a function (e.g. value is incompatible with type).
      // This should not happen here and SHOULD be checked before
      case errors.INVALID_ARGUMENT:
      // Missing argument to a function (e.g. expected 2 args, received 1).
      // This should not happen here and SHOULD be checked before
      case errors.MISSING_ARGUMENT:
      // Too many arguments to a function (e.g. expected 2 args, received 3).
      // This should not happen here and SHOULD be checked before
      case errors.UNEXPECTED_ARGUMENT: {
        if (creationTime) {
          this.logger.error('Fatal error. Bug to fix.');
          throw ee;
        }
        this.logger.verbose(`A broken transaction has been submited to be forwarded.`);
        throw new BadRequestException(`${ee.code}. Signed transaction is broken.`);
      }

      // the error has a code, but none of the documented ethers codes
      default:
        this.logger.error('Unknown error. See below:');
        console.error(ee);
        throw ee;
    }
  }
}
