import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Module, UseGuards, ParseIntPipe, BadRequestException, Req } from '@nestjs/common';
import * as crypto from 'crypto';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';

/** Gera um codigo de ativacao criptograficamente seguro (8 caracteres alfanumericos maiusculos). */
function gerarCodigoAtivacao(): string {
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 para evitar ambiguidade
  const bytes = crypto.randomBytes(8);
  return 'OASIS-' + Array.from(bytes).map(b => CHARSET[b % CHARSET.length]).join('');
}

/**
 * UC11 - Cadastrar / Editar Pessoa e Unidade, Gestão de Dependentes e Primeiro Acesso.
 */
@Controller('cadastros')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class CadastrosController {
  constructor(private db: DbService) {}

  // ------------------------- blocos e unidades -------------------------
  @Get('blocos')
  blocos() {
    return this.db.query(`SELECT * FROM bloco ORDER BY nome`);
  }

  @Post('blocos') @Perfis('SINDICO')
  criarBloco(@Body() b: { nome: string; descricao?: string }) {
    return this.db.query(
      `INSERT INTO bloco (nome, descricao) VALUES ($1,$2) RETURNING *`,
      [b.nome, b.descricao || null]).then(r => r[0]);
  }

  @Get('unidades')
  unidades() {
    return this.db.query(`
      SELECT u.id_unidade, b.nome AS bloco, u.numero_apartamento, u.numero_vagas,
             (SELECT COUNT(*) FROM pessoa_unidade pu WHERE pu.id_unidade = u.id_unidade AND pu.data_fim_ocupacao IS NULL AND pu.reside = TRUE) AS total_moradores,
             (SELECT p.nome FROM pessoa_unidade pu JOIN pessoa p ON p.id_pessoa = pu.id_pessoa WHERE pu.id_unidade = u.id_unidade AND pu.tipo_vinculo = 'PROPRIETARIO' AND pu.data_fim_ocupacao IS NULL LIMIT 1) AS proprietario,
             (SELECT p.nome FROM pessoa_unidade pu JOIN pessoa p ON p.id_pessoa = pu.id_pessoa WHERE pu.id_unidade = u.id_unidade AND pu.tipo_vinculo = 'INQUILINO' AND pu.data_fim_ocupacao IS NULL LIMIT 1) AS inquilino
        FROM unidade u JOIN bloco b ON b.id_bloco = u.id_bloco
       ORDER BY b.nome, (CASE WHEN u.numero_apartamento ~ '^[0-9]+$' THEN u.numero_apartamento::INTEGER ELSE 999999 END), u.numero_apartamento`);
  }

  @Get('unidades/:id/ocupantes')
  async ocupantesUnidade(@Param('id', ParseIntPipe) idUnidade: number) {
    const unidade = await this.db.query(
      `SELECT u.id_unidade, b.nome AS bloco, u.numero_apartamento, u.numero_vagas
         FROM unidade u JOIN bloco b ON b.id_bloco = u.id_bloco
        WHERE u.id_unidade = $1`, [idUnidade]);
    if (!unidade.length) throw new BadRequestException('Unidade não encontrada.');

    const pessoas = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             pu.id_pessoa_unidade, pu.tipo_vinculo, pu.grau_parentesco, pu.reside,
             pu.status_aprovacao, pu.data_inicio_ocupacao, pu.id_responsavel,
             resp.nome AS nome_responsavel
        FROM pessoa_unidade pu
        JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
        LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
       WHERE pu.id_unidade = $1 AND pu.data_fim_ocupacao IS NULL
       ORDER BY (CASE pu.tipo_vinculo WHEN 'PROPRIETARIO' THEN 1 WHEN 'INQUILINO' THEN 2 ELSE 3 END), p.nome`, [idUnidade]);

    return {
      unidade: unidade[0],
      ocupantes: pessoas,
    };
  }

  @Post('unidades') @Perfis('SINDICO')
  criarUnidade(@Body() u: { id_bloco: number; numero_apartamento: string; numero_vagas?: number }) {
    return this.db.query(
      `INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas)
       VALUES ($1,$2,$3) RETURNING *`,
      [u.id_bloco, u.numero_apartamento, u.numero_vagas ?? 0]).then(r => r[0]);
  }

  // ------------------------- pessoas e pesquisa abrangente -------------------------
  // ------------------------- pessoas e pesquisa abrangente -------------------------
  @Get('pessoas')
  async pessoas(
    @Query('busca') busca?: string,
    @Query('nome') nome?: string,
    @Query('cpf') cpf?: string,
    @Query('apartamento') apartamento?: string,
    @Query('papel') papel?: string,
    @Query('funcao') funcao?: string,
    @Query('status') status?: string,
  ) {
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      const s = status.trim().toUpperCase();
      if (s === 'ATIVOS') {
        conditions.push(`p.ativo = TRUE`);
      } else if (s === 'INATIVOS') {
        conditions.push(`p.ativo = FALSE`);
      }
    }

    if (busca && busca.trim()) {
      params.push(`%${busca.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(p.nome) LIKE $${idx}
        OR p.cpf LIKE $${idx}
        OR LOWER(p.email) LIKE $${idx}
        OR u.numero_apartamento LIKE $${idx}
        OR LOWER(b.nome) LIKE $${idx}
        OR LOWER(CONCAT(b.nome, ' ', u.numero_apartamento)) LIKE $${idx}
      )`);
    }

    if (nome && nome.trim()) {
      params.push(`%${nome.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(LOWER(p.nome) LIKE $${idx} OR LOWER(p.email) LIKE $${idx})`);
    }

    if (cpf && cpf.trim()) {
      const cpfLimpo = cpf.replace(/\D/g, '');
      params.push(`%${cpfLimpo || cpf.trim()}%`);
      const idx = params.length;
      conditions.push(`REPLACE(REPLACE(p.cpf, '.', ''), '-', '') LIKE $${idx}`);
    }

    if (apartamento && apartamento.trim()) {
      params.push(`%${apartamento.trim().toLowerCase()}%`);
      const idx = params.length;
      conditions.push(`(
        LOWER(u.numero_apartamento) LIKE $${idx}
        OR LOWER(b.nome) LIKE $${idx}
        OR LOWER(CONCAT(b.nome, ' ', u.numero_apartamento)) LIKE $${idx}
      )`);
    }

    const papelFiltro = (papel || funcao || '').trim().toUpperCase();
    if (papelFiltro && papelFiltro !== 'TODAS') {
      if (['PROPRIETARIO', 'INQUILINO', 'DEPENDENTE'].includes(papelFiltro)) {
        params.push(papelFiltro);
        const idx = params.length;
        conditions.push(`pu.tipo_vinculo = $${idx}`);
      } else if (papelFiltro === 'VISITANTE') {
        params.push(papelFiltro);
        const idx = params.length;
        conditions.push(`(p.papel_controle = $${idx} OR pu.tipo_vinculo = $${idx})`);
      } else if (papelFiltro === 'PRESTADOR_SERVICO') {
        params.push(papelFiltro);
        const idx = params.length;
        conditions.push(`(p.papel_controle = $${idx} OR pu.tipo_vinculo = $${idx})`);
      } else if (['MORADOR', 'PORTEIRO'].includes(papelFiltro)) {
        params.push(papelFiltro);
        const idx = params.length;
        conditions.push(`pf.tipo_perfil = $${idx}`);
      } else if (['ADMINISTRADOR', 'SINDICO'].includes(papelFiltro)) {
        conditions.push(`(pf.tipo_perfil = 'SINDICO')`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const pessoas = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             p.status_conta, p.ativo, p.papel_controle, p.tipo_servico,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'tipo', pf.tipo_perfil, 'id_perfil', pf.id_perfil))
               FILTER (WHERE pf.id_perfil IS NOT NULL), '[]') AS perfis,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'id_unidade', u.id_unidade, 'bloco', b.nome, 'apartamento', u.numero_apartamento,
               'vinculo', pu.tipo_vinculo, 'parentesco', pu.grau_parentesco,
               'id_responsavel', pu.id_responsavel, 'status_aprovacao', pu.status_aprovacao,
               'reside', pu.reside))
               FILTER (WHERE pu.id_pessoa_unidade IS NOT NULL AND pu.data_fim_ocupacao IS NULL), '[]') AS unidades,
             (SELECT c.codigo FROM codigo_primeiro_acesso c
               WHERE c.id_pessoa = p.id_pessoa AND c.status = 'DISPONIVEL'
                 AND c.data_expiracao > CURRENT_TIMESTAMP
               ORDER BY c.id_codigo DESC LIMIT 1) AS codigo_ativacao,
             -- Informações do responsável direto (caso este usuário seja dependente)
             (SELECT jsonb_build_object('id_pessoa', resp.id_pessoa, 'nome', resp.nome, 'email', resp.email)
                FROM pessoa_unidade pu_dep
                JOIN pessoa resp ON resp.id_pessoa = pu_dep.id_responsavel
               WHERE pu_dep.id_pessoa = p.id_pessoa AND pu_dep.data_fim_ocupacao IS NULL LIMIT 1) AS responsavel,
             -- Lista de dependentes vinculados a esta pessoa
             (SELECT COALESCE(json_agg(jsonb_build_object(
                'id_pessoa', p_filho.id_pessoa,
                'nome', p_filho.nome,
                'email', p_filho.email,
                'cpf', p_filho.cpf,
                'data_nascimento', p_filho.data_nascimento,
                'grau_parentesco', pu_filho.grau_parentesco,
                'status_aprovacao', pu_filho.status_aprovacao,
                'ativo', p_filho.ativo
              )), '[]')
                FROM pessoa_unidade pu_filho
                JOIN pessoa p_filho ON p_filho.id_pessoa = pu_filho.id_pessoa
               WHERE pu_filho.id_responsavel = p.id_pessoa AND pu_filho.data_fim_ocupacao IS NULL) AS dependentes,
             -- Total de penalidades ativas para a pessoa
             (SELECT COUNT(*)::INTEGER FROM bloqueio_perfil bp
                JOIN perfil pf_b ON pf_b.id_perfil = bp.id_perfil
               WHERE pf_b.id_pessoa = p.id_pessoa
                 AND bp.data_hora_inicio <= CURRENT_TIMESTAMP
                 AND (bp.data_hora_fim IS NULL OR bp.data_hora_fim >= CURRENT_TIMESTAMP)) AS total_bloqueios_ativos
        FROM pessoa p
        LEFT JOIN perfil pf ON pf.id_pessoa = p.id_pessoa
             AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco   b ON b.id_bloco   = u.id_bloco
       ${whereClause}
       GROUP BY p.id_pessoa
       ORDER BY p.nome`, params);

    return pessoas;
  }

  @Get('pessoas/:id/detalhes')
  async detalhesPessoa(@Param('id', ParseIntPipe) id: number) {
    const lista = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             p.status_conta, p.ativo, p.papel_controle, p.tipo_servico,
             pu.id_pessoa_unidade, pu.id_unidade, u.numero_apartamento, b.nome AS bloco,
             pu.tipo_vinculo, pu.grau_parentesco, pu.reside, pu.status_aprovacao,
             pu.id_responsavel, resp.nome AS nome_responsavel, resp.email AS email_responsavel, resp.celular AS celular_responsavel,
             COALESCE((
               SELECT json_agg(jsonb_build_object('tipo', pf.tipo_perfil, 'id_perfil', pf.id_perfil))
                 FROM perfil pf
                WHERE pf.id_pessoa = p.id_pessoa
                  AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)
             ), '[]') AS perfis
        FROM pessoa p
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco   b ON b.id_bloco   = u.id_bloco
        LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
       WHERE p.id_pessoa = $1`, [id]);

    if (!lista.length) throw new BadRequestException('Pessoa não encontrada.');
    const base = lista[0];

    // Dependentes vinculados a esta pessoa
    const dependentes = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             pu.grau_parentesco, pu.status_aprovacao, p.ativo,
             (SELECT c.codigo FROM codigo_primeiro_acesso c
               WHERE c.id_pessoa = p.id_pessoa AND c.status = 'DISPONIVEL'
               ORDER BY c.id_codigo DESC LIMIT 1) AS codigo_ativacao
        FROM pessoa_unidade pu
        JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
       WHERE pu.id_responsavel = $1 AND pu.data_fim_ocupacao IS NULL
       ORDER BY p.nome`, [id]);

    return {
      ...base,
      dependentes,
    };
  }

  /**
   * Cadastro de pessoas (Síndico e Porteiro) com suporte a Moradores, Funcionários,
   * Visitantes e Prestadores de Serviço (sem login, apenas controle).
   */
  @Post('pessoas') @Perfis('SINDICO', 'PORTEIRO')
  async criarPessoa(
    @Req() req: any,
    @Body() b: {
      nome: string; email?: string; cpf: string; data_nascimento: string; celular?: string;
      id_unidade?: number; tipo_vinculo?: string; tipo_perfil?: string; perfis?: string[];
      id_responsavel?: number; grau_parentesco?: string; reside?: boolean;
      tipo_servico?: string;
    }
  ) {
    const tiposUsuario = (req.user?.perfis || []).map((pf: any) => pf.tipo);
    const ehSindico = tiposUsuario.includes('SINDICO') || tiposUsuario.includes('ADMINISTRADOR');
    const idPerfilGerador = ehSindico
      ? perfilDoUsuario(req.user, 'SINDICO')
      : perfilDoUsuario(req.user, 'PORTEIRO');

    return this.db.transacao(async c => {
      // Identifica papéis solicitados
      let rawPerfis: string[] = [];
      if (Array.isArray(b.perfis) && b.perfis.length > 0) {
        rawPerfis = b.perfis.map(pf => (pf === 'ADMINISTRADOR' ? 'SINDICO' : pf.trim().toUpperCase()));
      } else if (b.tipo_perfil) {
        if (b.tipo_perfil === 'SINDICO_MORADOR') {
          rawPerfis = ['SINDICO', 'MORADOR'];
        } else if (b.tipo_perfil === 'SINDICO' || b.tipo_perfil === 'ADMINISTRADOR') {
          rawPerfis = ['SINDICO'];
        } else if (b.tipo_perfil === 'PORTEIRO') {
          rawPerfis = ['PORTEIRO'];
        } else if (b.tipo_perfil === 'MORADOR') {
          rawPerfis = ['MORADOR'];
        } else if (b.tipo_perfil === 'VISITANTE') {
          rawPerfis = ['VISITANTE'];
        } else if (b.tipo_perfil === 'PRESTADOR_SERVICO') {
          rawPerfis = ['PRESTADOR_SERVICO'];
        }
      }
      if (rawPerfis.length === 0) {
        rawPerfis = ['MORADOR'];
      }

      // Restrição de segurança: Porteiro só pode cadastrar Visitante ou Prestador de Serviço
      if (!ehSindico) {
        const perfisNaoPermitidos = rawPerfis.filter(p => !['VISITANTE', 'PRESTADOR_SERVICO'].includes(p));
        if (perfisNaoPermitidos.length > 0) {
          throw new BadRequestException('Porteiros têm permissão para cadastrar apenas Visitantes e Prestadores de Serviço.');
        }
      }

      // Validação de exclusividade: Visitante e Prestador de Serviço não podem ser combinados com nenhum outro papel
      if (rawPerfis.includes('VISITANTE') && rawPerfis.length > 1) {
        throw new BadRequestException('O papel de Visitante é exclusivo e não pode ser combinado com nenhum outro papel.');
      }
      if (rawPerfis.includes('PRESTADOR_SERVICO') && rawPerfis.length > 1) {
        throw new BadRequestException('O papel de Prestador de Serviço é exclusivo e não pode ser combinado com nenhum outro papel.');
      }

      // Validação obrigatória de Morador: exige unidade vinculada
      if (rawPerfis.includes('MORADOR') && (!b.id_unidade || Number(b.id_unidade) <= 0)) {
        throw new BadRequestException('Para o papel de Morador, é obrigatório selecionar uma unidade vinculada (bloco e apartamento).');
      }

      const perfisInternos = rawPerfis.filter(p => ['MORADOR', 'PORTEIRO', 'SINDICO'].includes(p));
      const perfisExternos = rawPerfis.filter(p => ['VISITANTE', 'PRESTADOR_SERVICO'].includes(p));
      const ehApenasExterno = perfisExternos.length > 0 && perfisInternos.length === 0;

      // 1. Validação de unicidade estrita de proprietário e inquilino por apartamento
      if (b.id_unidade && (b.tipo_vinculo === 'PROPRIETARIO' || b.tipo_vinculo === 'INQUILINO')) {
        const existente = await c.query(
          `SELECT pu.id_pessoa, p.nome, pu.tipo_vinculo
             FROM pessoa_unidade pu
             JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
            WHERE pu.id_unidade = $1
              AND pu.tipo_vinculo = $2
              AND pu.data_fim_ocupacao IS NULL`,
          [b.id_unidade, b.tipo_vinculo]);

        if (existente.rows.length > 0) {
          const papel = b.tipo_vinculo === 'PROPRIETARIO' ? 'proprietário' : 'inquilino';
          throw new BadRequestException(
            `Erro de cadastro: O apartamento selecionado já possui um ${papel} ativo cadastrado (${existente.rows[0].nome}).`
          );
        }
      }

      // 2. Validação do CPF
      const cpfLimpo = (b.cpf || '').replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new BadRequestException('Erro de cadastro: O CPF deve conter exatamente 11 dígitos numéricos.');
      }

      // E-mail: obrigatório para contas de sistema, opcional para visitantes/prestadores
      let emailEfetivo = (b.email || '').trim().toLowerCase();
      if (!emailEfetivo) {
        if (ehApenasExterno) {
          emailEfetivo = `${perfisExternos[0].toLowerCase()}_${cpfLimpo}@oasis.local`;
        } else {
          throw new BadRequestException('O e-mail é obrigatório para cadastros com acesso ao sistema.');
        }
      }

      // Validação amigável de duplicidade antes da inserção
      const pessoaDuplicada = await c.query(
        `SELECT id_pessoa, nome, cpf, email, ativo FROM pessoa WHERE cpf = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
        [cpfLimpo, emailEfetivo]
      );
      if (pessoaDuplicada.rows.length > 0) {
        const dup = pessoaDuplicada.rows[0];
        if (dup.cpf === cpfLimpo) {
          throw new BadRequestException(
            `Erro de cadastro: O CPF informado (${b.cpf}) já está cadastrado no sistema para "${dup.nome}". Cada pessoa deve possuir um CPF próprio e exclusivo.`
          );
        }
        if (dup.email?.toLowerCase() === emailEfetivo) {
          throw new BadRequestException(
            `Erro de cadastro: O e-mail (${emailEfetivo}) já está cadastrado para "${dup.nome}". Cada usuário deve possuir um e-mail individual.`
          );
        }
      }

      const papelControle = ehApenasExterno ? perfisExternos[0] : (perfisInternos[0] || 'MORADOR');
      const statusConta = ehApenasExterno ? 'ATIVO' : 'AGUARDANDO_PRIMEIRO_ACESSO';

      const p = (await c.query(
        `INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular, status_conta, papel_controle, tipo_servico)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id_pessoa, nome, email, cpf, papel_controle, tipo_servico`,
        ['dev_' + cpfLimpo, b.nome, emailEfetivo, cpfLimpo, b.data_nascimento, b.celular || null, statusConta, papelControle, b.tipo_servico || null])).rows[0];

      // 3. Vínculo com a unidade
      if (b.id_unidade) {
        let vinculo = b.tipo_vinculo || 'INQUILINO';
        let reside = b.reside !== undefined ? Boolean(b.reside) : true;
        if (ehApenasExterno) {
          vinculo = perfisExternos[0];
          reside = false;
        }
        const idResp = vinculo === 'DEPENDENTE' ? (b.id_responsavel || null) : null;
        const parentesco = vinculo === 'DEPENDENTE' ? (b.grau_parentesco || 'OUTRO') : null;

        await c.query(
          `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao, reside)
           VALUES ($1,$2,$3,$4,$5,'APROVADO',$6)`,
          [p.id_pessoa, b.id_unidade, vinculo, idResp, parentesco, reside]);
      }

      // 4. Perfil de acesso (apenas para perfis internos que utilizam o sistema)
      let perfil: any = null;
      let codigoGerado: string | null = null;

      if (!ehApenasExterno && perfisInternos.length > 0) {
        for (const tp of perfisInternos) {
          const row = (await c.query(
            `INSERT INTO perfil (id_pessoa, tipo_perfil) VALUES ($1, $2) RETURNING id_perfil, tipo_perfil`,
            [p.id_pessoa, tp]
          )).rows[0];
          if (!perfil) perfil = row;
        }

        // 5. Geração do código legível de ativação / primeiro acesso
        codigoGerado = gerarCodigoAtivacao();
        await c.query(
          `INSERT INTO codigo_primeiro_acesso (codigo, id_pessoa, id_perfil_gerador, status)
           VALUES ($1,$2,$3,'DISPONIVEL')`,
          [codigoGerado, p.id_pessoa, idPerfilGerador || null]);
      }

      return {
        ...p,
        perfil,
        codigo_ativacao: codigoGerado,
      };
    });
  }

  // ------------------------- Moderação de Dependentes -------------------------
  @Get('aprovacoes-pendentes') @Perfis('SINDICO')
  aprovacoesPendentes() {
    return this.db.query(`
      SELECT pu.id_pessoa_unidade, pu.id_pessoa, p.nome, p.email, p.cpf, p.data_nascimento, p.celular,
             u.id_unidade, u.numero_apartamento, b.nome AS bloco,
             pu.grau_parentesco, pu.data_inicio_ocupacao,
             resp.id_pessoa AS id_responsavel, resp.nome AS nome_responsavel, resp.email AS email_responsavel
        FROM pessoa_unidade pu
        JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
        JOIN unidade u ON u.id_unidade = pu.id_unidade
        JOIN bloco   b ON b.id_bloco   = u.id_bloco
        LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
       WHERE pu.status_aprovacao = 'PENDENTE' AND pu.data_fim_ocupacao IS NULL
       ORDER BY pu.data_inicio_ocupacao ASC`);
  }

  @Patch('aprovacoes/:id/avaliar') @Perfis('SINDICO')
  avaliarAprovacao(
    @Req() req: any,
    @Param('id', ParseIntPipe) idPessoaUnidade: number,
    @Body() b: { aprovado: boolean; motivo_rejeicao?: string }
  ) {
    const idPerfilSindico = perfilDoUsuario(req.user, 'SINDICO');
    return this.db.transacao(async c => {
      const vinculo = (await c.query(
        `SELECT pu.id_pessoa, pu.id_unidade, p.nome
           FROM pessoa_unidade pu
           JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
          WHERE pu.id_pessoa_unidade = $1`, [idPessoaUnidade])).rows;

      if (!vinculo.length) throw new BadRequestException('Vínculo não encontrado.');
      const v = vinculo[0];

      if (b.aprovado) {
        await c.query(
          `UPDATE pessoa_unidade SET status_aprovacao = 'APROVADO', motivo_rejeicao = NULL
            WHERE id_pessoa_unidade = $1`, [idPessoaUnidade]);

        // Garante que tenha código de ativação disponível
        const codigoExistente = await c.query(
          `SELECT codigo FROM codigo_primeiro_acesso WHERE id_pessoa = $1 AND status = 'DISPONIVEL'`,
          [v.id_pessoa]);

        let codigo = codigoExistente.rows[0]?.codigo;
        if (!codigo) {
          codigo = gerarCodigoAtivacao();
          await c.query(
            `INSERT INTO codigo_primeiro_acesso (codigo, id_pessoa, id_perfil_gerador, status)
             VALUES ($1,$2,$3,'DISPONIVEL')`, [codigo, v.id_pessoa, idPerfilSindico]);
        }

        return { aprovado: true, codigo_ativacao: codigo };
      } else {
        await c.query(
          `UPDATE pessoa_unidade SET status_aprovacao = 'REJEITADO', motivo_rejeicao = $2
            WHERE id_pessoa_unidade = $1`, [idPessoaUnidade, b.motivo_rejeicao || 'Cadastro recusado pela administração.']);
        return { aprovado: false };
      }
    });
  }

  // ------------------------- Consulta e Solicitação de Dependente pelo Morador -------------------------
  @Get('meus-dependentes') @Perfis('MORADOR')
  async obterMeusDependentes(@Req() req: any) {
    const idPessoa = req.user.sub;
    const vinculos = await this.db.query(
      `SELECT pu.id_pessoa_unidade, pu.id_unidade, pu.tipo_vinculo, pu.grau_parentesco, pu.id_responsavel,
              u.numero_apartamento, b.nome AS bloco,
              resp.nome AS nome_responsavel, resp.email AS email_responsavel
         FROM pessoa_unidade pu
         JOIN unidade u ON u.id_unidade = pu.id_unidade
         JOIN bloco   b ON b.id_bloco   = u.id_bloco
         LEFT JOIN pessoa resp ON resp.id_pessoa = pu.id_responsavel
        WHERE pu.id_pessoa = $1 AND pu.data_fim_ocupacao IS NULL
        LIMIT 1`, [idPessoa]);

    if (!vinculos.length) {
      return { vinculo: null, dependentes: [] };
    }

    const v = vinculos[0];

    // Se o morador logado for dependente, o titular responsável é v.id_responsavel; caso contrário, é o próprio morador
    const idTitular = (v.tipo_vinculo === 'DEPENDENTE' && v.id_responsavel) ? v.id_responsavel : idPessoa;

    const dependentes = await this.db.query(
      `SELECT pu.id_pessoa_unidade, p.id_pessoa, p.nome, p.email, p.cpf, p.data_nascimento, p.celular,
              pu.tipo_vinculo, pu.grau_parentesco, pu.status_aprovacao, pu.motivo_rejeicao,
              pu.id_responsavel,
              cpa.codigo AS codigo_ativacao, p.status_conta
         FROM pessoa_unidade pu
         JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
         LEFT JOIN LATERAL (
           SELECT codigo FROM codigo_primeiro_acesso
            WHERE id_pessoa = p.id_pessoa AND status = 'DISPONIVEL'
            ORDER BY id_codigo DESC LIMIT 1
         ) cpa ON TRUE
        WHERE (
          (pu.id_responsavel = $1)
          OR (pu.id_pessoa = $1)
        )
        AND pu.id_unidade = $2
        AND pu.data_fim_ocupacao IS NULL
        ORDER BY 
          (CASE WHEN pu.id_pessoa = $1 THEN 0 ELSE 1 END),
          pu.data_inicio_ocupacao DESC,
          p.nome ASC`, [idTitular, v.id_unidade]);

    return {
      vinculo: v,
      dependentes,
    };
  }

  @Post('meus-dependentes') @Perfis('MORADOR')
  async solicitarDependente(
    @Req() req: any,
    @Body() b: {
      nome: string; email: string; cpf: string; data_nascimento: string; celular?: string;
      grau_parentesco: string;
    }
  ) {
    const idMoradorLogado = req.user.sub;

    return this.db.transacao(async c => {
      // Localiza a unidade ativa do morador logado
      const vinculoTitular = (await c.query(`
        SELECT pu.id_unidade, pu.tipo_vinculo
          FROM pessoa_unidade pu
         WHERE pu.id_pessoa = $1
           AND pu.data_fim_ocupacao IS NULL
           AND pu.tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO')
         LIMIT 1`, [idMoradorLogado])).rows;

      if (!vinculoTitular.length) {
        throw new BadRequestException('Apenas titulares residentes ou proprietários podem solicitar dependentes.');
      }
      const idUnidade = vinculoTitular[0].id_unidade;

      // Cria a pessoa com CPF validado e sem formatação
      const cpfLimpo = (b.cpf || '').replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new BadRequestException('Erro de cadastro: O CPF deve conter exatamente 11 dígitos numéricos.');
      }

      const p = (await c.query(
        `INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular, status_conta)
         VALUES ($1,$2,$3,$4,$5,$6,'AGUARDANDO_PRIMEIRO_ACESSO')
         RETURNING id_pessoa, nome, email`,
        ['dev_' + cpfLimpo, b.nome, b.email, cpfLimpo, b.data_nascimento, b.celular || null])).rows[0];

      // Cria vínculo com status PENDENTE (moderação obrigatória contra má-fé)
      await c.query(
        `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao)
         VALUES ($1,$2,'DEPENDENTE',$3,$4,'PENDENTE')`,
        [p.id_pessoa, idUnidade, idMoradorLogado, b.grau_parentesco || 'OUTRO']);

      // Perfil Morador
      await c.query(
        `INSERT INTO perfil (id_pessoa, tipo_perfil) VALUES ($1,'MORADOR')`, [p.id_pessoa]);

      return {
        ...p,
        status: 'PENDENTE_APROVACAO',
        mensagem: 'Solicitação enviada para avaliação da administração condominial.',
      };
    });
  }

  @Put('pessoas/:id') @Perfis('SINDICO')
  async editarPessoa(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() b: {
      nome?: string;
      email?: string;
      celular?: string;
      cpf?: string;
      data_nascimento?: string;
      id_unidade?: number;
      tipo_vinculo?: string;
      id_responsavel?: number;
      grau_parentesco?: string;
      tipo_perfil?: string;
      perfis?: string[];
      reside?: boolean;
      papel_controle?: string;
      tipo_servico?: string;
    }
  ) {
    return this.db.transacao(async c => {
      // 1. Valida se o novo vínculo com a unidade conflita com outro titular ativo
      if (b.id_unidade && (b.tipo_vinculo === 'PROPRIETARIO' || b.tipo_vinculo === 'INQUILINO')) {
        const existente = await c.query(
          `SELECT pu.id_pessoa, p.nome, pu.tipo_vinculo
             FROM pessoa_unidade pu
             JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
            WHERE pu.id_unidade = $1
              AND pu.tipo_vinculo = $2
              AND pu.data_fim_ocupacao IS NULL
              AND pu.id_pessoa <> $3`,
          [b.id_unidade, b.tipo_vinculo, id]);

        if (existente.rows.length > 0) {
          const papel = b.tipo_vinculo === 'PROPRIETARIO' ? 'proprietário' : 'inquilino';
          throw new BadRequestException(
            `Erro de cadastro: O apartamento selecionado já possui um ${papel} ativo cadastrado (${existente.rows[0].nome}).`
          );
        }
      }

      // Validação de Morador: não permitir perfil Morador sem unidade vinculada
      const listaPerfisRaw = b.perfis || (b.tipo_perfil ? [b.tipo_perfil] : []);
      const listaPerfisUpper = listaPerfisRaw.map(p => p.toUpperCase());

      // Validação de exclusividade: Visitante e Prestador de Serviço não podem ser combinados com outros papéis
      if (listaPerfisUpper.includes('VISITANTE') && listaPerfisUpper.length > 1) {
        throw new BadRequestException('O papel de Visitante é exclusivo e não pode ser combinado com nenhum outro papel.');
      }
      if (listaPerfisUpper.includes('PRESTADOR_SERVICO') && listaPerfisUpper.length > 1) {
        throw new BadRequestException('O papel de Prestador de Serviço é exclusivo e não pode ser combinado com nenhum outro papel.');
      }

      const temPerfilMorador = listaPerfisUpper.includes('MORADOR');
      if (temPerfilMorador) {
        const temUnidadeInformada = b.id_unidade && Number(b.id_unidade) > 0;
        if (!temUnidadeInformada) {
          // Se não foi informada uma nova unidade, verifica se já tem uma unidade ativa
          const unExistente = await c.query(
            `SELECT id_pessoa_unidade FROM pessoa_unidade WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL LIMIT 1`,
            [id]
          );
          if (b.id_unidade === null || b.id_unidade === 0 || unExistente.rows.length === 0) {
            throw new BadRequestException('Para o papel de Morador, é obrigatório selecionar uma unidade vinculada (bloco e apartamento).');
          }
        }
      }

      // 2. Atualiza dados cadastrais em pessoa
      const cpfLimpo = b.cpf ? b.cpf.replace(/\D/g, '') : null;
      if (b.cpf && cpfLimpo && cpfLimpo.length !== 11) {
        throw new BadRequestException('Erro de cadastro: O CPF deve conter exatamente 11 dígitos numéricos.');
      }

      const p = (await c.query(
        `UPDATE pessoa
            SET nome = COALESCE($2, nome),
                email = COALESCE($3, email),
                celular = COALESCE($4, celular),
                cpf = COALESCE($5, cpf),
                data_nascimento = COALESCE($6, data_nascimento),
                papel_controle = COALESCE($7, papel_controle),
                tipo_servico = CASE WHEN $8::boolean THEN $9 ELSE tipo_servico END
          WHERE id_pessoa = $1
          RETURNING id_pessoa, nome, email, cpf, celular, data_nascimento, ativo, papel_controle, tipo_servico`,
        [
          id,
          b.nome,
          b.email,
          b.celular,
          cpfLimpo,
          b.data_nascimento,
          b.papel_controle || null,
          b.tipo_servico !== undefined,
          b.tipo_servico || null,
        ])).rows[0];

      if (!p) throw new BadRequestException('Pessoa não encontrada.');

      // 3. Atualiza ou cria vínculo com unidade
      if (b.id_unidade !== undefined) {
        if (b.id_unidade && Number(b.id_unidade) > 0) {
          const perfisInternos = listaPerfisUpper.filter(p => ['MORADOR', 'PORTEIRO', 'SINDICO'].includes(p));
          const perfisExternos = listaPerfisUpper.filter(p => ['VISITANTE', 'PRESTADOR_SERVICO'].includes(p));
          const ehApenasExterno = perfisExternos.length > 0 && perfisInternos.length === 0;

          let vinculo = b.tipo_vinculo || 'INQUILINO';
          let resideVal = b.reside !== undefined ? Boolean(b.reside) : null;
          if (ehApenasExterno) {
            vinculo = perfisExternos[0];
            resideVal = false;
          }
          const idResp = vinculo === 'DEPENDENTE' ? (b.id_responsavel || null) : null;
          const parentesco = vinculo === 'DEPENDENTE' ? (b.grau_parentesco || 'OUTRO') : null;
          if (ehApenasExterno) {
            resideVal = false;
          }

          const vinculoAtivo = await c.query(
            `SELECT id_pessoa_unidade FROM pessoa_unidade WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL LIMIT 1`,
            [id]);

          if (vinculoAtivo.rows.length > 0) {
            await c.query(
              `UPDATE pessoa_unidade
                  SET id_unidade = $2,
                      tipo_vinculo = $3,
                      id_responsavel = $4,
                      grau_parentesco = $5,
                      reside = COALESCE($6, reside)
                WHERE id_pessoa_unidade = $1`,
              [vinculoAtivo.rows[0].id_pessoa_unidade, b.id_unidade, vinculo, idResp, parentesco, resideVal]);
          } else {
            await c.query(
              `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao, reside)
               VALUES ($1, $2, $3, $4, $5, 'APROVADO', COALESCE($6, TRUE))`,
              [id, b.id_unidade, vinculo, idResp, parentesco, resideVal]);
          }
        } else {
          // Desvincula morador de qualquer unidade ativa caso passe sem unidade
          await c.query(
            `UPDATE pessoa_unidade SET data_fim_ocupacao = CURRENT_DATE WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL`,
            [id]
          );
        }
      }

      // 4. Atualiza tipos de perfil (suporte a múltiplos papéis e proteção do único administrador)
      if (b.perfis !== undefined || b.tipo_perfil !== undefined) {
        let rawPerfis: string[] = [];
        if (Array.isArray(b.perfis)) {
          rawPerfis = b.perfis.map(pf => (pf === 'ADMINISTRADOR' ? 'SINDICO' : pf.trim().toUpperCase()));
        } else if (b.tipo_perfil) {
          if (b.tipo_perfil === 'SINDICO_MORADOR') {
            rawPerfis = ['SINDICO', 'MORADOR'];
          } else if (b.tipo_perfil === 'SINDICO' || b.tipo_perfil === 'ADMINISTRADOR') {
            rawPerfis = ['SINDICO'];
          } else if (b.tipo_perfil === 'PORTEIRO') {
            rawPerfis = ['PORTEIRO'];
          } else if (b.tipo_perfil === 'MORADOR') {
            rawPerfis = ['MORADOR'];
          } else if (b.tipo_perfil === 'VISITANTE') {
            rawPerfis = ['VISITANTE'];
          } else if (b.tipo_perfil === 'PRESTADOR_SERVICO') {
            rawPerfis = ['PRESTADOR_SERVICO'];
          }
        }

        const perfisInternos = Array.from(new Set(rawPerfis)).filter(pf => ['MORADOR', 'PORTEIRO', 'SINDICO'].includes(pf));
        const perfisExternos = Array.from(new Set(rawPerfis)).filter(pf => ['VISITANTE', 'PRESTADOR_SERVICO'].includes(pf));
        const ehApenasExternoAtual = perfisExternos.length > 0 && perfisInternos.length === 0;

        if (perfisInternos.length === 0 && perfisExternos.length === 0) {
          throw new BadRequestException('A pessoa deve possuir pelo menos um papel ativo no condomínio.');
        }

        if (ehApenasExternoAtual) {
          // Se passou a ser apenas visitante ou prestador de serviço, encerra quaisquer perfis de login
          await c.query(
            `UPDATE perfil
                SET data_fim = CURRENT_DATE
              WHERE id_pessoa = $1
                AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`,
            [id]
          );
        } else {
          // RN: Não permitir que o próprio administrador tire seu perfil de administrador quando houver apenas 1 administrador ativo
          const editandoASiMesmo = (id === req.user?.sub);
          const contemAdmin = perfisInternos.includes('SINDICO');

          if (editandoASiMesmo && !contemAdmin) {
            const contagem = await c.query(
              `SELECT COUNT(DISTINCT pf.id_pessoa)::INTEGER AS total
                 FROM perfil pf
                WHERE pf.tipo_perfil = 'SINDICO'
                  AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)`
            );
            const totalAdmins = Number(contagem.rows[0]?.total || 0);
            if (totalAdmins <= 1) {
              throw new BadRequestException(
                'Não é permitido remover o seu próprio perfil de administrador quando você é o único administrador ativo do condomínio.'
              );
            }
          }

          // Ativa ou insere cada perfil solicitado
          for (const tp of perfisInternos) {
            const has = await c.query(
              `SELECT id_perfil, data_fim FROM perfil WHERE id_pessoa = $1 AND tipo_perfil = $2`,
              [id, tp]
            );
            if (has.rows.length === 0) {
              await c.query(`INSERT INTO perfil (id_pessoa, tipo_perfil) VALUES ($1, $2)`, [id, tp]);
            } else if (has.rows[0].data_fim !== null) {
              await c.query(`UPDATE perfil SET data_fim = NULL WHERE id_perfil = $1`, [has.rows[0].id_perfil]);
            }
          }

          // Desativa quaisquer outros perfis da pessoa que não foram selecionados
          const tiposPermitidos = [...perfisInternos];
          await c.query(
            `UPDATE perfil
                SET data_fim = CURRENT_DATE
              WHERE id_pessoa = $1
                AND tipo_perfil <> ALL($2::tipo_perfil_enum[])
                AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`,
            [id, tiposPermitidos]
          );
        }
      }

      return p;
    });
  }

  @Patch('pessoas/:id/inativar') @Perfis('SINDICO')
  inativar(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.db.transacao(async c => {
      if (id === req.user?.sub) {
        const contagem = await c.query(
          `SELECT COUNT(DISTINCT pf.id_pessoa)::INTEGER AS total
             FROM perfil pf
            WHERE pf.tipo_perfil = 'SINDICO'
              AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)`
        );
        if (Number(contagem.rows[0]?.total || 0) <= 1) {
          throw new BadRequestException(
            'Não é permitido inativar a si mesmo quando você é o único administrador ativo do condomínio.'
          );
        }
      }

      await c.query(`UPDATE pessoa SET ativo = FALSE WHERE id_pessoa = $1`, [id]);
      await c.query(
        `UPDATE perfil SET data_fim = CURRENT_DATE
          WHERE id_pessoa = $1 AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`, [id]);
      await c.query(
        `UPDATE pessoa_unidade SET data_fim_ocupacao = CURRENT_DATE
          WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL`, [id]);
      // Encerra ocupação em cascata de qualquer dependente subordinado a este titular
      await c.query(
        `UPDATE pessoa_unidade SET data_fim_ocupacao = CURRENT_DATE
          WHERE id_responsavel = $1 AND data_fim_ocupacao IS NULL`, [id]);
      return { ok: true, mensagem: 'Pessoa inativada com sucesso.' };
    });
  }

  @Patch('pessoas/:id/reativar') @Perfis('SINDICO')
  async reativar(@Param('id', ParseIntPipe) id: number) {
    return this.db.transacao(async c => {
      // 1. Reativa a pessoa
      await c.query(`UPDATE pessoa SET ativo = TRUE WHERE id_pessoa = $1`, [id]);

      // 2. Reativa perfis
      await c.query(
        `UPDATE perfil SET data_fim = NULL WHERE id_pessoa = $1`, [id]);

      // 3. Reabre o vínculo mais recente da pessoa se não houver conflito de titular
      const vinculoRecente = await c.query(
        `SELECT id_pessoa_unidade, id_unidade, tipo_vinculo
           FROM pessoa_unidade
          WHERE id_pessoa = $1
          ORDER BY id_pessoa_unidade DESC LIMIT 1`, [id]);

      if (vinculoRecente.rows.length > 0) {
        const v = vinculoRecente.rows[0];
        if (v.tipo_vinculo === 'PROPRIETARIO' || v.tipo_vinculo === 'INQUILINO') {
          const ocupanteAtual = await c.query(
            `SELECT pu.id_pessoa, p.nome
               FROM pessoa_unidade pu
               JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
              WHERE pu.id_unidade = $1
                AND pu.tipo_vinculo = $2
                AND pu.data_fim_ocupacao IS NULL
                AND pu.id_pessoa <> $3`,
            [v.id_unidade, v.tipo_vinculo, id]);

          if (ocupanteAtual.rows.length > 0) {
            throw new BadRequestException(
              `Não é possível reativar a ocupação desta unidade pois o morador (${ocupanteAtual.rows[0].nome}) já está como ${v.tipo_vinculo.toLowerCase()} ativo.`
            );
          }
        }
        await c.query(
          `UPDATE pessoa_unidade SET data_fim_ocupacao = NULL WHERE id_pessoa_unidade = $1`,
          [v.id_pessoa_unidade]);
      }

      return { ok: true, mensagem: 'Pessoa e acessos reativados com sucesso.' };
    });
  }

  @Delete('pessoas/:id') @Perfis('SINDICO')
  async excluirPessoa(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.db.transacao(async c => {
      // 0. Verifica se a pessoa existe
      const pessoaExistente = await c.query(
        `SELECT id_pessoa, nome FROM pessoa WHERE id_pessoa = $1`, [id]);
      if (!pessoaExistente.rows.length) {
        throw new BadRequestException('Pessoa não encontrada no sistema.');
      }
      const nomePessoa = pessoaExistente.rows[0].nome;

      // 0.1 Proteção contra auto-exclusão
      if (id === req.user?.sub) {
        throw new BadRequestException('Não é permitido excluir o seu próprio usuário administrador.');
      }

      // 0.2 Proteção contra exclusão do único administrador ativo do condomínio
      const ehAdmin = await c.query(
        `SELECT 1 FROM perfil
          WHERE id_pessoa = $1
            AND tipo_perfil = 'SINDICO'
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`,
        [id]
      );
      if (ehAdmin.rows.length > 0) {
        const contagemAdmins = await c.query(
          `SELECT COUNT(DISTINCT pf.id_pessoa)::INTEGER AS total
             FROM perfil pf
            WHERE pf.tipo_perfil = 'SINDICO'
              AND pf.id_pessoa <> $1
              AND (pf.data_fim IS NULL OR pf.data_fim > CURRENT_DATE)`
        );
        if (Number(contagemAdmins.rows[0]?.total || 0) < 1) {
          throw new BadRequestException(
            'Não é permitido excluir este usuário pois ele é o único administrador ativo do condomínio.'
          );
        }
      }

      // 1. Verifica se a pessoa possui reservas no condomínio
      const reservas = await c.query(
        `SELECT COUNT(*) AS total FROM reserva r
          WHERE r.id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(reservas.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui histórico de reservas de áreas comuns registrado. Para suspender o acesso preservando o histórico legal do condomínio, utilize a opção "Inativar".'
        );
      }

      // 2. Verifica se a pessoa possui encomendas registradas (destinatário, portaria ou entrega)
      const encomendas = await c.query(
        `SELECT COUNT(*) AS total FROM encomenda
          WHERE id_pessoa_destinatario = $1
             OR id_perfil_recebimento IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
             OR id_perfil_entrega IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(encomendas.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui histórico de encomendas registradas na portaria. Mantenha o cadastro inativo para preservar a auditoria.'
        );
      }

      // 3. Verifica se a pessoa possui empréstimos de chaves na portaria (solicitante, entrega ou recebimento)
      const chaves = await c.query(
        `SELECT COUNT(*) AS total FROM entrega_chave ec
          WHERE ec.id_perfil_solicitante IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
             OR ec.id_perfil_entrega IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)
             OR ec.id_perfil_recebimento IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(chaves.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui histórico de empréstimo de chaves registrado na portaria. Mantenha o cadastro inativo para preservar a auditoria.'
        );
      }

      // 4. Verifica se a pessoa publicou comunicados no mural
      const avisos = await c.query(
        `SELECT COUNT(*) AS total FROM aviso
          WHERE id_perfil_autor IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(avisos.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui comunicados/avisos publicados no mural. Utilize a opção "Inativar" para suspender o acesso preservando os registros.'
        );
      }

      // 5. Verifica se a pessoa registrou bloqueios/penalidades de áreas ou perfil
      const bloqueios = await c.query(
        `SELECT COUNT(*) AS total FROM bloqueio_perfil
          WHERE id_perfil_registro IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      const bloqueiosArea = await c.query(
        `SELECT COUNT(*) AS total FROM bloqueio_area
          WHERE id_perfil_registro IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(bloqueios.rows[0].total, 10) > 0 || parseInt(bloqueiosArea.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui registros administrativos de penalidades ou bloqueios. Mantenha o cadastro inativo para fins de auditoria.'
        );
      }

      // 6. Verifica se é titular responsável por dependentes cadastrados
      const dependentes = await c.query(
        `SELECT p.nome FROM pessoa_unidade pu
           JOIN pessoa p ON p.id_pessoa = pu.id_pessoa
          WHERE pu.id_responsavel = $1 AND pu.id_pessoa <> $1`, [id]);
      if (dependentes.rows.length > 0) {
        const nomesDep = dependentes.rows.map((d: any) => d.nome).join(', ');
        throw new BadRequestException(
          `Não é possível excluir esta pessoa pois ela é o titular responsável pelos seguintes dependentes: ${nomesDep}. Remova ou reatribua os dependentes antes de excluir o titular.`
        );
      }

      // 7. Sem histórico impeditivo: remove dependências secundárias e exclui o registro
      // 7.1 Desvincula de códigos de ativação gerados para terceiros
      await c.query(
        `UPDATE codigo_primeiro_acesso
            SET id_perfil_gerador = NULL
          WHERE id_perfil_gerador IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);

      // 7.2 Remove códigos gerados para a própria pessoa
      await c.query(`DELETE FROM codigo_primeiro_acesso WHERE id_pessoa = $1`, [id]);

      // 7.3 Remove penalidades disciplinares sofridas pela própria pessoa
      await c.query(`DELETE FROM bloqueio_perfil WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);

      // 7.4 Remove confirmações de leitura de avisos
      await c.query(`DELETE FROM aviso_perfil WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);

      // 7.5 Remove vínculos com unidades da própria pessoa
      await c.query(`DELETE FROM pessoa_unidade WHERE id_pessoa = $1`, [id]);

      // 7.6 Remove perfis e usuário
      await c.query(`DELETE FROM perfil WHERE id_pessoa = $1`, [id]);
      await c.query(`DELETE FROM pessoa WHERE id_pessoa = $1`, [id]);

      return { ok: true, mensagem: `Cadastro de "${nomePessoa}" excluído definitivamente com sucesso.` };
    });
  }

  // ------------------------- Penalidades / Bloqueio de Áreas Comuns (RN03) -------------------------
  @Get('pessoas/:id/bloqueios') @Perfis('SINDICO')
  async listarBloqueios(@Param('id', ParseIntPipe) idPessoa: number) {
    return this.db.query(`
      SELECT bp.id_bloqueio_perfil, bp.id_perfil, bp.id_area_comum,
             ac.nome AS nome_area,
             bp.data_hora_inicio, bp.data_hora_fim, bp.motivo, bp.descricao,
             p_reg.nome AS registrado_por,
             CASE WHEN bp.data_hora_fim IS NULL OR bp.data_hora_fim > CURRENT_TIMESTAMP THEN TRUE ELSE FALSE END AS ativo
        FROM bloqueio_perfil bp
        JOIN perfil pf ON pf.id_perfil = bp.id_perfil
        LEFT JOIN area_comum ac ON ac.id_area_comum = bp.id_area_comum
        LEFT JOIN perfil pf_reg ON pf_reg.id_perfil = bp.id_perfil_registro
        LEFT JOIN pessoa p_reg ON p_reg.id_pessoa = pf_reg.id_pessoa
       WHERE pf.id_pessoa = $1
       ORDER BY bp.data_hora_inicio DESC`, [idPessoa]);
  }

  @Post('pessoas/:id/bloqueios') @Perfis('SINDICO')
  async aplicarBloqueio(
    @Req() req: any,
    @Param('id', ParseIntPipe) idPessoa: number,
    @Body() b: {
      id_area_comum?: number;
      motivo: string;
      descricao?: string;
      data_hora_inicio?: string;
      data_hora_fim?: string;
    }
  ) {
    const idPerfilSindico = perfilDoUsuario(req.user, 'SINDICO');

    const perfis = await this.db.query(
      `SELECT id_perfil FROM perfil
        WHERE id_pessoa = $1 AND (data_fim IS NULL OR data_fim > CURRENT_DATE)
        ORDER BY (CASE WHEN tipo_perfil = 'MORADOR' THEN 1 ELSE 2 END)
        LIMIT 1`,
      [idPessoa]);
    if (!perfis.length) {
      throw new BadRequestException('Esta pessoa não possui perfil ativo para aplicação de penalidade.');
    }
    const idPerfilMorador = perfis[0].id_perfil;

    const inicio = b.data_hora_inicio ? new Date(b.data_hora_inicio) : new Date();
    let fim: Date | null = null;
    if (b.data_hora_fim) {
      const fimStr = b.data_hora_fim.length === 10 ? `${b.data_hora_fim}T23:59:59.999` : b.data_hora_fim;
      fim = new Date(fimStr);
    }

    if (fim && fim <= inicio) {
      throw new BadRequestException('A data/hora de término do afastamento deve ser posterior ao início.');
    }

    const canceladas = await this.db.query(
      `UPDATE reserva r
          SET status = 'CANCELADA',
              data_hora_cancelamento = CURRENT_TIMESTAMP,
              motivo_cancelamento = $1
         FROM perfil pf_res, perfil pf_bloq
        WHERE r.id_perfil = pf_res.id_perfil
          AND pf_bloq.id_perfil = $2
          AND pf_res.id_pessoa = pf_bloq.id_pessoa
          AND r.status = 'ATIVA'
          AND ($3::INTEGER IS NULL OR r.id_area_comum = $3::INTEGER)
          AND (r.data_hora_fim > $4 AND ($5::TIMESTAMP IS NULL OR r.data_hora_inicio < $5::TIMESTAMP))
        RETURNING r.id_reserva`,
      [`PENALIDADE: Bloqueio do morador (${b.motivo || 'INFRACAO'}).`, idPerfilMorador, b.id_area_comum || null, inicio, fim]
    );

    const res = await this.db.query(
      `INSERT INTO bloqueio_perfil (id_perfil, id_area_comum, id_perfil_registro, data_hora_inicio, data_hora_fim, motivo, descricao)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [idPerfilMorador, b.id_area_comum || null, idPerfilSindico, inicio, fim, b.motivo || 'INFRACAO', b.descricao || null]
    );

    return {
      ...res[0],
      reservas_canceladas: canceladas.length,
    };
  }

  @Patch('bloqueios/:id/encerrar') @Perfis('SINDICO')
  async encerrarBloqueio(@Param('id', ParseIntPipe) idBloqueio: number) {
    const res = await this.db.query(
      `UPDATE bloqueio_perfil
          SET data_hora_fim = CURRENT_TIMESTAMP
        WHERE id_bloqueio_perfil = $1
        RETURNING *`, [idBloqueio]);
    if (!res.length) throw new BadRequestException('Bloqueio não encontrado.');
    return res[0];
  }
}

@Module({ controllers: [CadastrosController] })
export class CadastrosModule {}
