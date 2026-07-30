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
}

@Module({ controllers: [PortariaController] })
export class PortariaModule {}
