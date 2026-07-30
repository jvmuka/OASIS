import { Controller, Get, Post, Patch, Body, Param, Query, Module, UseGuards, Req, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';

const DIAS = ['DOMINGO','SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO'];

/**
 * UC02 (disponibilidade), UC03 (reservar) e UC04 (cancelar).
 * A validacao pesada (RN01 a RN08) acontece nos gatilhos do banco;
 * a API monta a grade de horarios e repassa as mensagens das regras.
 */
@Controller('reservas')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class ReservasController {
  constructor(private db: DbService) {}

  /** UC02: grade de intervalos livres/ocupados de uma area em uma data. */
  @Get('disponibilidade')
  async disponibilidade(@Query('area', ParseIntPipe) area: number, @Query('data') data: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || ''))
      throw new BadRequestException('Informe a data no formato AAAA-MM-DD.');

    const [info] = await this.db.query(
      `SELECT * FROM area_comum WHERE id_area_comum = $1`, [area]);
    if (!info) throw new BadRequestException('Area comum inexistente.');

    const diaSemana = DIAS[new Date(data + 'T12:00:00').getDay()];
    const janelas = await this.db.query(
      `SELECT hora_inicio, hora_fim FROM area_horario
        WHERE id_area_comum = $1 AND dia_semana = $2 ORDER BY hora_inicio`,
      [area, diaSemana]);

    const reservas = await this.db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM reserva
        WHERE id_area_comum = $1 AND status = 'ATIVA'
          AND data_hora_inicio::date = $2::date`, [area, data]);

    const bloqueios = await this.db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM bloqueio_area
        WHERE id_area_comum = $1
          AND $2::date BETWEEN data_hora_inicio::date AND data_hora_fim::date`,
      [area, data]);

    // monta a grade de slots em memoria
    const slots: any[] = [];
    const passo = info.duracao_slot_min;
    for (const j of janelas) {
      let [h, m] = String(j.hora_inicio).split(':').map(Number);
      const [hf, mf] = String(j.hora_fim).split(':').map(Number);
      let ini = h * 60 + m; const fim = hf * 60 + mf;
      while (ini + passo <= fim) {
        const hIni = `${String(Math.floor(ini / 60)).padStart(2, '0')}:${String(ini % 60).padStart(2, '0')}`;
        const fimSlot = ini + passo;
        const hFim = `${String(Math.floor(fimSlot / 60)).padStart(2, '0')}:${String(fimSlot % 60).padStart(2, '0')}`;
        const a = new Date(`${data}T${hIni}:00`); const b = new Date(`${data}T${hFim}:00`);
        const ocupado = reservas.some(r =>
          a < new Date(r.data_hora_fim) && b > new Date(r.data_hora_inicio));
        const bloqueado = bloqueios.some(r =>
          a < new Date(r.data_hora_fim) && b > new Date(r.data_hora_inicio));
        slots.push({ inicio: hIni, fim: hFim,
          status: bloqueado ? 'BLOQUEADO' : ocupado ? 'OCUPADO' : 'LIVRE' });
        ini = fimSlot;
      }
    }
    return {
      area: { id_area_comum: info.id_area_comum, nome: info.nome, capacidade: info.capacidade },
      data, dia_semana: diaSemana,
      regras: {
        antecedencia_minima_dias: info.antecedencia_minima_dias,
        antecedencia_maxima_dias: info.antecedencia_maxima_dias,
        prazo_cancelamento_horas: info.prazo_cancelamento_horas,
        limite_reservas_semana: info.limite_reservas_semana,
        duracao_slot_min: info.duracao_slot_min,
      },
      slots,
    };
  }

  /** UC03: registrar a reserva (gatilhos RN01 a RN07 validam no INSERT). */
  @Post() @Perfis('MORADOR')
  criar(@Req() req: any, @Body() b: {
    id_area_comum: number; data: string; inicio: string; fim: string; numero_pessoas: number;
  }) {
    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    return this.db.query(`
      INSERT INTO reserva (id_area_comum, id_perfil, data_hora_inicio, data_hora_fim, numero_pessoas)
      VALUES ($1,$2,($3 || ' ' || $4)::timestamp,($3 || ' ' || $5)::timestamp,$6)
      RETURNING id_reserva, status, data_hora_inicio, data_hora_fim`,
      [b.id_area_comum, idPerfil, b.data, b.inicio, b.fim, b.numero_pessoas])
      .then(r => r[0]);
  }

  /** Minhas reservas (morador autenticado). */
  @Get('minhas') @Perfis('MORADOR')
  minhas(@Req() req: any) {
    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    return this.db.query(`
      SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim,
             r.numero_pessoas, r.status, a.prazo_cancelamento_horas
        FROM reserva r JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE r.id_perfil = $1
       ORDER BY r.data_hora_inicio DESC`, [idPerfil]);
  }

  /** UC04: cancelar (gatilho RN08 valida o prazo e grava a data). */
  @Patch(':id/cancelar') @Perfis('MORADOR')
  cancelar(@Req() req: any, @Param('id', ParseIntPipe) id: number,
           @Body() b: { motivo?: string }) {
    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    return this.db.query(`
      UPDATE reserva SET status = 'CANCELADA', motivo_cancelamento = $3
       WHERE id_reserva = $1 AND id_perfil = $2 AND status = 'ATIVA'
       RETURNING id_reserva, status, data_hora_cancelamento`,
      [id, idPerfil, b?.motivo || null])
      .then(r => {
        if (!r.length) throw new BadRequestException('Reserva inexistente, de outro morador ou ja encerrada.');
        return r[0];
      });
  }
}

@Module({ controllers: [ReservasController] })
export class ReservasModule {}
