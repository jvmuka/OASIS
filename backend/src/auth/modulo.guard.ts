import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DbService } from '../db/db.service';

/** Decorator de rota: @ExigeModulo('RESERVAS_AREAS') exige o módulo habilitado no condomínio do usuário. */
export const ExigeModulo = (codigoModulo: string) => SetMetadata('modulo_exigido', codigoModulo);

@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduloExigido = this.reflector.getAllAndOverride<string>('modulo_exigido', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduloExigido) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    // Superadmin possui passe-livre universal para auditar qualquer módulo
    const perfis = (user.perfis || []).map((p: any) => p.tipo);
    if (perfis.includes('SUPERADMIN')) return true;

    const idCondominio = Number(
      req.headers?.['x-condominio-id'] || user.id_condominio || 1,
    );

    const checagem = await this.db.query(
      `SELECT ativo FROM condominio_modulo WHERE id_condominio = $1 AND codigo_modulo = $2`,
      [idCondominio, moduloExigido],
    );

    // Se o registro não existir ou ativo for false, bloqueia
    if (!checagem.length || !checagem[0].ativo) {
      throw new ForbiddenException(
        `O módulo "${moduloExigido}" não está habilitado para o seu condomínio.`,
      );
    }

    return true;
  }
}

