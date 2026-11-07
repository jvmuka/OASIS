import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DbService } from '../db/db.service';
import { EmailService, ofuscarEmail } from '../email/email.service';
import * as crypto from 'crypto';

/** Numero de iteracoes atual do PBKDF2 (OWASP recomenda >= 600k para SHA-512; 100k e um balanco pratico). */
const PBKDF2_ITERACOES = 100_000;
/** Numero de iteracoes legado usado anteriormente (apenas para migracao gradual). */
const PBKDF2_ITERACOES_LEGADO = 1000;

/**
 * Normaliza o identificador recebido (pode ser e-mail ou CPF, com ou sem pontuação).
 * Se contiver 11 dígitos numéricos, extrai o CPF desformatado.
 */
export function normalizarIdentificador(identificador: string): { email: string; cpf: string | null } {
  const limpo = (identificador || '').trim();
  const apenasDigitos = limpo.replace(/\D/g, '');
  const cpf = apenasDigitos.length === 11 ? apenasDigitos : null;
  return {
    email: limpo.toLowerCase(),
    cpf,
  };
}

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

function gerarCodigoRecuperacao(): string {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return 'REC-' + Array.from(bytes).map(b => CHARSET[b % CHARSET.length]).join('');
}

@Injectable()
export class AuthService {
  constructor(
    private db: DbService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  async login(identificador: string, senha: string) {
    if (!identificador || !senha) throw new UnauthorizedException('Informe seu e-mail ou CPF e a senha.');

    const { email, cpf } = normalizarIdentificador(identificador);

    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, cpf, senha_hash, status_conta, ativo 
         FROM pessoa 
        WHERE (LOWER(email) = LOWER($1) OR ($2::text IS NOT NULL AND cpf = $2))`,
      [email, cpf],
    );
    if (!pessoas.length || !pessoas[0].ativo)
      throw new UnauthorizedException('E-mail/CPF ou senha inválidos.');
    const pessoa = pessoas[0];

    if (pessoa.status_conta === 'BLOQUEADO')
      throw new UnauthorizedException('Conta bloqueada pela administração.');

    const devSenha = process.env.DEV_SENHA;
    const isProd = process.env.NODE_ENV === 'production';
    const ehSenhaDev = !isProd && Boolean(devSenha) && senha === devSenha;

    // Se possui senha personalizada salva, valida via hash; senão ou adicionalmente, permite senha DEV padrão
    if (pessoa.senha_hash) {
      const resultado = verificarSenha(senha, pessoa.senha_hash);
      if (!resultado && !ehSenhaDev) {
        throw new UnauthorizedException('E-mail/CPF ou senha inválidos.');
      }
      // Migração gradual ou sincronização via senha DEV
      if (resultado === 'legado' || (!resultado && ehSenhaDev)) {
        const novoHash = hashSenha(senha);
        await this.db.query(`UPDATE pessoa SET senha_hash = $1 WHERE id_pessoa = $2`, [novoHash, pessoa.id_pessoa]);
      }
    } else {
      if (!ehSenhaDev) {
        throw new UnauthorizedException('E-mail/CPF ou senha inválidos.');
      }
    }

    return this.gerarSessaoParaPessoa(pessoa.id_pessoa);
  }

  async validarCodigo(codigo: string, identificador: string) {
    if (!codigo || !identificador) throw new BadRequestException('Informe o código de ativação e o e-mail ou CPF.');

    const { email, cpf } = normalizarIdentificador(identificador);

    const codigos = await this.db.query(`
      SELECT c.id_codigo, c.codigo, c.status, c.data_expiracao,
             p.id_pessoa, p.nome, p.email, p.cpf, p.status_conta,
             u.numero_apartamento, b.nome AS bloco, pu.tipo_vinculo, pu.grau_parentesco
        FROM codigo_primeiro_acesso c
        JOIN pessoa p ON p.id_pessoa = c.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE UPPER(c.codigo) = UPPER($1) 
         AND (LOWER(p.email) = LOWER($2) OR ($3::text IS NOT NULL AND p.cpf = $3))`,
      [codigo.trim(), email, cpf]);

    if (!codigos.length) throw new BadRequestException('Código de ativação ou E-mail/CPF incorretos.');
    const c = codigos[0];

    if (c.status !== 'DISPONIVEL') throw new BadRequestException(`Este código já foi utilizado ou está inativo (${c.status}).`);
    if (new Date(c.data_expiracao) < new Date()) throw new BadRequestException('Este código de ativação expirou.');

    return {
      valido: true,
      pessoa: { id_pessoa: c.id_pessoa, nome: c.nome, email: c.email, cpf: c.cpf },
      email_ofuscado: ofuscarEmail(c.email),
      unidade: c.numero_apartamento ? {
        bloco: c.bloco,
        apartamento: c.numero_apartamento,
        vinculo: c.tipo_vinculo,
        parentesco: c.grau_parentesco
      } : null,
    };
  }

  async primeiroAcesso(codigo: string, identificador: string, novaSenha: string) {
    if (!codigo || !identificador || !novaSenha) throw new BadRequestException('Todos os campos são obrigatórios.');
    const { erro, avisos } = validarForcaSenha(novaSenha);
    if (erro) throw new BadRequestException(erro);

    const { email, cpf } = normalizarIdentificador(identificador);

    const resultado = await this.db.transacao(async client => {
      const res = await client.query(`
        SELECT c.id_codigo, c.id_pessoa, c.status, c.data_expiracao, p.email, p.nome
          FROM codigo_primeiro_acesso c
          JOIN pessoa p ON p.id_pessoa = c.id_pessoa
         WHERE UPPER(c.codigo) = UPPER($1) 
           AND (LOWER(p.email) = LOWER($2) OR ($3::text IS NOT NULL AND p.cpf = $3))
         FOR UPDATE`, [codigo.trim(), email, cpf]);

      if (!res.rows.length) throw new BadRequestException('Código ou E-mail/CPF inválidos.');
      const c = res.rows[0];

      if (c.status !== 'DISPONIVEL') throw new BadRequestException('Este código já foi utilizado ou cancelado.');
      if (new Date(c.data_expiracao) < new Date()) throw new BadRequestException('Este código expirou.');

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

      // Dispara e-mail de confirmação / boas-vindas com conta ativada em segundo plano
      if (c.email) {
        this.emailService.enviarBoasVindasContaAtivada({ para: c.email, nome: c.nome }).catch(() => {});
      }

      return this.gerarSessaoParaPessoa(c.id_pessoa);
    });

    // Retorna avisos de senha fraca (não bloqueantes) junto com a sessão
    if (avisos.length > 0) {
      return { ...resultado, aviso_senha: 'Sua senha é considerada fraca. ' + avisos.join(' ') };
    }
    return resultado;
  }

  async solicitarRecuperacaoSenha(identificador: string) {
    if (!identificador || !identificador.trim()) {
      throw new BadRequestException('Informe o seu e-mail ou CPF cadastrado.');
    }

    const { email, cpf } = normalizarIdentificador(identificador);
    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, cpf, status_conta, ativo 
         FROM pessoa 
        WHERE (LOWER(email) = LOWER($1) OR ($2::text IS NOT NULL AND cpf = $2))`,
      [email, cpf],
    );

    if (!pessoas.length || !pessoas[0].ativo) {
      // Retorno padrão para evitar enumeração de usuários, mas claro
      return {
        ok: true,
        mensagem: 'Se os dados informados estiverem cadastrados, você receberá o código de recuperação no seu e-mail.',
      };
    }

    const pessoa = pessoas[0];
    if (pessoa.status_conta === 'BLOQUEADO') {
      throw new BadRequestException('Esta conta está bloqueada pela administração.');
    }

    // Invalida eventuais códigos de recuperação anteriores ainda disponíveis
    await this.db.query(
      `UPDATE codigo_primeiro_acesso
          SET status = 'CANCELADO'
        WHERE id_pessoa = $1
          AND status = 'DISPONIVEL'
          AND tipo = 'RECUPERACAO'`,
      [pessoa.id_pessoa]
    );

    const codigo = gerarCodigoRecuperacao();

    // Validade de 2 horas para recuperação
    await this.db.query(
      `INSERT INTO codigo_primeiro_acesso (codigo, id_pessoa, status, tipo, data_expiracao)
       VALUES ($1, $2, 'DISPONIVEL', 'RECUPERACAO', CURRENT_TIMESTAMP + INTERVAL '2 hours')`,
      [codigo, pessoa.id_pessoa]
    );

    // Dispara o e-mail de recuperação
    if (pessoa.email) {
      await this.emailService.enviarCodigoRecuperacaoSenha({
        para: pessoa.email,
        nome: pessoa.nome,
        codigo,
      });
    }

    const emailOfuscado = ofuscarEmail(pessoa.email);

    return {
      ok: true,
      mensagem: emailOfuscado
        ? `Código de recuperação enviado para o e-mail ${emailOfuscado}.`
        : 'Código de recuperação gerado com sucesso. Verifique seu e-mail.',
      email_ofuscado: emailOfuscado,
      ...((process.env.NODE_ENV !== 'production' && Boolean(process.env.DEV_SENHA)) ? { codigo_dev: codigo } : {}),
    };
  }

