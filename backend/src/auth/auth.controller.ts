import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 5 } }) // maximo 5 tentativas por minuto em endpoints de autenticacao
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email: string; senha: string }) {
    return this.auth.login(body.email, body.senha);
  }

  @Post('validar-codigo')
  validarCodigo(@Body() body: { codigo: string; email: string }) {
    return this.auth.validarCodigo(body.codigo, body.email);
  }

  @Post('primeiro-acesso')
  primeiroAcesso(@Body() body: { codigo: string; email: string; novaSenha: string }) {
    return this.auth.primeiroAcesso(body.codigo, body.email, body.novaSenha);
  }
}
