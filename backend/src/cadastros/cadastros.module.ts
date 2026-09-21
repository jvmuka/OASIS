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
  @Get('pessoas')
  async pessoas(@Query('busca') busca?: string) {
    const filtro = busca ? `%${busca.toLowerCase()}%` : '%';
    const pessoas = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             p.status_conta, p.ativo,
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
       WHERE LOWER(p.nome) LIKE $1
          OR p.cpf LIKE $1
          OR LOWER(p.email) LIKE $1
          OR u.numero_apartamento LIKE $1
          OR LOWER(b.nome) LIKE $1
          OR LOWER(CONCAT(b.nome, ' ', u.numero_apartamento)) LIKE $1
       GROUP BY p.id_pessoa
       ORDER BY p.nome`, [filtro]);

    return pessoas;
  }

  @Get('pessoas/:id/detalhes')
  async detalhesPessoa(@Param('id', ParseIntPipe) id: number) {
    const lista = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.data_nascimento,
             p.status_conta, p.ativo,
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
   * Cadastro completo com unicidade de titular e geração de código de primeiro acesso.
   */
  @Post('pessoas') @Perfis('SINDICO')
  async criarPessoa(
    @Req() req: any,
    @Body() b: {
      nome: string; email: string; cpf: string; data_nascimento: string; celular?: string;
      id_unidade?: number; tipo_vinculo?: string; tipo_perfil?: string; perfis?: string[];
      id_responsavel?: number; grau_parentesco?: string;
    }
  ) {
    const idPerfilGerador = perfilDoUsuario(req.user, 'SINDICO');

    return this.db.transacao(async c => {
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

      // 2. Criação da pessoa com status inicial de primeiro acesso
      const cpfLimpo = (b.cpf || '').replace(/\D/g, '');
      if (cpfLimpo.length !== 11) {
        throw new BadRequestException('Erro de cadastro: O CPF deve conter exatamente 11 dígitos numéricos.');
      }

      const p = (await c.query(
        `INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular, status_conta)
         VALUES ($1,$2,$3,$4,$5,$6,'AGUARDANDO_PRIMEIRO_ACESSO')
         RETURNING id_pessoa, nome, email, cpf`,
        ['dev_' + cpfLimpo, b.nome, b.email, cpfLimpo, b.data_nascimento, b.celular || null])).rows[0];

      // 3. Vínculo com a unidade
      if (b.id_unidade) {
        const vinculo = b.tipo_vinculo || 'INQUILINO';
        const idResp = vinculo === 'DEPENDENTE' ? (b.id_responsavel || null) : null;
        const parentesco = vinculo === 'DEPENDENTE' ? (b.grau_parentesco || 'OUTRO') : null;

        await c.query(
          `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao)
           VALUES ($1,$2,$3,$4,$5,'APROVADO')`,
          [p.id_pessoa, b.id_unidade, vinculo, idResp, parentesco]);
      }

      // 4. Perfil de acesso (suporte a múltiplos papéis simultâneos)
      let listaPerfis: string[] = [];
      if (Array.isArray(b.perfis) && b.perfis.length > 0) {
        listaPerfis = b.perfis.map(pf => (pf === 'ADMINISTRADOR' ? 'SINDICO' : pf.trim().toUpperCase()));
      } else if (b.tipo_perfil) {
        if (b.tipo_perfil === 'SINDICO_MORADOR') {
          listaPerfis = ['SINDICO', 'MORADOR'];
        } else if (b.tipo_perfil === 'SINDICO' || b.tipo_perfil === 'ADMINISTRADOR') {
          listaPerfis = ['SINDICO'];
        } else if (b.tipo_perfil === 'PORTEIRO') {
          listaPerfis = ['PORTEIRO'];
        } else if (b.tipo_perfil === 'MORADOR') {
          listaPerfis = ['MORADOR'];
        }
      }
      listaPerfis = Array.from(new Set(listaPerfis)).filter(pf => ['MORADOR', 'PORTEIRO', 'SINDICO'].includes(pf));
      if (listaPerfis.length === 0) {
        listaPerfis = ['MORADOR'];
      }

      let perfil: any = null;
      for (const tp of listaPerfis) {
        const row = (await c.query(
          `INSERT INTO perfil (id_pessoa, tipo_perfil) VALUES ($1, $2) RETURNING id_perfil, tipo_perfil`,
          [p.id_pessoa, tp]
        )).rows[0];
        if (!perfil) perfil = row;
      }

      // 5. Geração do código legível de ativação / primeiro acesso
      const codigoGerado = gerarCodigoAtivacao();
      await c.query(
        `INSERT INTO codigo_primeiro_acesso (codigo, id_pessoa, id_perfil_gerador, status)
         VALUES ($1,$2,$3,'DISPONIVEL')`,
        [codigoGerado, p.id_pessoa, idPerfilGerador || null]);

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
                data_nascimento = COALESCE($6, data_nascimento)
          WHERE id_pessoa = $1
          RETURNING id_pessoa, nome, email, cpf, celular, data_nascimento, ativo`,
        [id, b.nome, b.email, b.celular, cpfLimpo, b.data_nascimento])).rows[0];

      if (!p) throw new BadRequestException('Pessoa não encontrada.');

      // 3. Atualiza ou cria vínculo com unidade
      if (b.id_unidade !== undefined) {
        if (b.id_unidade && Number(b.id_unidade) > 0) {
          const vinculo = b.tipo_vinculo || 'INQUILINO';
          const idResp = vinculo === 'DEPENDENTE' ? (b.id_responsavel || null) : null;
          const parentesco = vinculo === 'DEPENDENTE' ? (b.grau_parentesco || 'OUTRO') : null;

          const vinculoAtivo = await c.query(
            `SELECT id_pessoa_unidade FROM pessoa_unidade WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL LIMIT 1`,
            [id]);

          if (vinculoAtivo.rows.length > 0) {
            await c.query(
              `UPDATE pessoa_unidade
                  SET id_unidade = $2,
                      tipo_vinculo = $3,
                      id_responsavel = $4,
                      grau_parentesco = $5
                WHERE id_pessoa_unidade = $1`,
              [vinculoAtivo.rows[0].id_pessoa_unidade, b.id_unidade, vinculo, idResp, parentesco]);
          } else {
            await c.query(
              `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao)
               VALUES ($1, $2, $3, $4, $5, 'APROVADO')`,
              [id, b.id_unidade, vinculo, idResp, parentesco]);
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
        let novosPerfis: string[] = [];
        if (Array.isArray(b.perfis)) {
          novosPerfis = b.perfis.map(pf => (pf === 'ADMINISTRADOR' ? 'SINDICO' : pf.trim().toUpperCase()));
        } else if (b.tipo_perfil) {
          if (b.tipo_perfil === 'SINDICO_MORADOR') {
            novosPerfis = ['SINDICO', 'MORADOR'];
          } else if (b.tipo_perfil === 'SINDICO' || b.tipo_perfil === 'ADMINISTRADOR') {
            novosPerfis = ['SINDICO'];
          } else if (b.tipo_perfil === 'PORTEIRO') {
            novosPerfis = ['PORTEIRO'];
          } else if (b.tipo_perfil === 'MORADOR') {
            novosPerfis = ['MORADOR'];
          }
        }
        novosPerfis = Array.from(new Set(novosPerfis)).filter(pf => ['MORADOR', 'PORTEIRO', 'SINDICO'].includes(pf));

        if (novosPerfis.length === 0) {
          throw new BadRequestException('A pessoa deve possuir pelo menos um papel ativo no condomínio.');
        }

        // RN: Não permitir que o próprio administrador tire seu perfil de administrador quando houver apenas 1 administrador ativo
        const editandoASiMesmo = (id === req.user?.sub);
        const contemAdmin = novosPerfis.includes('SINDICO');

        if (editandoASiMesmo && !contemAdmin) {
          const contagem = await c.query(
            `SELECT COUNT(DISTINCT pf.id_pessoa)::INTEGER AS total
               FROM perfil pf
              WHERE pf.tipo_perfil IN ('SINDICO', 'ADMINISTRADOR')
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
        for (const tp of novosPerfis) {
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
        const tiposPermitidos = [...novosPerfis];
        await c.query(
          `UPDATE perfil
              SET data_fim = CURRENT_DATE
            WHERE id_pessoa = $1
              AND tipo_perfil <> ALL($2::tipo_perfil_enum[])
              AND (data_fim IS NULL OR data_fim > CURRENT_DATE)`,
          [id, tiposPermitidos]
        );
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
            WHERE pf.tipo_perfil IN ('SINDICO', 'ADMINISTRADOR')
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
      if (id === req.user?.sub) {
        throw new BadRequestException('Não é permitido excluir o seu próprio usuário administrador.');
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

      // 2. Verifica se a pessoa possui encomendas registradas
      const encomendas = await c.query(
        `SELECT COUNT(*) AS total FROM encomenda WHERE id_pessoa_destinatario = $1`, [id]);
      if (parseInt(encomendas.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui histórico de encomendas registradas na portaria. Mantenha o cadastro inativo para preservar a auditoria.'
        );
      }

      // 3. Verifica se a pessoa possui empréstimos de chaves
      const chaves = await c.query(
        `SELECT COUNT(*) AS total FROM entrega_chave ec
          WHERE ec.id_perfil_retirada IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      if (parseInt(chaves.rows[0].total, 10) > 0) {
        throw new BadRequestException(
          'Não é possível excluir permanentemente esta pessoa pois ela possui histórico de empréstimo de chaves registrado na portaria.'
        );
      }

      // 4. Sem histórico crítico (ex: cadastro errado ou recém-criado por engano) -> remove tudo com segurança
      await c.query(`DELETE FROM codigo_primeiro_acesso WHERE id_pessoa = $1`, [id]);
      await c.query(`DELETE FROM bloqueio_perfil WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      await c.query(`DELETE FROM aviso_perfil WHERE id_perfil IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      await c.query(`DELETE FROM aviso WHERE id_perfil_autor IN (SELECT id_perfil FROM perfil WHERE id_pessoa = $1)`, [id]);
      await c.query(`DELETE FROM pessoa_unidade WHERE id_pessoa = $1 OR id_responsavel = $1`, [id]);
      await c.query(`DELETE FROM perfil WHERE id_pessoa = $1`, [id]);
      await c.query(`DELETE FROM pessoa WHERE id_pessoa = $1`, [id]);

      return { ok: true, mensagem: 'Cadastro excluído permanentemente com sucesso.' };
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
