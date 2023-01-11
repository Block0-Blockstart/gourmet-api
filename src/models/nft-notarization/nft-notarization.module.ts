import { Module } from '@nestjs/common';
import { ContractsModule } from 'src/services/contracts/contracts.module';
import { NftNotarizationController } from './nft-notarization.controller';
import { NftNotarizationService } from './nft-notarization.service';

@Module({
  imports: [ContractsModule],
  controllers: [NftNotarizationController],
  providers: [NftNotarizationService],
})
export class NftNotarizationModule {}
