import { Controller, Get, Post, Patch, Body, Param, Query, Module, UseGuards, Req, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';

/**
 * UC06 (chaves), UC07 (registrar encomenda) e UC08 (alterar status).
 * O rastreio de quem entregou/recebeu usa o id_perfil do porteiro logado.
 */
@Controller('portaria')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class PortariaController {
  constructor(private db: DbService) {}

  // ------------------------- encomendas -------------------------
  @Get('encomendas') @Perfis('PORTEIRO', 'SINDICO')
  encomendas(@Query('status') status?: string) {
    return this.db.query(`
      SELECT e.id_encomenda, p.nome AS destinatario, b.nome AS bloco,
             u.numero_apartamento, e.descricao, e.tamanho, e.status,
             e.data_hora_recebimento, e.data_hora_retirada, e.retirado_por, e.nome_retirante
        FROM encomenda e
        JOIN pessoa p ON p.id_pessoa = e.id_pessoa_destinatario
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco   b ON b.id_bloco   = u.id_bloco
       WHERE ($1::status_encomenda_enum IS NULL OR e.status = $1::status_encomenda_enum)
       ORDER BY e.data_hora_recebimento DESC`, [status || null]);
  }

  /** UC07: gatilho RN11 gera o aviso individual automaticamente. */
  @Post('encomendas') @Perfis('PORTEIRO')
  registrar(@Req() req: any, @Body() b: {
    id_pessoa_destinatario: number; descricao?: string; tamanho: string;
  }) {
    const idPerfil = perfilDoUsuario(req.user, 'PORTEIRO');
    return this.db.query(`
      INSERT INTO encomenda (id_pessoa_destinatario, id_perfil_recebimento, descricao, tamanho)
      VALUES ($1,$2,$3,$4) RETURNING id_encomenda, status, data_hora_recebimento`,
      [b.id_pessoa_destinatario, idPerfil, b.descricao || null, b.tamanho])
      .then(r => r[0]);
  }

  /** UC08: gatilho RN12 exige retirado_por (e o nome, se TERCEIRO). */
  @Patch('encomendas/:id/retirada') @Perfis('PORTEIRO')
  retirada(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() b: {
    retirado_por: string; nome_retirante?: string;
  }) {
    const idPerfil = perfilDoUsuario(req.user, 'PORTEIRO');
    return this.db.query(`
      UPDATE encomenda
         SET data_hora_retirada = CURRENT_TIMESTAMP,
             retirado_por = $2::retirado_por_enum,
             nome_retirante = $3,
             id_perfil_entrega = $4
       WHERE id_encomenda = $1 AND status = 'AGUARDANDO_RETIRADA'
       RETURNING id_encomenda, status, data_hora_retirada`,
      [id, b.retirado_por, b.nome_retirante || null, idPerfil])
      .then(r => {
        if (!r.length) throw new BadRequestException('Encomenda inexistente ou ja retirada.');
        return r[0];
      });
  }

  /** Encomendas do morador autenticado e de sua unidade (ele nao pode ver a lista completa da portaria). */
  @Get('minhas-encomendas') @Perfis('MORADOR')
  minhasEncomendas(@Req() req: any) {
    return this.db.query(`
      SELECT e.id_encomenda, e.descricao, e.tamanho, e.status,
             e.data_hora_recebimento, e.data_hora_retirada, e.retirado_por, e.nome_retirante,
             p_dest.nome AS destinatario,
             p_rec.nome AS recebido_por,
             p_ent.nome AS entregue_por,
             b.nome AS bloco, u.numero_apartamento AS apartamento,
             pu.tipo_vinculo, pu.grau_parentesco,
             CASE WHEN e.id_pessoa_destinatario = $1 THEN true ELSE false END AS para_mim
        FROM encomenda e
        JOIN pessoa p_dest ON p_dest.id_pessoa = e.id_pessoa_destinatario
        JOIN perfil pf_rec ON pf_rec.id_perfil = e.id_perfil_recebimento
        JOIN pessoa p_rec ON p_rec.id_pessoa = pf_rec.id_pessoa
        LEFT JOIN perfil pf_ent ON pf_ent.id_perfil = e.id_perfil_entrega
        LEFT JOIN pessoa p_ent ON p_ent.id_pessoa = pf_ent.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = e.id_pessoa_destinatario AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE e.id_pessoa_destinatario = $1
          OR e.id_pessoa_destinatario IN (
             SELECT pu2.id_pessoa
               FROM pessoa_unidade pu1
               JOIN pessoa_unidade pu2 ON pu2.id_unidade = pu1.id_unidade
              WHERE pu1.id_pessoa = $1 
                AND pu1.data_fim_ocupacao IS NULL 
                AND pu2.data_fim_ocupacao IS NULL
          )
       ORDER BY 
         CASE WHEN e.status = 'AGUARDANDO_RETIRADA' THEN 0 ELSE 1 END,
         e.data_hora_recebimento DESC`, [req.user.sub]);
  }

  // ------------------------- chaves -------------------------
  @Get('chaves') @Perfis('PORTEIRO', 'SINDICO')
  chaves() {
    return this.db.query(`
      SELECT c.id_chave, c.codigo, c.status, a.nome AS area,
             ec.id_entrega_chave, p.nome AS responsavel, ec.data_hora_retirada
        FROM chave c
        JOIN area_comum a ON a.id_area_comum = c.id_area_comum
        LEFT JOIN entrega_chave ec ON ec.id_chave = c.id_chave AND ec.data_hora_devolucao IS NULL
        LEFT JOIN perfil pf ON pf.id_perfil = ec.id_perfil_solicitante
        LEFT JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       ORDER BY a.nome, c.codigo`);
  }

  /** UC06 emprestimo: gatilho RN09 valida disponibilidade e muda o status. */
  @Post('chaves/:id/emprestimo') @Perfis('PORTEIRO')
  emprestar(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() b: {
    id_perfil_solicitante: number; id_reserva?: number; observacao?: string;
  }) {
    const idPorteiro = perfilDoUsuario(req.user, 'PORTEIRO');
    return this.db.query(`
      INSERT INTO entrega_chave (id_chave, id_perfil_solicitante, id_perfil_entrega, id_reserva, observacao)
      VALUES ($1,$2,$3,$4,$5) RETURNING id_entrega_chave, data_hora_retirada`,
      [id, b.id_perfil_solicitante, idPorteiro, b.id_reserva || null, b.observacao || null])
      .then(r => r[0]);
  }

  /** UC06 devolucao: gatilho RN10 valida e libera a chave. */
  @Patch('chaves/emprestimos/:id/devolucao') @Perfis('PORTEIRO')
  devolver(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const idPorteiro = perfilDoUsuario(req.user, 'PORTEIRO');
    return this.db.query(`
      UPDATE entrega_chave
         SET data_hora_devolucao = CURRENT_TIMESTAMP, id_perfil_recebimento = $2
       WHERE id_entrega_chave = $1 AND data_hora_devolucao IS NULL
       RETURNING id_entrega_chave, data_hora_devolucao`, [id, idPorteiro])
      .then(r => {
        if (!r.length) throw new BadRequestException('Emprestimo inexistente ou ja devolvido.');
        return r[0];
      });
  }

  // ------------------------- painel da portaria (visao de reservas) -------------------------
  /**
   * Areas ocupadas agora (reserva ATIVA em andamento) e reservas encerradas ha
   * pouco (ate 3h) cujo horario de fim ja passou e que seguem sem cancelamento,
   * marcadas como "em atraso" para o porteiro cobrar a liberacao/devolucao.
   */
  @Get('ocupacao-agora') @Perfis('PORTEIRO', 'SINDICO')
  ocupacaoAgora() {
    return this.db.query(`
      SELECT r.id_reserva, a.nome AS area, p.nome AS morador, b.nome AS bloco,
             u.numero_apartamento AS apartamento, r.data_hora_inicio, r.data_hora_fim,
             r.numero_pessoas, FALSE AS em_atraso,
             CEIL(EXTRACT(EPOCH FROM (r.data_hora_fim - CURRENT_TIMESTAMP)) / 60)::int AS minutos_restantes,
             NULL::int AS minutos_atraso
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE r.status = 'ATIVA'
         AND CURRENT_TIMESTAMP BETWEEN r.data_hora_inicio AND r.data_hora_fim

       UNION ALL

      SELECT r.id_reserva, a.nome, p.nome, b.nome,
             u.numero_apartamento, r.data_hora_inicio, r.data_hora_fim,
             r.numero_pessoas, TRUE,
             NULL,
             CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - r.data_hora_fim)) / 60)::int
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE r.status = 'ATIVA'
         AND r.data_hora_fim < CURRENT_TIMESTAMP
         AND r.data_hora_fim >= CURRENT_TIMESTAMP - INTERVAL '3 hours'

       ORDER BY em_atraso ASC, data_hora_fim ASC`);
  }

  /** Agenda do dia (padrao hoje) com a situacao calculada de cada reserva ativa. */
  @Get('agenda') @Perfis('PORTEIRO', 'SINDICO')
  agenda(@Query('data') data?: string) {
    const dia = data && /^\d{4}-\d{2}-\d{2}$/.test(data)
      ? data
      : new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);

    return this.db.query(`
      SELECT r.id_reserva, a.nome AS area, p.nome AS morador, b.nome AS bloco,
             u.numero_apartamento AS apartamento, r.data_hora_inicio, r.data_hora_fim,
             r.numero_pessoas,
             CASE WHEN r.data_hora_inicio > CURRENT_TIMESTAMP THEN 'AGENDADA'
                  WHEN r.data_hora_fim < CURRENT_TIMESTAMP THEN 'ENCERRADA'
                  ELSE 'EM_ANDAMENTO' END AS situacao
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE r.status = 'ATIVA' AND r.data_hora_inicio::date = $1::date
       ORDER BY r.data_hora_inicio`, [dia]).then(reservas => ({ data: dia, reservas }));
  }

  /** Busca moradores por nome, CPF, bloco ou apartamento, indicando quem esta em atividade agora. */
  @Get('pessoas/busca') @Perfis('PORTEIRO', 'SINDICO')
  buscarPessoas(@Query('q') q?: string) {
    const termo = (q || '').trim();
    if (!termo) return [];
    const filtro = `%${termo.toLowerCase()}%`;

    return this.db.query(`
      SELECT p.id_pessoa, p.nome, p.cpf, p.celular,
             b.nome AS bloco, u.numero_apartamento AS apartamento, pu.tipo_vinculo,
             (ativa.id_reserva IS NOT NULL) AS em_atividade,
             ativa.area AS atividade_area,
             ativa.data_hora_inicio AS atividade_inicio,
             ativa.data_hora_fim AS atividade_fim
        FROM pessoa p
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
        LEFT JOIN LATERAL (
          SELECT r.id_reserva, r.data_hora_inicio, r.data_hora_fim, a.nome AS area
            FROM reserva r
            JOIN perfil pf ON pf.id_perfil = r.id_perfil
            JOIN area_comum a ON a.id_area_comum = r.id_area_comum
           WHERE pf.id_pessoa = p.id_pessoa AND r.status = 'ATIVA'
             AND CURRENT_TIMESTAMP BETWEEN r.data_hora_inicio AND r.data_hora_fim
           LIMIT 1
        ) ativa ON TRUE
       WHERE p.ativo = TRUE
         AND (LOWER(p.nome) LIKE $1 OR p.cpf LIKE $1 OR LOWER(b.nome) LIKE $1 OR u.numero_apartamento LIKE $1)
       ORDER BY p.nome
       LIMIT 30`, [filtro]);
  }

  /** Detalhe de atividade de uma pessoa: agora, proximas reservas e historico de 90 dias. */
  @Get('pessoas/:idPessoa/atividade') @Perfis('PORTEIRO', 'SINDICO')
  async atividadePessoa(@Param('idPessoa', ParseIntPipe) idPessoa: number) {
    const pessoa = await this.db.query(`
      SELECT p.id_pessoa, p.nome, p.cpf, p.celular, b.nome AS bloco, u.numero_apartamento AS apartamento
        FROM pessoa p
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE p.id_pessoa = $1`, [idPessoa]);
    if (!pessoa.length) throw new BadRequestException('Pessoa nao encontrada.');

    const agora = await this.db.query(`
      SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas
        FROM reserva r
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE pf.id_pessoa = $1 AND r.status = 'ATIVA'
         AND CURRENT_TIMESTAMP BETWEEN r.data_hora_inicio AND r.data_hora_fim
       LIMIT 1`, [idPessoa]);

    const proximas = await this.db.query(`
      SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas
        FROM reserva r
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE pf.id_pessoa = $1 AND r.status = 'ATIVA' AND r.data_hora_inicio > CURRENT_TIMESTAMP
       ORDER BY r.data_hora_inicio`, [idPessoa]);

    const historico = await this.db.query(`
      SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas, r.status
        FROM reserva r
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE pf.id_pessoa = $1
         AND r.data_hora_fim < CURRENT_TIMESTAMP
         AND r.data_hora_fim >= CURRENT_TIMESTAMP - INTERVAL '90 days'
       ORDER BY r.data_hora_fim DESC`, [idPessoa]);

    return {
      pessoa: pessoa[0],
      atividade_agora: agora[0] || null,
      proximas_reservas: proximas,
      historico_90_dias: historico,
    };
  }
}

@Module({ controllers: [PortariaController] })
export class PortariaModule {}
