import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import express from 'express';
import cookieParser from 'cookie-parser';
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs';

import { AppModule } from './app.module';
import {
  AFFiNELogger,
  CacheInterceptor,
  CloudThrottlerGuard,
  Config,
  GlobalExceptionFilter,
} from './base';
import { AuthGuard } from './core/auth';
import { serverTimingAndCache } from './middleware/timing';

let cachedApp: any;

async function bootstrap() {
  const expressApp = express();
  const nestApp = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new (await import('@nestjs/platform-express')).ExpressAdapter(expressApp),
    {
      cors: true,
      rawBody: true,
      bodyParser: true,
      bufferLogs: true,
    }
  );

  nestApp.useBodyParser('raw', { limit: 100 * OneMB });
  const logger = nestApp.get(AFFiNELogger);
  nestApp.useLogger(logger);

  nestApp.use(serverTimingAndCache);
  nestApp.use(
    graphqlUploadExpress({
      maxFileSize: 100 * OneMB,
      maxFiles: 32,
    })
  );

  nestApp.useGlobalGuards(nestApp.get(AuthGuard), nestApp.get(CloudThrottlerGuard));
  nestApp.useGlobalInterceptors(nestApp.get(CacheInterceptor));
  nestApp.useGlobalFilters(new GlobalExceptionFilter(nestApp.getHttpAdapter()));
  nestApp.use(cookieParser());

  await nestApp.init();
  return expressApp;
}

export default async (req: any, res: any) => {
  try {
    if (!cachedApp) {
      cachedApp = await bootstrap();
    }
    return cachedApp(req, res);
  } catch (err: any) {
    console.error('Vercel Handler Error:', err);
    res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      message: err.message,
      stack: err.stack,
    });
  }
};
