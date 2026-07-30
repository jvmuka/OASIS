import { Controller, Get, Post, Put, Body, Param, Module, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis } from '../auth/guards';

/**
 * UC09 - Gerenciar Areas Comuns e Recursos.
 * Consulta liberada a todos os perfis; alteracoes restritas ao SINDICO.
 */
@Controller('areas')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class AreasController {
  constructor(private db: DbService) {}

  @Get()
  listar() {
    return this.db.query(`
      SELECT a.*,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fim', h.hora_fim))
               FILTER (WHERE h.id_horario IS NOT NULL), '[]') AS horarios
        FROM area_comum a
        LEFT JOIN area_horario h ON h.id_area_comum = a.id_area_comum
       GROUP BY a.id_area_comum
       ORDER BY a.nome`);
  }

  @Get(':id')
  detalhe(@Param('id', ParseIntPipe) id: number) {
    return this.db.query(`SELECT * FROM area_comum WHERE id_area_comum = $1`, [id])
      .then(r => r[0]);
  }

  @Post() @Perfis('SINDICO')
  criar(@Body() a: any) {
    return this.db.query(`
      INSERT INTO area_comum
        (nome, descricao, capacidade, tipo_acesso, tipo_uso, duracao_slot_min,
         antecedencia_minima_dias, antecedencia_maxima_dias,
         prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [a.nome, a.descricao || null, a.capacidade, a.tipo_acesso, a.tipo_uso,
       a.duracao_slot_min ?? 60, a.antecedencia_minima_dias ?? 0,
       a.antecedencia_maxima_dias ?? 30, a.prazo_cancelamento_horas ?? 24,
       a.limite_reservas_semana ?? 2, a.exige_chave ?? false, a.valor ?? 0])
      .then(r => r[0]);
  }

  @Put(':id') @Perfis('SINDICO')
  editar(@Param('id', ParseIntPipe) id: number, @Body() a: any) {
    return this.db.query(`
      UPDATE area_comum SET
        nome = COALESCE($2,nome), descricao = COALESCE($3,descricao),
        capacidade = COALESCE($4,capacidade),
        duracao_slot_min = COALESCE($5,duracao_slot_min),
        antecedencia_minima_dias = COALESCE($6,antecedencia_minima_dias),
        antecedencia_maxima_dias = COALESCE($7,antecedencia_maxima_dias),
        prazo_cancelamento_horas = COALESCE($8,prazo_cancelamento_horas),
        limite_reservas_semana = COALESCE($9,limite_reservas_semana),
        ativo = COALESCE($10,ativo)
      WHERE id_area_comum = $1 RETURNING *`,
      [id, a.nome, a.descricao, a.capacidade, a.duracao_slot_min,
       a.antecedencia_minima_dias, a.antecedencia_maxima_dias,
       a.prazo_cancelamento_horas, a.limite_reservas_semana, a.ativo])
      .then(r => r[0]);
  }

  @Post(':id/horarios') @Perfis('SINDICO')
  criarHorario(@Param('id', ParseIntPipe) id: number,
               @Body() h: { dia_semana: string; hora_inicio: string; hora_fim: string }) {
    return this.db.query(`
      INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim)
      VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, h.dia_semana, h.hora_inicio, h.hora_fim]).then(r => r[0]);
  }
}

@Module({ controllers: [AreasController] })
export class AreasModule {}
