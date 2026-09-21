import { Controller, Get, Module, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis } from '../auth/guards';

const MESES_ABREV: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

const MESES_EXTENSO: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

/** UC13: indicadores consolidados do painel administrativo com suporte a filtro mensal. */
@Controller('relatorios')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class RelatoriosController {
  constructor(private db: DbService) {}

  @Get('painel') @Perfis('SINDICO')
  async painel(@Query('mes') mesParam?: string) {
    await this.db.query(`
      UPDATE reserva
         SET status = 'CONCLUIDA'
       WHERE status = 'ATIVA'
         AND data_hora_fim < CURRENT_TIMESTAMP`);

    // Valida o mês informado ou assume o mês atual
    const mesValido = mesParam && /^\d{4}-\d{2}$/.test(mesParam);
    const [mesAtualRow] = await this.db.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS mes_atual`);
    const mesAno = mesValido ? mesParam! : mesAtualRow.mes_atual;
    const dataRef = `${mesAno}-01`;

    // Gera lista dos últimos 12 meses para o seletor do usuário
    const mesesSeries = await this.db.query(`
      SELECT to_char(m, 'YYYY-MM') AS valor,
             to_char(m, 'MM') AS mes_num,
             to_char(m, 'YYYY') AS ano
        FROM generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
          date_trunc('month', CURRENT_DATE),
          '1 month'::interval
        ) m
       ORDER BY m DESC`);

    const mesesDisponiveis = mesesSeries.map((row: any) => ({
      valor: row.valor,
      rotulo: `${MESES_EXTENSO[row.mes_num] || row.mes_num}/${row.ano}`,
    }));

    // Se o mês selecionado não estiver na lista (ex: futuro ou muito antigo), adiciona no topo
    if (!mesesDisponiveis.some((m: any) => m.valor === mesAno)) {
      const [ano, mesNum] = mesAno.split('-');
      mesesDisponiveis.unshift({
        valor: mesAno,
        rotulo: `${MESES_EXTENSO[mesNum] || mesNum}/${ano}`,
      });
    }

    // Totais com filtro no mês de referência
    const [tot] = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM reserva
          WHERE status <> 'CANCELADA'
            AND date_trunc('month', data_hora_inicio) = date_trunc('month', $1::date))::int AS reservas_mes,
        (SELECT COUNT(*) FROM encomenda WHERE status = 'AGUARDANDO_RETIRADA')::int AS encomendas_pendentes,
        (SELECT COUNT(*) FROM perfil
          WHERE tipo_perfil = 'MORADOR' AND (data_fim IS NULL OR data_fim > CURRENT_DATE))::int AS moradores_ativos,
        (SELECT COUNT(*) FROM chave WHERE status = 'EMPRESTADA')::int AS chaves_emprestadas,
        (SELECT COUNT(*) FROM unidade)::int AS total_unidades`, [dataRef]);

    // Série de 6 meses até o mês de referência
    const evolucaoRaw = await this.db.query(`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', $1::date) - INTERVAL '5 months',
          date_trunc('month', $1::date),
          '1 month'::interval
        ) AS mes
      )
      SELECT to_char(m.mes, 'YYYY-MM') AS mes_chave,
             to_char(m.mes, 'MM') AS mes_num,
             COUNT(r.id_reserva)::int AS total
        FROM meses m
        LEFT JOIN reserva r 
          ON date_trunc('month', r.data_hora_inicio) = m.mes
         AND r.status <> 'CANCELADA'
       GROUP BY m.mes
       ORDER BY m.mes ASC`, [dataRef]);

    const evolucao = evolucaoRaw.map((row: any) => ({
      mes_chave: row.mes_chave,
      mes_rotulo: MESES_ABREV[row.mes_num] || row.mes_num,
      total: Number(row.total || 0),
    }));

    // Status das reservas estritamente no mês de referência
    const statusReservasRaw = await this.db.query(`
      SELECT status, COUNT(*)::int AS total
        FROM reserva
       WHERE date_trunc('month', data_hora_inicio) = date_trunc('month', $1::date)
       GROUP BY status`, [dataRef]);

    const mapaStatus: Record<string, number> = { ATIVA: 0, CONCLUIDA: 0, CANCELADA: 0 };
    for (const r of statusReservasRaw) {
      mapaStatus[r.status] = Number(r.total || 0);
    }
    const statusReservas = [
      { status: 'ATIVA', total: mapaStatus.ATIVA },
      { status: 'CONCLUIDA', total: mapaStatus.CONCLUIDA },
      { status: 'CANCELADA', total: mapaStatus.CANCELADA },
    ];

    // Áreas mais utilizadas no mês selecionado
    const areas = await this.db.query(`
      SELECT a.id_area_comum,
             a.nome,
             COUNT(r.id_reserva)::int AS reservas
        FROM area_comum a
        LEFT JOIN reserva r 
          ON r.id_area_comum = a.id_area_comum 
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
       GROUP BY a.id_area_comum, a.nome
       ORDER BY reservas DESC, a.nome ASC`, [dataRef]);

    // Agendamentos detalhados estritamente do mês selecionado
    const recentes = await this.db.query(`
      SELECT r.id_reserva,
             p.nome,
             a.nome AS area,
             r.data_hora_inicio,
             r.data_hora_fim,
             r.status,
             (
               SELECT string_agg(DISTINCT u.numero_apartamento || ' (' || b.nome || ')', ', ')
                 FROM pessoa_unidade pu
                 JOIN unidade u ON u.id_unidade = pu.id_unidade
                 JOIN bloco b ON b.id_bloco = u.id_bloco
                WHERE pu.id_pessoa = p.id_pessoa AND pu.reside = TRUE
             ) AS unidade
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       WHERE date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
       ORDER BY r.data_hora_inicio DESC
       LIMIT 50`, [dataRef]);

    return {
      mes_selecionado: mesAno,
      meses_disponiveis: mesesDisponiveis,
      totais: tot,
      evolucao_mensal: evolucao,
      status_reservas: statusReservas,
      areas_mais_usadas: areas,
      reservas_recentes: recentes,
    };
  }
}

@Module({ controllers: [RelatoriosController] })
export class RelatoriosModule {}

