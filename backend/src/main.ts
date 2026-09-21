import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MulterExceptionFilter } from './common/multer-exception.filter';

async function bootstrap() {
  // Garante que o diretorio de uploads existe antes de servir ou gravar
  const uploadsDir = join(__dirname, '..', 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);           // confia no proxy reverso do Vite e Docker para identificacao correta do IP
  app.setGlobalPrefix('api');          // todas as rotas comecam com /api

  // Seguranca: restringe CORS ao dominio do frontend
  const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
  app.enableCors({
    origin: origensPermitidas,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Seguranca: headers HTTP de protecao (X-Frame-Options, HSTS, CSP, etc.)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permite carregar uploads do frontend
  }));

  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new MulterExceptionFilter());

  // Servir imagens enviadas via upload com header nosniff
  app.useStaticAssets(uploadsDir, {
    prefix: '/uploads',
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  });

  const porta = process.env.PORT || 3000;
  await app.listen(porta);
  console.log(`OASIS API rodando em http://localhost:${porta}/api`);
}
bootstrap();

