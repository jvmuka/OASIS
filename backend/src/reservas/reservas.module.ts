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

  /** UC02 auxiliar: datas com reservas ou bloqueios no mês para uma área (usado para marcar dias ocupados no calendário) */
  @Get('datas-ocupadas')
  async datasOcupadas(
    @Query('area', ParseIntPipe) area: number,
    @Query('ano') anoStr?: string,
    @Query('mes') mesStr?: string,
  ) {
    const agora = new Date();
    const ano = anoStr ? parseInt(anoStr, 10) : agora.getFullYear();
    const mes = mesStr ? parseInt(mesStr, 10) : agora.getMonth() + 1;

    const pad = (n: number) => String(n).padStart(2, '0');
    const inicioMes = `${ano}-${pad(mes)}-01`;
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const fimMes = `${ano}-${pad(mes)}-${pad(ultimoDia)}`;

    const rows = await this.db.query(`
      SELECT DISTINCT to_char(d::date, 'YYYY-MM-DD') AS data
        FROM reserva r,
             generate_series(r.data_hora_inicio::date, r.data_hora_fim::date, '1 day'::interval) d
       WHERE r.id_area_comum = $1
         AND r.status <> 'CANCELADA'
         AND d::date BETWEEN $2::date AND $3::date
      UNION
      SELECT DISTINCT to_char(d::date, 'YYYY-MM-DD') AS data
        FROM bloqueio_area b,
             generate_series(b.data_hora_inicio::date, b.data_hora_fim::date, '1 day'::interval) d
       WHERE b.id_area_comum = $1
         AND d::date BETWEEN $2::date AND $3::date
       ORDER BY data`,
      [area, inicioMes, fimMes]);

    return rows.map((r: any) => r.data);
  }

  /** UC02: grade de intervalos livres/ocupados de uma area em uma data. */
  @Get('disponibilidade')
  async disponibilidade(@Query('area', ParseIntPipe) area: number, @Query('data') data: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || ''))
      throw new BadRequestException('Informe a data no formato AAAA-MM-DD.');

    const [info] = await this.db.query(
      `SELECT * FROM area_comum WHERE id_area_comum = $1`, [area]);
    if (!info) throw new BadRequestException('Area comum inexistente.');
    if (info.requer_reserva === false) {
      throw new BadRequestException(`O espaço "${info.nome}" é de uso livre e não requer reserva prévia.`);
    }

    const diaSemana = DIAS[new Date(data + 'T12:00:00').getDay()];
    const janelas = await this.db.query(
      `SELECT hora_inicio, hora_fim FROM area_horario
        WHERE id_area_comum = $1 AND dia_semana = $2 ORDER BY hora_inicio`,
      [area, diaSemana]);

    const reservas = await this.db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM reserva
        WHERE id_area_comum = $1 AND status <> 'CANCELADA'
          AND data_hora_inicio::date = $2::date`, [area, data]);

    const bloqueios = await this.db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM bloqueio_area
        WHERE id_area_comum = $1
          AND $2::date BETWEEN data_hora_inicio::date AND data_hora_fim::date`,
      [area, data]);

    // monta a grade de slots em memoria
    const slots: any[] = [];
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');

    if (info.reserva_por_dia) {
      for (const j of janelas) {
        const hIni = String(j.hora_inicio).slice(0, 5);
        const hFim = String(j.hora_fim).slice(0, 5);
        const slotIniStr = `${data}T${hIni}:00`;
        const slotFimStr = `${data}T${hFim === '24:00' ? '23:59:59' : hFim + ':00'}`;
        const noPassado = slotIniStr <= agora;
        const ocupado = reservas.some(r => {
          const rIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
          const rFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
          return slotIniStr < rFim && slotFimStr > rIni;
        });
        const bloqueado = bloqueios.some(r => {
          const bIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
          const bFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
          return slotIniStr < bFim && slotFimStr > bIni;
        });
        const status = noPassado ? 'PASSADO' : bloqueado ? 'BLOQUEADO' : ocupado ? 'OCUPADO' : 'LIVRE';
        slots.push({ inicio: hIni, fim: hFim, status });
      }
    } else {
      const passo = info.duracao_slot_min;
      for (const j of janelas) {
        let [h, m] = String(j.hora_inicio).split(':').map(Number);
        const [hf, mf] = String(j.hora_fim).split(':').map(Number);
        let ini = h * 60 + m;
        const fim = (hf === 23 && mf === 59) ? 1440 : (hf * 60 + mf);
        while (ini + passo <= fim) {
          const hIni = `${String(Math.floor(ini / 60)).padStart(2, '0')}:${String(ini % 60).padStart(2, '0')}`;
          const fimSlot = ini + passo;
          const hFim = `${String(Math.floor(fimSlot / 60)).padStart(2, '0')}:${String(fimSlot % 60).padStart(2, '0')}`;
          const slotIniStr = `${data}T${hIni}:00`;
          const slotFimStr = `${data}T${hFim}:00`;
          const noPassado = slotIniStr <= agora;
          const ocupado = reservas.some(r => {
            const rIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
            const rFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
            return slotIniStr < rFim && slotFimStr > rIni;
          });
          const bloqueado = bloqueios.some(r => {
            const bIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
            const bFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
            return slotIniStr < bFim && slotFimStr > bIni;
          });
          const status = noPassado ? 'PASSADO' : bloqueado ? 'BLOQUEADO' : ocupado ? 'OCUPADO' : 'LIVRE';
          slots.push({ inicio: hIni, fim: hFim, status });
          ini = fimSlot;
        }
      }
    }
    return {
      area: { id_area_comum: info.id_area_comum, nome: info.nome, capacidade: info.capacidade, reserva_por_dia: Boolean(info.reserva_por_dia) },
      data, dia_semana: diaSemana,
      regras: {
        antecedencia_minima_dias: info.antecedencia_minima_dias,
        antecedencia_maxima_dias: info.antecedencia_maxima_dias,
        prazo_cancelamento_horas: info.prazo_cancelamento_horas,
        limite_reservas_semana: info.limite_reservas_semana,
        duracao_slot_min: info.duracao_slot_min,
        reserva_por_dia: Boolean(info.reserva_por_dia),
      },
      slots,
    };
  }

  /** UC03: registrar a reserva (gatilhos RN01 a RN07 validam no INSERT). */
  @Post() @Perfis('MORADOR')
  async criar(@Req() req: any, @Body() b: {
    id_area_comum: number; data: string; inicio: string; fim: string; numero_pessoas: number;
  }) {
    const [area] = await this.db.query(
      `SELECT nome, requer_reserva FROM area_comum WHERE id_area_comum = $1`,
      [b.id_area_comum]
    );
    if (!area) throw new BadRequestException('Área comum inexistente.');
    if (area.requer_reserva === false) {
      throw new BadRequestException(`O espaço "${area.nome}" é de uso livre e não necessita de reserva prévia.`);
    }

    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    const fimAjustado = (b.fim === '24:00') ? '23:59:59' : b.fim;
    return this.db.query(`
      INSERT INTO reserva (id_area_comum, id_perfil, data_hora_inicio, data_hora_fim, numero_pessoas)
      VALUES ($1,$2,($3 || ' ' || $4)::timestamp,($3 || ' ' || $5)::timestamp,$6)
      RETURNING id_reserva, status, data_hora_inicio, data_hora_fim`,
      [b.id_area_comum, idPerfil, b.data, b.inicio, fimAjustado, b.numero_pessoas])
      .then(r => r[0]);
  }

  /** Minhas reservas (morador autenticado). */
  @Get('minhas') @Perfis('MORADOR')
  async minhas(@Req() req: any) {
    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    await this.db.query(`
      UPDATE reserva
         SET status = 'CONCLUIDA'
       WHERE status = 'ATIVA'
         AND data_hora_fim < CURRENT_TIMESTAMP`);
    return this.db.query(`
      SELECT r.id_reserva, a.nome AS area, r.data_hora_inicio, r.data_hora_fim,
             r.numero_pessoas,
             CASE WHEN r.status = 'ATIVA' AND r.data_hora_fim < CURRENT_TIMESTAMP THEN 'CONCLUIDA'
                  ELSE r.status END AS status,
             a.prazo_cancelamento_horas
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
         AND data_hora_inicio > CURRENT_TIMESTAMP
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
