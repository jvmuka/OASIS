import {
  CanActivate, ExecutionContext, Injectable,
  UnauthorizedException, ForbiddenException, SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

/** Decorator de rota: @Perfis('SINDICO') exige o perfil indicado. */
export const Perfis = (...tipos: string[]) => SetMetadata('perfis', tipos);

/** Valida o token Bearer e anexa o usuario em req.user. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Token ausente.');
    try {
      req.user = await this.jwt.verifyAsync(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token invalido ou expirado.');
    }
  }
}

/** Verifica se o usuario possui algum dos perfis exigidos pela rota. */
@Injectable()
export class PerfilGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<string[]>('perfis',
      [ctx.getHandler(), ctx.getClass()]);
    if (!exigidos || !exigidos.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    const meus: string[] = (user?.perfis || []).map((p: any) => p.tipo);
    const sinonimos = (t: string) => (t === 'SINDICO' || t === 'ADMINISTRADOR' ? ['SINDICO', 'ADMINISTRADOR'] : [t]);
    const permitidos = new Set(exigidos.flatMap(sinonimos));
    if (meus.some(t => permitidos.has(t))) return true;
    throw new ForbiddenException('Acesso restrito ao(s) perfil(is): ' + exigidos.join(', '));
  }
}

/** Devolve o id_perfil do usuario para um tipo especifico (ou o primeiro). */
export function perfilDoUsuario(user: any, tipo?: string): number {
  const lista = user?.perfis || [];
  let alvo;
  if (!tipo) {
    alvo = lista[0];
  } else if (tipo === 'SINDICO' || tipo === 'ADMINISTRADOR') {
    alvo = lista.find((p: any) => p.tipo === 'ADMINISTRADOR' || p.tipo === 'SINDICO');
  } else {
    alvo = lista.find((p: any) => p.tipo === tipo);
  }
  if (!alvo) throw new ForbiddenException('Usuario sem o perfil necessario.');
  return alvo.id_perfil;
}
