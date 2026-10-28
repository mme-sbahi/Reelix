import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const allowedOrigin = configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000';

  // Security headers (CSP disabled so Swagger UI and the Vite dev server work).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  // Parses HttpOnly cookies (accessToken, refreshToken) into req.cookies.
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === 'null' || origin === allowedOrigin || origin === 'http://127.0.0.1:3000') {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  // Strips unknown properties and rejects payloads that don't match DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Makes @Exclude() on the User entity (password hash, refresh token hash)
  // actually apply to every response.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('hypertube API')
    .setDescription('Task management API — Auth & Users (Day 1)')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'refresh-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT') ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 hypertube API running on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`📚 Swagger docs at http://localhost:${port}/api`);
}
bootstrap();
