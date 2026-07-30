import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';

/**
 * INCREMENTO 1 (modo desenvolvimento):
 *   a senha aceita e a definida em DEV_SENHA no .env, igual para todos os
 *   usuarios da carga inicial. Nenhuma senha e gravada no banco.
 *
 * INCREMENTO 2 (producao):
 *   o frontend autentica direto no Firebase (signInWithEmailAndPassword),
 *   envia o idToken para POST /api/auth/firebase, o backend valida com o
 *   firebase-admin e localiza a PESSOA pelo uid_firebase. A estrutura do
 *   token de sessao emitido aqui ja e a mesma, entao nada mais muda.
 */
@Injectable()
export class AuthService {
  constructor(private db: DbService, private jwt: JwtService) {}

  async login(email: string, senha: string) {
    if (!email || !senha) throw new UnauthorizedException('Informe e-mail e senha.');
    if (senha !== (process.env.DEV_SENHA || 'Teste@2026'))
      throw new UnauthorizedException('E-mail ou senha invalidos.');

    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, ativo FROM pessoa WHERE email = $1`, [email]);
    if (!pessoas.length || !pessoas[0].ativo)
      throw new UnauthorizedException('E-mail ou senha invalidos.');
    const pessoa = pessoas[0];

    const perfis = await this.db.query(
      `SELECT id_perfil, tipo_perfil
         FROM perfil
        WHERE id_pessoa = $1 AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
        ORDER BY data_inicio DESC`, [pessoa.id_pessoa]);
    if (!perfis.length)
      throw new UnauthorizedException('Conta desativada: nenhum perfil vigente.');

    const unidades = await this.db.query(
      `SELECT b.nome AS bloco, u.numero_apartamento
         FROM pessoa_unidade pu
         JOIN unidade u ON u.id_unidade = pu.id_unidade
         JOIN bloco   b ON b.id_bloco   = u.id_bloco
        WHERE pu.id_pessoa = $1 AND pu.data_fim_ocupacao IS NULL`, [pessoa.id_pessoa]);

    const payload = {
      sub: pessoa.id_pessoa,
      nome: pessoa.nome,
      perfis: perfis.map(p => ({ id_perfil: p.id_perfil, tipo: p.tipo_perfil })),
    };
    return {
      token: await this.jwt.signAsync(payload),
      pessoa: { id_pessoa: pessoa.id_pessoa, nome: pessoa.nome, email: pessoa.email },
      perfis: payload.perfis,
      unidades,
    };
  }
}
