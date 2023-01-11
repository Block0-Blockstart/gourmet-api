import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';

@Module({
  imports: [],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
