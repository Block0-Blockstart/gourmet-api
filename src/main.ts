import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app/app.config.service';
import { NftNotarizationModule } from './models/nft-notarization/nft-notarization.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug', 'verbose'] });
  const logger = new Logger('bootstrap function');
  const config = app.get(AppConfigService);

  const port = config.API_PORT;
  const withSwagger = config.WITH_SWAGGER;

  if (withSwagger) {
    const docBuilder = new DocumentBuilder()
      .setTitle('Gourmet API')
      .setDescription('Gourmet API')
      .setVersion('0.1')
      .addTag('batch')
      .build();
    const doc = SwaggerModule.createDocument(app, docBuilder, { include: [NftNotarizationModule] });
    SwaggerModule.setup('api', app, doc);
    logger.log('Swagger is enabled');
  } else {
    logger.log('Swagger is disabled');
  }
  await app.listen(port);
  logger.log(`App is listening on port ${port}`);
}

bootstrap();
