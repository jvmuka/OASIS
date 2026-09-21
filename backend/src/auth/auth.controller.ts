import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthThrottlerGuard } from './auth-throttler.guard';

@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 15 } }) // até 15 tentativas por minuto por IP + e-mail
  login(@Body() body: { email: string; senha: string }) {
    return this.auth.login(body.email, body.senha);
  }

  @Post('validar-codigo')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  validarCodigo(@Body() body: { codigo: string; email: string }) {
    return this.auth.validarCodigo(body.codigo, body.email);
  }

  @Post('primeiro-acesso')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  primeiroAcesso(@Body() body: { codigo: string; email: string; novaSenha: string }) {
    return this.auth.primeiroAcesso(body.codigo, body.email, body.novaSenha);
  }

  @Post('esqueci-senha')
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  esqueciSenha(@Body() body: { email: string }) {
    return this.auth.solicitarRecuperacaoSenha(body.email);
  }

  @Post('redefinir-senha')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  redefinirSenha(@Body() body: { codigo: string; email: string; novaSenha: string }) {
    return this.auth.redefinirSenhaComCodigo(body.codigo, body.email, body.novaSenha);
  }
}
