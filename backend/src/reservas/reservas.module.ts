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
  async disponibilidade(
    @Req() req: any,
    @Query('area', ParseIntPipe) area: number,
    @Query('data') data: string
  ) {
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
      `SELECT r.id_reserva, r.data_hora_inicio, r.data_hora_fim, r.numero_pessoas, pu.id_unidade
         FROM reserva r
         JOIN perfil pf ON pf.id_perfil = r.id_perfil
         LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
        WHERE r.id_area_comum = $1 AND r.status <> 'CANCELADA'
          AND r.data_hora_inicio::date = $2::date`, [area, data]);

    const bloqueios = await this.db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM bloqueio_area
        WHERE id_area_comum = $1
          AND $2::date BETWEEN data_hora_inicio::date AND data_hora_fim::date`,
      [area, data]);

    const idPessoa = req.user?.sub;
    const [minhaUnidadeRow] = await this.db.query(`
      SELECT pu.id_unidade
        FROM pessoa_unidade pu
       WHERE pu.id_pessoa = $1 AND pu.data_fim_ocupacao IS NULL
       LIMIT 1`, [idPessoa]);
    const idMinhaUnidade = minhaUnidadeRow?.id_unidade;

    const [penalidadeUsuario] = await this.db.query(`
      SELECT bp.id_bloqueio_perfil, bp.motivo, bp.descricao, bp.data_hora_inicio, bp.data_hora_fim
        FROM bloqueio_perfil bp
        JOIN perfil pf_b ON pf_b.id_perfil = bp.id_perfil
       WHERE pf_b.id_pessoa = $1
         AND (bp.id_area_comum IS NULL OR bp.id_area_comum = $2)
         AND bp.data_hora_inicio <= ($3 || ' 23:59:59')::timestamp
         AND (bp.data_hora_fim IS NULL OR bp.data_hora_fim >= ($3 || ' 00:00:00')::timestamp)
       LIMIT 1`,
      [idPessoa, area, data]);

    // monta a grade de slots em memoria
    const slots: any[] = [];
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
    const antMinHoras = Number(
      info.antecedencia_minima_horas !== null && info.antecedencia_minima_horas !== undefined
        ? info.antecedencia_minima_horas
        : (info.antecedencia_minima_dias ? info.antecedencia_minima_dias * 24 : 0)
    );

    const calcularStatusSlot = (slotIniStr: string, slotFimStr: string) => {
      if (penalidadeUsuario) {
        return {
          status: 'BLOQUEADO',
          motivo: `Acesso suspenso por penalidade (${penalidadeUsuario.motivo}${penalidadeUsuario.descricao ? ': ' + penalidadeUsuario.descricao : ''})`,
        };
      }
      const noPassado = slotIniStr <= agora;
      if (noPassado) {
        return { status: 'PASSADO', motivo: 'Horário já passou' };
      }

      const bloqueado = bloqueios.some(r => {
        const bIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
        const bFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
        return slotIniStr < bFim && slotFimStr > bIni;
      });
      if (bloqueado) {
        return { status: 'BLOQUEADO', motivo: 'Horário bloqueado pela administração' };
      }

      const reservasSlot = reservas.filter(r => {
        const rIni = new Date(r.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
        const rFim = new Date(r.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
        return slotIniStr < rFim && slotFimStr > rIni;
      });

      const usuarioJaReservou = Boolean(idMinhaUnidade && reservasSlot.some(r => r.id_unidade === idMinhaUnidade));
      const maxSimultaneas = Number(info.max_unidades_simultaneas || 1);
      const totalReservadas = reservasSlot.length;
      const unidadesRestantes = Math.max(0, maxSimultaneas - totalReservadas);

      const totalPessoasAgendadas = reservasSlot.reduce((acc: number, r: any) => acc + (Number(r.numero_pessoas) || 1), 0);
      const capacidadeTotal = Number(info.capacidade || 1);
      const pessoasRestantes = Math.max(0, capacidadeTotal - totalPessoasAgendadas);

      if (usuarioJaReservou) {
        return {
          status: 'JA_RESERVADO_POR_VOCE',
          motivo: 'Sua unidade já possui uma reserva ativa para este horário',
          vagas_totais: maxSimultaneas,
          vagas_ocupadas: totalReservadas,
          vagas_restantes: unidadesRestantes,
          capacidade_total: capacidadeTotal,
          pessoas_agendadas: totalPessoasAgendadas,
          pessoas_restantes: pessoasRestantes,
        };
      }

      if (pessoasRestantes === 0 && totalReservadas > 0) {
        return {
          status: 'OCUPADO',
          motivo: `Lotação máxima atingida (${totalPessoasAgendadas}/${capacidadeTotal} pessoas)`,
          vagas_totais: maxSimultaneas,
          vagas_ocupadas: totalReservadas,
          vagas_restantes: 0,
          capacidade_total: capacidadeTotal,
          pessoas_agendadas: totalPessoasAgendadas,
          pessoas_restantes: 0,
        };
      }

      if (unidadesRestantes === 0) {
        return {
          status: 'OCUPADO',
          motivo: `Limite de unidades simultâneas atingido (${totalReservadas}/${maxSimultaneas})`,
          vagas_totais: maxSimultaneas,
          vagas_ocupadas: totalReservadas,
          vagas_restantes: 0,
          capacidade_total: capacidadeTotal,
          pessoas_agendadas: totalPessoasAgendadas,
          pessoas_restantes: pessoasRestantes,
        };
      }

      if (antMinHoras > 0) {
        const diffHoras = (new Date(slotIniStr).getTime() - new Date(agora).getTime()) / (1000 * 60 * 60);
        if (diffHoras < antMinHoras) {
          const tempoTexto = antMinHoras < 24 ? `${antMinHoras}h` : `${Math.floor(antMinHoras / 24)}d`;
          return {
            status: 'ANTECEDENCIA_MINIMA',
            motivo: `Exige antecedência mínima de ${tempoTexto}`,
            vagas_totais: maxSimultaneas,
            vagas_ocupadas: totalReservadas,
            vagas_restantes: unidadesRestantes,
            capacidade_total: capacidadeTotal,
            pessoas_agendadas: totalPessoasAgendadas,
            pessoas_restantes: pessoasRestantes,
          };
        }
      }

      return {
        status: 'LIVRE',
        vagas_totais: maxSimultaneas,
        vagas_ocupadas: totalReservadas,
        vagas_restantes: unidadesRestantes,
        capacidade_total: capacidadeTotal,
        pessoas_agendadas: totalPessoasAgendadas,
        pessoas_restantes: pessoasRestantes,
      };
    };

    if (info.reserva_por_dia) {
      for (const j of janelas) {
        const hIni = String(j.hora_inicio).slice(0, 5);
        const hFim = String(j.hora_fim).slice(0, 5);
        const slotIniStr = `${data}T${hIni}:00`;
        const slotFimStr = `${data}T${(hFim === '24:00' || hFim === '23:59') ? '23:59:59' : hFim + ':00'}`;
        const resSlot = calcularStatusSlot(slotIniStr, slotFimStr);
        slots.push({ inicio: hIni, fim: hFim, ...resSlot });
      }
    } else {
      const passo = info.duracao_slot_min;
      for (const j of janelas) {
        let [h, m] = String(j.hora_inicio).split(':').map(Number);
        const [hf, mf] = String(j.hora_fim).split(':').map(Number);
        let ini = h * 60 + m;
        const fim = (hf === 23 && mf === 59) ? 1440 : (hf * 60 + mf);
        let gerouSlotJanela = false;
        while (ini + passo <= fim) {
          const hIni = `${String(Math.floor(ini / 60)).padStart(2, '0')}:${String(ini % 60).padStart(2, '0')}`;
          const fimSlot = ini + passo;
          const hFim = `${String(Math.floor(fimSlot / 60)).padStart(2, '0')}:${String(fimSlot % 60).padStart(2, '0')}`;
          const slotIniStr = `${data}T${hIni}:00`;
          const slotFimStr = `${data}T${hFim}:00`;
          const resSlot = calcularStatusSlot(slotIniStr, slotFimStr);
          slots.push({ inicio: hIni, fim: hFim, ...resSlot });
          ini = fimSlot;
          gerouSlotJanela = true;
        }

        // Se a janela configurada tem duração menor que o passo (ex: turno de 3h30 mas passo configurado em 4h),
        // emite o turno como 1 slot integral para não perder o horário configurado pelo condomínio.
        if (!gerouSlotJanela && fim > (h * 60 + m)) {
          const hIni = String(j.hora_inicio).slice(0, 5);
          const hFim = String(j.hora_fim).slice(0, 5);
          const slotIniStr = `${data}T${hIni}:00`;
          const slotFimStr = `${data}T${(hFim === '24:00' || hFim === '23:59') ? '23:59:59' : hFim + ':00'}`;
          const resSlot = calcularStatusSlot(slotIniStr, slotFimStr);
          slots.push({ inicio: hIni, fim: hFim, ...resSlot });
        }
      }
    }
    return {
      area: { id_area_comum: info.id_area_comum, nome: info.nome, capacidade: info.capacidade, reserva_por_dia: Boolean(info.reserva_por_dia) },
      data, dia_semana: diaSemana,
      bloqueio_usuario: penalidadeUsuario ? {
        bloqueado: true,
        motivo: penalidadeUsuario.motivo,
        descricao: penalidadeUsuario.descricao,
        data_hora_inicio: penalidadeUsuario.data_hora_inicio,
        data_hora_fim: penalidadeUsuario.data_hora_fim,
      } : null,
      regras: {
        antecedencia_minima_dias: info.antecedencia_minima_dias,
        antecedencia_minima_horas: antMinHoras,
        antecedencia_maxima_dias: info.antecedencia_maxima_dias,
        prazo_cancelamento_horas: info.prazo_cancelamento_horas,
        limite_reservas_semana: info.limite_reservas_semana,
        tipo_limite_reserva: info.tipo_limite_reserva || 'SEMANAL',
        max_unidades_simultaneas: Number(info.max_unidades_simultaneas || 1),
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

    const idPessoa = req.user?.sub;
    const [penalidade] = await this.db.query(`
      SELECT bp.motivo, bp.descricao
        FROM bloqueio_perfil bp
        JOIN perfil pf_b ON pf_b.id_perfil = bp.id_perfil
       WHERE pf_b.id_pessoa = $1
         AND (bp.id_area_comum IS NULL OR bp.id_area_comum = $2)
         AND ($3::timestamp) >= bp.data_hora_inicio
         AND (bp.data_hora_fim IS NULL OR ($3::timestamp) <= bp.data_hora_fim)
       LIMIT 1`,
      [idPessoa, b.id_area_comum, `${b.data} ${b.inicio}`]);
    if (penalidade) {
      throw new BadRequestException(
        `RN03: morador com acesso bloqueado para esta area comum por penalidade (${penalidade.motivo}${penalidade.descricao ? ': ' + penalidade.descricao : ''}).`
      );
    }

    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    const fimAjustado = (b.fim === '24:00' || b.fim === '23:59') ? '23:59:59' : b.fim;
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
