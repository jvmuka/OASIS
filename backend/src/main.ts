import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');          // todas as rotas comecam com /api
  app.enableCors();                    // libera o frontend em outra porta
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  const porta = process.env.PORT || 3000;
  await app.listen(porta);
  console.log(`OASIS API rodando em http://localhost:${porta}/api`);
}
bootstrap();
