import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { AppConfigModule } from './config/app/app.config.module';
import { NftNotarizationModule } from './models/nft-notarization/nft-notarization.module';
import { ChainProviderModule } from './services/chain-provider/chain-provider.module';

@Module({
  imports: [AppConfigModule, ChainProviderModule.forRootAsync({ isGlobal: true }), NftNotarizationModule],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      //whitelist true means that extra props (not included in DTOs) are removed from body/params before reaching our controllers
      useValue: new ValidationPipe({ whitelist: true }),
    },
  ],
})
export class AppModule {}
