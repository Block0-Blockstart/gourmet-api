import { DynamicModule, Logger, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app/app.config.service';
import { ethers } from 'ethers';

function withMoreNetworkNames(network: ethers.providers.Network): ethers.providers.Network {
  let name: string;
  switch (network.chainId) {
    case 83584648538:
      name = 'Alastria T Network';
      break;
    case 2020:
      name = 'Alastria B Network';
      break;
    case 1337:
      name = 'Ganache';
      break;
    case 80001:
      name = 'Polygon Mumbai';
      break;
    default:
      name = network.name;
  }
  return { ...network, name };
}

@Module({})
export class ChainProviderModule {
  static forRootAsync({ isGlobal = true }: { isGlobal: boolean }): DynamicModule {
    return {
      module: ChainProviderModule,
      global: isGlobal,
      imports: [], //no need to import AppConfigService as it is declared global in app module
      providers: [
        {
          provide: 'CHAIN_PROVIDER',
          inject: [AppConfigService],
          useFactory: async (cs: AppConfigService) => {
            const logger = new Logger('ChainProviderModule');
            const provider = new ethers.providers.JsonRpcProvider(cs.BLOCKCHAIN_RPC_URL_PORT);
            logger.log('Waiting for JSON-RPC Connection...');

            const network = await provider.ready; // enforce waiting for connection
            const { chainId, name } = withMoreNetworkNames(network);
            const lastBlock = await provider.getBlockNumber();
            const gasPrice = await provider.getGasPrice();
            logger.log(
              `JSON-RPC Connection established: [Provider Infos] Blockchain: '${name}', Chain ID: '${chainId}', Last block mined: '${lastBlock}', Gas price: '${gasPrice}'`
            );

            return provider;
          },
        },
      ],
      exports: ['CHAIN_PROVIDER'],
    };
  }
}
