import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * Throttler customizado para rotas de autenticação:
 * 1. Chaveia tentativas por IP + E-mail (quando presente no corpo da requisição).
 *    Dessa forma, falhas consecutivas de senha em uma conta NÃO bloqueiam outros
 *    moradores ou administradores na mesma rede ou máquina de testes local.
 * 2. Emite mensagem legível em português quando o limite for excedido.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const rawIp = req.ips?.length ? req.ips[0] : (req.ip || req.connection?.remoteAddress || '127.0.0.1');
    const email = req.body?.email ? `:${req.body.email.toString().toLowerCase().trim()}` : '';
    return `${rawIp}${email}`;
  }

  protected async throwThrottlingException(
    _context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException(
      'Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes e tente novamente.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
