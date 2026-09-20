import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import * as crypto from 'crypto';

/** Numero de iteracoes atual do PBKDF2 (OWASP recomenda >= 600k para SHA-512; 100k e um balanco pratico). */
const PBKDF2_ITERACOES = 100_000;
/** Numero de iteracoes legado usado anteriormente (apenas para migracao gradual). */
const PBKDF2_ITERACOES_LEGADO = 1000;

export function hashSenha(senha: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(senha, salt, PBKDF2_ITERACOES, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compara dois hashes de forma segura contra timing attacks.
 * Garante que ambos os buffers tenham o mesmo tamanho antes de comparar.
 */
function comparacaoSegura(hashA: string, hashB: string): boolean {
  const bufA = Buffer.from(hashA, 'hex');
  const bufB = Buffer.from(hashB, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifica a senha contra o hash salvo, tentando primeiro com as iteracoes atuais
 * e depois com as legado (migracao gradual). Retorna 'atual' | 'legado' | false.
 */
export function verificarSenha(senha: string, senhaSalva: string): 'atual' | 'legado' | false {
  if (!senhaSalva || !senhaSalva.includes(':')) return false;
  const [salt, originalHash] = senhaSalva.split(':');

  // Tenta com iteracoes atuais
  const hashAtual = crypto.pbkdf2Sync(senha, salt, PBKDF2_ITERACOES, 64, 'sha512').toString('hex');
  if (comparacaoSegura(hashAtual, originalHash)) return 'atual';

  // Tenta com iteracoes legadas (migracao gradual)
  const hashLegado = crypto.pbkdf2Sync(senha, salt, PBKDF2_ITERACOES_LEGADO, 64, 'sha512').toString('hex');
  if (comparacaoSegura(hashLegado, originalHash)) return 'legado';

  return false;
}

/**
 * Valida a senha: bloqueia se for menor que 6 caracteres;
 * retorna avisos (nao bloqueantes) se faltar complexidade.
 */
export function validarForcaSenha(senha: string): { erro: string | null; avisos: string[] } {
  if (senha.length < 6) {
    return { erro: 'A senha deve conter no mínimo 6 caracteres.', avisos: [] };
  }
  const avisos: string[] = [];
  if (!/[A-Z]/.test(senha)) avisos.push('Adicione ao menos uma letra maiúscula para maior segurança.');
  if (!/[a-z]/.test(senha)) avisos.push('Adicione ao menos uma letra minúscula para maior segurança.');
  if (!/\d/.test(senha))    avisos.push('Adicione ao menos um número para maior segurança.');
  if (!/[^A-Za-z0-9]/.test(senha)) avisos.push('Adicione um caractere especial (ex: @, #, !) para maior segurança.');
  return { erro: null, avisos };
}

@Injectable()
export class AuthService {
  constructor(private db: DbService, private jwt: JwtService) {}

  async login(email: string, senha: string) {
    if (!email || !senha) throw new UnauthorizedException('Informe e-mail e senha.');

    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, senha_hash, status_conta, ativo FROM pessoa WHERE email = $1`, [email]);
    if (!pessoas.length || !pessoas[0].ativo)
      throw new UnauthorizedException('E-mail ou senha invalidos.');
    const pessoa = pessoas[0];

    if (pessoa.status_conta === 'BLOQUEADO')
      throw new UnauthorizedException('Conta bloqueada pela administracao.');

    const devSenha = process.env.DEV_SENHA || 'Teste@2026';
    const ehSenhaDev = senha === devSenha || senha === 'Teste@2026' || senha === 'senha123';

    // Se possui senha personalizada salva, valida via hash; senao ou adicionalmente, permite senha DEV padrao
    if (pessoa.senha_hash) {
      const resultado = verificarSenha(senha, pessoa.senha_hash);
      if (!resultado && !ehSenhaDev) {
        throw new UnauthorizedException('E-mail ou senha invalidos.');
      }
      // Migracao gradual ou sincronizacao via senha DEV
      if (resultado === 'legado' || (!resultado && ehSenhaDev)) {
        const novoHash = hashSenha(senha);
        await this.db.query(`UPDATE pessoa SET senha_hash = $1 WHERE id_pessoa = $2`, [novoHash, pessoa.id_pessoa]);
      }
    } else {
      if (!ehSenhaDev) {
        throw new UnauthorizedException('E-mail ou senha invalidos.');
      }
    }

    return this.gerarSessaoParaPessoa(pessoa.id_pessoa);
  }

  async validarCodigo(codigo: string, email: string) {
    if (!codigo || !email) throw new BadRequestException('Informe o codigo e o e-mail.');

    const codigos = await this.db.query(`
      SELECT c.id_codigo, c.codigo, c.status, c.data_expiracao,
             p.id_pessoa, p.nome, p.email, p.status_conta,
             u.numero_apartamento, b.nome AS bloco, pu.tipo_vinculo, pu.grau_parentesco
        FROM codigo_primeiro_acesso c
        JOIN pessoa p ON p.id_pessoa = c.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE UPPER(c.codigo) = UPPER($1) AND LOWER(p.email) = LOWER($2)`,
      [codigo.trim(), email.trim()]);

    if (!codigos.length) throw new BadRequestException('Codigo de ativacao ou e-mail incorretos.');
    const c = codigos[0];

    if (c.status !== 'DISPONIVEL') throw new BadRequestException(`Este codigo ja foi utilizado ou esta inativo (${c.status}).`);
    if (new Date(c.data_expiracao) < new Date()) throw new BadRequestException('Este codigo de ativacao expirou.');

    return {
      valido: true,
      pessoa: { id_pessoa: c.id_pessoa, nome: c.nome, email: c.email },
      unidade: c.numero_apartamento ? {
        bloco: c.bloco,
        apartamento: c.numero_apartamento,
        vinculo: c.tipo_vinculo,
        parentesco: c.grau_parentesco
      } : null,
    };
  }

  async primeiroAcesso(codigo: string, email: string, novaSenha: string) {
    if (!codigo || !email || !novaSenha) throw new BadRequestException('Todos os campos sao obrigatorios.');
    const { erro, avisos } = validarForcaSenha(novaSenha);
    if (erro) throw new BadRequestException(erro);

    const resultado = await this.db.transacao(async client => {
      const res = await client.query(`
        SELECT c.id_codigo, c.id_pessoa, c.status, c.data_expiracao, p.email
          FROM codigo_primeiro_acesso c
          JOIN pessoa p ON p.id_pessoa = c.id_pessoa
         WHERE UPPER(c.codigo) = UPPER($1) AND LOWER(p.email) = LOWER($2)
         FOR UPDATE`, [codigo.trim(), email.trim()]);

      if (!res.rows.length) throw new BadRequestException('Codigo ou e-mail invalidos.');
      const c = res.rows[0];

      if (c.status !== 'DISPONIVEL') throw new BadRequestException('Este codigo ja foi utilizado ou cancelado.');
      if (new Date(c.data_expiracao) < new Date()) throw new BadRequestException('Este codigo expirou.');

      const hash = hashSenha(novaSenha);

      await client.query(
        `UPDATE pessoa SET senha_hash = $1, status_conta = 'ATIVO' WHERE id_pessoa = $2`,
        [hash, c.id_pessoa]);

      try {
        await client.query(
          `UPDATE codigo_primeiro_acesso SET status = 'USADO', data_utilizacao = CURRENT_TIMESTAMP, usado_em = CURRENT_TIMESTAMP WHERE id_codigo = $1`,
          [c.id_codigo]);
      } catch {
        await client.query(
          `UPDATE codigo_primeiro_acesso SET status = 'USADO', data_utilizacao = CURRENT_TIMESTAMP WHERE id_codigo = $1`,
          [c.id_codigo]);
      }

      return this.gerarSessaoParaPessoa(c.id_pessoa);
    });

    // Retorna avisos de senha fraca (nao bloqueantes) junto com a sessao
    if (avisos.length > 0) {
      return { ...resultado, aviso_senha: 'Sua senha e considerada fraca. ' + avisos.join(' ') };
    }
    return resultado;
  }

  async gerarSessaoParaPessoa(idPessoa: number) {
    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, ativo FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoas.length) throw new UnauthorizedException('Usuario nao encontrado.');
    const pessoa = pessoas[0];

    const perfis = await this.db.query(
      `SELECT id_perfil, tipo_perfil
         FROM perfil
        WHERE id_pessoa = $1 AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
        ORDER BY data_inicio DESC`, [pessoa.id_pessoa]);

    const unidades = await this.db.query(
      `SELECT b.nome AS bloco, u.numero_apartamento, pu.tipo_vinculo, pu.grau_parentesco
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