  async redefinirSenhaComCodigo(codigo: string, identificador: string, novaSenha: string) {
    if (!codigo || !identificador || !novaSenha) {
      throw new BadRequestException('Todos os campos são obrigatórios.');
    }
    const { erro, avisos } = validarForcaSenha(novaSenha);
    if (erro) throw new BadRequestException(erro);

    const { email, cpf } = normalizarIdentificador(identificador);

    const resultado = await this.db.transacao(async client => {
      const res = await client.query(`
        SELECT c.id_codigo, c.id_pessoa, c.status, c.data_expiracao, p.email, p.nome
          FROM codigo_primeiro_acesso c
          JOIN pessoa p ON p.id_pessoa = c.id_pessoa
         WHERE UPPER(c.codigo) = UPPER($1) 
           AND (LOWER(p.email) = LOWER($2) OR ($3::text IS NOT NULL AND p.cpf = $3))
         FOR UPDATE`, [codigo.trim(), email, cpf]);

      if (!res.rows.length) {
        throw new BadRequestException('Código de recuperação ou E-mail/CPF inválidos.');
      }
      const c = res.rows[0];

      if (c.status !== 'DISPONIVEL') {
        throw new BadRequestException('Este código já foi utilizado ou cancelado.');
      }
      if (new Date(c.data_expiracao) < new Date()) {
        throw new BadRequestException('Este código de recuperação expirou.');
      }

      const hash = hashSenha(novaSenha);

      await client.query(
        `UPDATE pessoa SET senha_hash = $1, status_conta = 'ATIVO' WHERE id_pessoa = $2`,
        [hash, c.id_pessoa]
      );

      try {
        await client.query(
          `UPDATE codigo_primeiro_acesso
              SET status = 'USADO',
                  data_utilizacao = CURRENT_TIMESTAMP,
                  usado_em = CURRENT_TIMESTAMP
            WHERE id_codigo = $1`,
          [c.id_codigo]
        );
      } catch {
        await client.query(
          `UPDATE codigo_primeiro_acesso
              SET status = 'USADO',
                  data_utilizacao = CURRENT_TIMESTAMP
            WHERE id_codigo = $1`,
          [c.id_codigo]
        );
      }

      // Dispara e-mail de confirmação de senha alterada em segundo plano
      if (c.email) {
        this.emailService.enviarConfirmacaoSenhaAlterada({ para: c.email, nome: c.nome }).catch(() => {});
      }

      return this.gerarSessaoParaPessoa(c.id_pessoa);
    });

    if (avisos.length > 0) {
      return { ...resultado, aviso_senha: 'Sua senha é considerada fraca. ' + avisos.join(' ') };
    }
    return resultado;
  }

