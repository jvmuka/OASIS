import { Module, Global, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard, PerfilGuard } from './guards';

function obterJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const msg = 'FATAL: variavel de ambiente JWT_SECRET nao definida. Defina-a antes de iniciar a aplicacao.';
    Logger.error(msg, 'AuthModule');
    throw new Error(msg);
  }
  if (secret.length < 32) {
    Logger.warn('JWT_SECRET muito curto (menos de 32 caracteres). Use uma chave mais forte em producao.', 'AuthModule');
  }
  return secret;
}

@Global()
@Module({
  imports: [JwtModule.register({
    global: true,
    secret: obterJwtSecret(),
    signOptions: { expiresIn: '8h' },
  })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PerfilGuard],
  exports: [JwtAuthGuard, PerfilGuard],
})
export class AuthModule {}