  async usuarioPossuiVinculoCondominio(idPessoa: number, idCondominio: number): Promise<boolean> {
    const vinculos = await this.db.query(`
      SELECT 1 FROM pessoa_unidade pu
        JOIN unidade u ON u.id_unidade = pu.id_unidade
        JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE pu.id_pessoa = $1 AND b.id_condominio = $2 AND pu.data_fim_ocupacao IS NULL
       UNION
      SELECT 1 FROM perfil pf
       WHERE pf.id_pessoa = $1 AND pf.id_condominio = $2 AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)
    `, [idPessoa, idCondominio]);
    return vinculos.length > 0;
  }

  async gerarSessaoParaPessoa(idPessoa: number, idCondominioForcado?: number) {
    const pessoas = await this.db.query(
      `SELECT id_pessoa, nome, email, ativo FROM pessoa WHERE id_pessoa = $1`, [idPessoa]);
    if (!pessoas.length) throw new UnauthorizedException('Usuario nao encontrado.');
    const pessoa = pessoas[0];

    const perfis = await this.db.query(
      `SELECT id_perfil, tipo_perfil, id_condominio
         FROM perfil
        WHERE id_pessoa = $1 AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
        ORDER BY data_inicio DESC`, [pessoa.id_pessoa]);

    const ehSuperadmin = perfis.some(p => p.tipo_perfil === 'SUPERADMIN');

    const unidades = await this.db.query(
      `SELECT b.nome AS bloco, b.id_condominio, u.numero_apartamento, pu.tipo_vinculo, pu.grau_parentesco
         FROM pessoa_unidade pu
         JOIN unidade u ON u.id_unidade = pu.id_unidade
         JOIN bloco   b ON b.id_bloco   = u.id_bloco
        WHERE pu.id_pessoa = $1 AND pu.data_fim_ocupacao IS NULL`, [pessoa.id_pessoa]);

    let idCondominioAtivo = idCondominioForcado;
    if (!idCondominioAtivo) {
      if (unidades.length > 0 && unidades[0].id_condominio) {
        idCondominioAtivo = unidades[0].id_condominio;
      } else {
        const perfilComCondo = perfis.find(p => p.id_condominio);
        if (perfilComCondo) {
          idCondominioAtivo = perfilComCondo.id_condominio;
        } else {
          idCondominioAtivo = 1;
        }
      }
    }

    const condominios = await this.db.query(
      `SELECT id_condominio, nome, slug, cidade, uf, logo_url, ativo FROM condominio WHERE id_condominio = $1`,
      [idCondominioAtivo]
    );

    const condominioAtivo = condominios.length ? condominios[0] : {
      id_condominio: 1,
      nome: 'Condomínio Residencial OASIS',
      slug: 'oasis-central',
      cidade: 'Ponta Grossa',
      uf: 'PR',
      ativo: true,
    };

    let condominiosDisponiveis = [condominioAtivo];
    if (ehSuperadmin) {
      condominiosDisponiveis = await this.db.query(
        `SELECT id_condominio, nome, slug, cidade, uf, ativo FROM condominio ORDER BY id_condominio ASC`
      );
    }

    const payload = {
      sub: pessoa.id_pessoa,
      nome: pessoa.nome,
      id_condominio: condominioAtivo.id_condominio,
      slug_condominio: condominioAtivo.slug,
      perfis: perfis.map(p => ({ id_perfil: p.id_perfil, tipo: p.tipo_perfil, id_condominio: p.id_condominio })),
    };

    const modulosQuery = await this.db.query(
      `SELECT codigo_modulo FROM condominio_modulo WHERE id_condominio = $1 AND ativo = TRUE`,
      [condominioAtivo.id_condominio]
    );
    const modulosAtivos = modulosQuery.map(m => m.codigo_modulo);

    return {
      token: await this.jwt.signAsync(payload),
      pessoa: { id_pessoa: pessoa.id_pessoa, nome: pessoa.nome, email: pessoa.email },
      condominio: condominioAtivo,
      condominiosDisponiveis,
      modulosAtivos,
      perfis: payload.perfis,
      unidades: unidades.filter(u => u.id_condominio === condominioAtivo.id_condominio),
    };
  }

  async obterModulosCondominio(idCondominio: number) {
    const modulos = await this.db.query(
      `SELECT m.codigo, m.nome, m.descricao, m.categoria, m.icone, m.ordem_exibicao,
              COALESCE(cm.ativo, TRUE) AS ativo
         FROM modulo_sistema m
         LEFT JOIN condominio_modulo cm ON cm.codigo_modulo = m.codigo AND cm.id_condominio = $1
        ORDER BY m.ordem_exibicao ASC`,
      [idCondominio]
    );
    return {
      modulosAtivos: modulos.filter(m => m.ativo).map(m => m.codigo),
      todos: modulos,
    };
  }
}
