import {
  Controller,
  Get,
  Module,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, resolverIdCondominio } from '../auth/guards';
import {
  RelatoriosPdfService,
  DadosRelatorioGeral,
  DadosRelatorioCobranca,
  ItemCobrancaArea,
} from './relatorios-pdf.service';

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

const ROTULOS_CATEGORIAS_CHAMADO: Record<string, string> = {
  'LIMPEZA': 'Limpeza & Higiene',
  'AVARIA_QUEBRADO': 'Avarias & Reparos',
  'MANUTENCAO': 'Manutenção Preventiva',
  'CONVIVENCIA_BARULHO': 'Convivência & Barulho',
  'OUTROS': 'Outras Demandas',
};

function mascararCpf(cpf?: string | null): string {
  if (!cpf) return '---';
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
}

function formatarDataBr(dataIso: string | Date): string {
  if (!dataIso) return '';
  const d = new Date(dataIso);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatarHoraBr(dataIso: string | Date): string {
  if (!dataIso) return '';
  const d = new Date(dataIso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

/**
 * UC13: Indicadores consolidados do painel administrativo (estilo Lettly) e relatórios PDF/CSV.
 */
@Controller('relatorios')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class RelatoriosController {
  constructor(
    private db: DbService,
    private pdfService: RelatoriosPdfService,
  ) {}

  /**
   * Helper privado para coletar os dados analíticos consolidados do mês com estrita regra de corte temporal.
   */
  private async obterDadosConsolidados(idCondominio: number, mesParam?: string) {
    // 1. Atualiza reservas passadas ativas para concluídas
    await this.db.query(`
      UPDATE reserva
         SET status = 'CONCLUIDA'
       WHERE status = 'ATIVA'
         AND data_hora_fim < CURRENT_TIMESTAMP`);

    // 2. Determina o mês de referência e data de corte
    const mesValido = mesParam && /^\d{4}-\d{2}$/.test(mesParam);
    const [mesAtualRow] = await this.db.query(`
      SELECT to_char(CURRENT_DATE, 'YYYY-MM') AS mes_atual,
             to_char(CURRENT_DATE, 'DD/MM/YYYY') AS hoje_br`);
    const mesAtualStr = mesAtualRow.mes_atual;
    const hojeBr = mesAtualRow.hoje_br;

    const mesAno = mesValido ? mesParam! : mesAtualStr;
    const dataRef = `${mesAno}-01`;
    const [anoStr, mesStr] = mesAno.split('-');
    const rotuloMesExtenso = `${MESES_EXTENSO[mesStr] || mesStr}/${anoStr}`;

    // Texto descritivo do período apurado para faturamento
    let periodoApuracaoTexto = '';
    if (mesAno === mesAtualStr) {
      periodoApuracaoTexto = `Período apurado: 01/${mesStr}/${anoStr} até ${hojeBr} (eventos realizados até a data presente)`;
    } else if (mesAno < mesAtualStr) {
      periodoApuracaoTexto = `Período apurado: 01/${mesStr}/${anoStr} até o fechamento da competência (mês integral)`;
    } else {
      periodoApuracaoTexto = `Competência futura: 01/${mesStr}/${anoStr} a 31/${mesStr}/${anoStr} (sem cobranças realizadas)`;
    }

    // 3. Informações do Condomínio
    const [condoRow] = await this.db.query(`
      SELECT id_condominio, nome, cnpj, endereco_completo, cidade, uf, telefone_contato, email_contato
        FROM condominio
       WHERE id_condominio = $1`, [idCondominio]);

    const condominioInfo = condoRow || {
      id_condominio: idCondominio,
      nome: 'Condomínio Residencial OASIS',
      cnpj: '12.345.678/0001-90',
      cidade: 'Ponta Grossa',
      uf: 'PR',
    };

    // 4. Lista dos meses disponíveis
    const mesesSeries = await this.db.query(`
      SELECT DISTINCT
             to_char(m, 'YYYY-MM') AS valor,
             to_char(m, 'MM') AS mes_num,
             to_char(m, 'YYYY') AS ano
        FROM (
          SELECT generate_series(
            date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
            date_trunc('month', CURRENT_DATE) + INTERVAL '3 months',
            '1 month'::interval
          ) AS m
          UNION
          SELECT DISTINCT date_trunc('month', data_hora_inicio) AS m FROM reserva WHERE data_hora_inicio IS NOT NULL
        ) u
       ORDER BY valor DESC`);

    const mesesDisponiveis = mesesSeries.map((row: any) => ({
      valor: row.valor,
      rotulo: `${MESES_EXTENSO[row.mes_num] || row.mes_num}/${row.ano}`,
    }));

    if (!mesesDisponiveis.some((m: any) => m.valor === mesAno)) {
      mesesDisponiveis.unshift({
        valor: mesAno,
        rotulo: rotuloMesExtenso,
      });
    }

    // 5. Totais operacionais do mês
    const [tot] = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM reserva r
           JOIN area_comum a ON a.id_area_comum = r.id_area_comum
          WHERE a.id_condominio = $2
            AND r.status <> 'CANCELADA'
            AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date))::int AS reservas_mes,
        (SELECT COUNT(*) FROM encomenda e
           JOIN pessoa p ON p.id_pessoa = e.id_pessoa_destinatario
           LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
           LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
           LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
          WHERE b.id_condominio = $2 AND e.status = 'AGUARDANDO_RETIRADA')::int AS encomendas_pendentes,
        (SELECT COUNT(*) FROM perfil
          WHERE (id_condominio = $2 OR id_condominio IS NULL)
            AND tipo_perfil = 'MORADOR'
            AND (data_fim IS NULL OR data_fim > CURRENT_DATE))::int AS moradores_ativos,
        (SELECT COUNT(*) FROM chave c
           JOIN area_comum a ON a.id_area_comum = c.id_area_comum
          WHERE a.id_condominio = $2 AND c.status = 'EMPRESTADA')::int AS chaves_emprestadas,
        (SELECT COUNT(*) FROM entrega_chave ec
           JOIN chave c ON c.id_chave = ec.id_chave
           JOIN area_comum a ON a.id_area_comum = c.id_area_comum
          WHERE a.id_condominio = $2 AND ec.data_hora_devolucao IS NULL AND ec.data_hora_retirada < CURRENT_TIMESTAMP - INTERVAL '24 hours')::int AS chaves_atrasadas,
        (SELECT COUNT(*) FROM unidade u
           JOIN bloco b ON b.id_bloco = u.id_bloco
          WHERE b.id_condominio = $2)::int AS total_unidades`, [dataRef, idCondominio]);

    // 6. Espelho Detalhado de Cobrança com REGRA ESTRITA DE CORTE:
    // Eventos futuros no mesmo mês NÃO são cobrados; somente eventos ocorridos até hoje (se mês atual)
    // ou o mês inteiro (se mês anterior).
    const cobrancaRaw = await this.db.query(`
      SELECT r.id_reserva,
             b.nome AS bloco,
             u.numero_apartamento AS apartamento,
             p.nome AS morador_nome,
             p.cpf AS morador_cpf,
             a.nome AS area_nome,
             r.data_hora_inicio,
             r.data_hora_fim,
             r.status,
             a.valor AS valor_taxa
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN LATERAL (
          SELECT pu_lat.id_unidade
            FROM pessoa_unidade pu_lat
           WHERE pu_lat.id_pessoa = p.id_pessoa
             AND pu_lat.data_fim_ocupacao IS NULL
           ORDER BY pu_lat.reside DESC, pu_lat.id_pessoa_unidade ASC
           LIMIT 1
        ) pu_fallback ON r.id_unidade IS NULL
        LEFT JOIN unidade u ON u.id_unidade = COALESCE(r.id_unidade, pu_fallback.id_unidade)
        LEFT JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE a.id_condominio = $2
         AND r.status <> 'CANCELADA'
         AND a.valor > 0
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
         AND r.data_hora_inicio <= (
           CASE 
             WHEN date_trunc('month', $1::date) = date_trunc('month', CURRENT_DATE) 
               THEN CURRENT_TIMESTAMP
             WHEN date_trunc('month', $1::date) < date_trunc('month', CURRENT_DATE) 
               THEN (date_trunc('month', $1::date) + INTERVAL '1 month')
             ELSE date_trunc('month', $1::date) - INTERVAL '1 day'
           END
         )
       ORDER BY b.nome ASC, u.numero_apartamento ASC, r.data_hora_inicio ASC`, [dataRef, idCondominio]);

    const cobrancaItens: ItemCobrancaArea[] = cobrancaRaw.map((item: any) => ({
      id_reserva: item.id_reserva,
      bloco: item.bloco || 'Sem Bloco',
      apartamento: item.apartamento || 'S/N',
      morador_nome: item.morador_nome || 'Morador Não Identificado',
      morador_cpf: mascararCpf(item.morador_cpf),
      area_nome: item.area_nome,
      data_evento: formatarDataBr(item.data_hora_inicio),
      horario_inicio: formatarHoraBr(item.data_hora_inicio),
      horario_fim: formatarHoraBr(item.data_hora_fim),
      status: item.status,
      valor_taxa: Number(item.valor_taxa || 0),
    }));

    // Total de unidades distintas com lançamentos faturáveis
    const unidadesImpactadasSet = new Set(
      cobrancaItens.map(i => `${i.bloco}-${i.apartamento}`)
    );
    const totalUnidadesTaxadas = unidadesImpactadasSet.size;

    // Receita faturável (eventos já ocorridos até o corte)
    const receitaFaturavel = cobrancaItens.reduce(
      (acc, item) => acc + Number(item.valor_taxa || 0),
      0,
    );

    // Receita prevista de reservas futuras no restante do mês
    const [finFuturoMes] = await this.db.query(`
      SELECT COALESCE(SUM(a.valor), 0)::numeric AS receita_prevista_restante
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE a.id_condominio = $2
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
         AND r.data_hora_inicio > CURRENT_TIMESTAMP`, [dataRef, idCondominio]);

    const receitaFuturaRestante = Number(finFuturoMes?.receita_prevista_restante || 0);

    // Receita do mês anterior para variação percentual
    const [finAnterior] = await this.db.query(`
      SELECT COALESCE(SUM(a.valor), 0)::numeric AS receita_anterior
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE a.id_condominio = $2
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date - INTERVAL '1 month')`, [dataRef, idCondominio]);

    const recAnterior = Number(finAnterior?.receita_anterior || 0);
    const variacaoPct = recAnterior > 0
      ? Number((((receitaFaturavel - recAnterior) / recAnterior) * 100).toFixed(1))
      : 0;

    const financeiro = {
      receita_mes_atual: receitaFaturavel,
      receita_faturavel: receitaFaturavel,
      receita_prevista_futura: receitaFuturaRestante,
      receita_total_mes: receitaFaturavel + receitaFuturaRestante,
      receita_mes_anterior: recAnterior,
      variacao_receita_pct: variacaoPct,
      receita_concluida: receitaFaturavel,
      receita_pendente: receitaFuturaRestante,
      total_unidades_taxadas: totalUnidadesTaxadas,
    };

    // 7. Métricas de Chamados & Ocorrências
    const [chamadosResumo] = await this.db.query(`
      SELECT
        COUNT(*)::int AS total_mes,
        COUNT(CASE WHEN status = 'REALIZADA' THEN 1 END)::int AS resolvidos,
        COUNT(CASE WHEN status = 'EM_ANDAMENTO' THEN 1 END)::int AS em_andamento,
        COUNT(CASE WHEN status = 'EM_ANALISE' THEN 1 END)::int AS em_analise,
        COALESCE(
          AVG(
            CASE WHEN status = 'REALIZADA' AND data_hora_fechamento IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (data_hora_fechamento - data_hora_abertura)) / 3600
                 ELSE NULL END
          ), 0
        )::numeric AS tempo_medio_horas
      FROM chamado
     WHERE (id_condominio = $2 OR id_condominio IS NULL)
       AND date_trunc('month', data_hora_abertura) = date_trunc('month', $1::date)`, [dataRef, idCondominio]);

    const totalChamados = Number(chamadosResumo?.total_mes || 0);
    const resolvidosChamados = Number(chamadosResumo?.resolvidos || 0);
    const taxaResolucao = totalChamados > 0
      ? Number(((resolvidosChamados / totalChamados) * 100).toFixed(1))
      : 100;

    const categoriasRaw = await this.db.query(`
      SELECT categoria, COUNT(*)::int AS total
        FROM chamado
       WHERE (id_condominio = $2 OR id_condominio IS NULL)
         AND date_trunc('month', data_hora_abertura) = date_trunc('month', $1::date)
       GROUP BY categoria
       ORDER BY total DESC`, [dataRef, idCondominio]);

    const categoriasChamado = (categoriasRaw || []).map((c: any) => ({
      categoria: c.categoria,
      rotulo: ROTULOS_CATEGORIAS_CHAMADO[c.categoria] || c.categoria,
      total: Number(c.total || 0),
      pct: totalChamados > 0 ? Number(((Number(c.total) / totalChamados) * 100).toFixed(1)) : 0,
    }));

    const chamados = {
      total_mes: totalChamados,
      resolvidos: resolvidosChamados,
      pendentes: Number(chamadosResumo?.em_andamento || 0) + Number(chamadosResumo?.em_analise || 0),
      em_andamento: Number(chamadosResumo?.em_andamento || 0),
      em_analise: Number(chamadosResumo?.em_analise || 0),
      taxa_resolucao_pct: taxaResolucao,
      tempo_medio_resolucao_horas: Number(Number(chamadosResumo?.tempo_medio_horas || 0).toFixed(1)),
      categorias: categoriasChamado,
    };

    // 8. Ocupação e Horas Reservadas
    const [ocupacaoRow] = await this.db.query(`
      SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (r.data_hora_fim - r.data_hora_inicio)) / 3600), 0)::numeric AS horas_totais,
             COUNT(DISTINCT r.data_hora_inicio::date)::int AS dias_com_reserva
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE a.id_condominio = $2
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)`, [dataRef, idCondominio]);

    const ocupacao = {
      horas_totais_reservadas: Number(Number(ocupacaoRow?.horas_totais || 0).toFixed(1)),
      dias_com_reserva: Number(ocupacaoRow?.dias_com_reserva || 0),
    };

    // 9. Série Multi-Mês (Últimos 6 meses: Reservas, Receita R$ e Chamados)
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
             to_char(m.mes, 'YYYY') AS ano,
             COUNT(DISTINCT r.id_reserva)::int AS total_reservas,
             COALESCE(SUM(a.valor), 0)::numeric AS receita_total,
             (
               SELECT COUNT(*)::int
                 FROM chamado c
                WHERE (c.id_condominio = $2 OR c.id_condominio IS NULL)
                  AND date_trunc('month', c.data_hora_abertura) = m.mes
             ) AS chamados_abertos
        FROM meses m
        LEFT JOIN (
          reserva r JOIN area_comum a ON a.id_area_comum = r.id_area_comum AND a.id_condominio = $2 AND r.status <> 'CANCELADA'
        ) ON date_trunc('month', r.data_hora_inicio) = m.mes
       GROUP BY m.mes
       ORDER BY m.mes ASC`, [dataRef, idCondominio]);

    const evolucao = evolucaoRaw.map((row: any) => ({
      mes_chave: row.mes_chave,
      mes_rotulo: MESES_ABREV[row.mes_num] || row.mes_num,
      ano: row.ano,
      total: Number(row.total_reservas || 0),
      total_reservas: Number(row.total_reservas || 0),
      receita_total: Number(row.receita_total || 0),
      chamados_abertos: Number(row.chamados_abertos || 0),
    }));

    // 10. Projeção Futura (Próximos 3 meses com base em agendamentos já confirmados)
    const projecaoRaw = await this.db.query(`
      WITH meses_futuros AS (
        SELECT generate_series(
          date_trunc('month', $1::date) + INTERVAL '1 month',
          date_trunc('month', $1::date) + INTERVAL '3 months',
          '1 month'::interval
        ) AS mes
      )
      SELECT to_char(m.mes, 'YYYY-MM') AS mes_chave,
             to_char(m.mes, 'MM') AS mes_num,
             to_char(m.mes, 'YYYY') AS ano,
             COUNT(r.id_reserva)::int AS reservas_agendadas,
             COALESCE(SUM(a.valor), 0)::numeric AS receita_prevista
        FROM meses_futuros m
        LEFT JOIN (
          reserva r JOIN area_comum a ON a.id_area_comum = r.id_area_comum AND a.id_condominio = $2 AND r.status = 'ATIVA'
        ) ON date_trunc('month', r.data_hora_inicio) = m.mes
       GROUP BY m.mes
       ORDER BY m.mes ASC`, [dataRef, idCondominio]);

    const projecaoFutura = projecaoRaw.map((row: any) => ({
      mes_chave: row.mes_chave,
      mes_rotulo: `${MESES_ABREV[row.mes_num] || row.mes_num}/${row.ano}`,
      reservas_agendadas: Number(row.reservas_agendadas || 0),
      receita_prevista: Number(row.receita_prevista || 0),
    }));

    // 11. Áreas Comuns e Desempenho no Mês
    const areas = await this.db.query(`
      SELECT a.id_area_comum,
             a.nome,
             a.capacidade,
             a.valor AS valor_unitario,
             COUNT(r.id_reserva)::int AS reservas,
             COALESCE(SUM(EXTRACT(EPOCH FROM (r.data_hora_fim - r.data_hora_inicio)) / 3600), 0)::numeric AS horas_totais,
             COALESCE(SUM(a.valor), 0)::numeric AS receita_total
        FROM area_comum a
        LEFT JOIN reserva r 
          ON r.id_area_comum = a.id_area_comum 
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
       WHERE a.id_condominio = $2 AND a.ativo = TRUE
       GROUP BY a.id_area_comum, a.nome, a.capacidade, a.valor
       ORDER BY reservas DESC, receita_total DESC, a.nome ASC`, [dataRef, idCondominio]);

    const areasMapeadas = areas.map((a: any) => ({
      id_area_comum: a.id_area_comum,
      nome: a.nome,
      capacidade: Number(a.capacidade || 0),
      reservas: Number(a.reservas || 0),
      horas_totais: Number(Number(a.horas_totais || 0).toFixed(1)),
      valor_unitario: Number(a.valor_unitario || 0),
      receita_total: Number(a.receita_total || 0),
    }));

    // 12. Top Unidades com base nos eventos já ocorridos / faturáveis
    const topUnidadesRaw = await this.db.query(`
      SELECT b.nome AS bloco,
             u.numero_apartamento AS apartamento,
             p.nome AS morador,
             p.cpf,
             COUNT(r.id_reserva)::int AS total_reservas,
             COALESCE(SUM(a.valor), 0)::numeric AS total_taxas
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN LATERAL (
          SELECT pu_lat.id_unidade
            FROM pessoa_unidade pu_lat
           WHERE pu_lat.id_pessoa = p.id_pessoa
             AND pu_lat.data_fim_ocupacao IS NULL
           ORDER BY pu_lat.reside DESC, pu_lat.id_pessoa_unidade ASC
           LIMIT 1
        ) pu_fallback ON r.id_unidade IS NULL
        JOIN unidade u ON u.id_unidade = COALESCE(r.id_unidade, pu_fallback.id_unidade)
        JOIN bloco b ON b.id_bloco = u.id_bloco
       WHERE a.id_condominio = $2
         AND r.status <> 'CANCELADA'
         AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
         AND r.data_hora_inicio <= (
           CASE 
             WHEN date_trunc('month', $1::date) = date_trunc('month', CURRENT_DATE) 
               THEN CURRENT_TIMESTAMP
             WHEN date_trunc('month', $1::date) < date_trunc('month', CURRENT_DATE) 
               THEN (date_trunc('month', $1::date) + INTERVAL '1 month')
             ELSE date_trunc('month', $1::date) - INTERVAL '1 day'
           END
         )
       GROUP BY b.nome, u.numero_apartamento, p.nome, p.cpf
       ORDER BY total_taxas DESC, total_reservas DESC
       LIMIT 10`, [dataRef, idCondominio]);

    const topUnidades = topUnidadesRaw.map((u: any) => ({
      bloco: u.bloco,
      apartamento: u.apartamento,
      morador: u.morador,
      morador_cpf: mascararCpf(u.cpf),
      total_reservas: Number(u.total_reservas || 0),
      total_taxas: Number(u.total_taxas || 0),
    }));

    // 13. Status das Reservas no Mês
    const statusReservasRaw = await this.db.query(`
      SELECT r.status, COUNT(*)::int AS total
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
       WHERE a.id_condominio = $2 AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
       GROUP BY r.status`, [dataRef, idCondominio]);

    const mapaStatus: Record<string, number> = { ATIVA: 0, CONCLUIDA: 0, CANCELADA: 0 };
    for (const r of statusReservasRaw) {
      mapaStatus[r.status] = Number(r.total || 0);
    }
    const statusReservas = [
      { status: 'ATIVA', total: mapaStatus.ATIVA },
      { status: 'CONCLUIDA', total: mapaStatus.CONCLUIDA },
      { status: 'CANCELADA', total: mapaStatus.CANCELADA },
    ];

    // 14. Reservas Recentes do Mês
    const recentes = await this.db.query(`
      SELECT r.id_reserva,
             p.nome,
             a.nome AS area,
             a.valor AS taxa,
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
       WHERE a.id_condominio = $2 AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', $1::date)
       ORDER BY r.data_hora_inicio DESC
       LIMIT 50`, [dataRef, idCondominio]);

    return {
      condominio: condominioInfo,
      mes_selecionado: mesAno,
      mes_rotulo: rotuloMesExtenso,
      periodo_apuracao: periodoApuracaoTexto,
      meses_disponiveis: mesesDisponiveis,
      totais: tot,
      financeiro,
      chamados,
      ocupacao,
      evolucao_mensal: evolucao,
      projecao_futura: projecaoFutura,
      areas_mais_usadas: areasMapeadas,
      top_unidades: topUnidades,
      cobranca_detalhada: cobrancaItens,
      status_reservas: statusReservas,
      reservas_recentes: recentes,
    };
  }

  /**
   * UC13: Painel consolidado com suporte a filtros mensais, métricas de financeiro e operação.
   */
  @Get('painel')
  @Perfis('SINDICO')
  async painel(@Req() req: any, @Query('mes') mesParam?: string) {
    const idCondominio = resolverIdCondominio(req);
    return this.obterDadosConsolidados(idCondominio, mesParam);
  }

  /**
   * UC13: Emite o Relatório Mensal Geral Consolidado em PDF para download ou visualização.
   */
  @Get('pdf/geral')
  @Perfis('SINDICO')
  async relatorioGeralPdf(
    @Req() req: any,
    @Res() res: Response,
    @Query('mes') mesParam?: string,
  ) {
    const idCondominio = resolverIdCondominio(req);
    const dados = await this.obterDadosConsolidados(idCondominio, mesParam);

    const payload: DadosRelatorioGeral = {
      condominio: dados.condominio,
      mes_rotulo: dados.mes_rotulo,
      mes_chave: dados.mes_selecionado,
      periodo_apuracao: dados.periodo_apuracao,
      data_emissao: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      usuario_emissor: req.user?.nome || 'Administração OASIS',
      totais: {
        receita_mes_atual: dados.financeiro.receita_faturavel,
        variacao_receita_pct: dados.financeiro.variacao_receita_pct,
        reservas_mes: Number(dados.totais.reservas_mes || 0),
        moradores_ativos: Number(dados.totais.moradores_ativos || 0),
        encomendas_pendentes: Number(dados.totais.encomendas_pendentes || 0),
        chaves_emprestadas: Number(dados.totais.chaves_emprestadas || 0),
        chaves_atrasadas: Number(dados.totais.chaves_atrasadas || 0),
        total_unidades: Number(dados.totais.total_unidades || 0),
      },
      chamados: {
        total_mes: dados.chamados.total_mes,
        resolvidos: dados.chamados.resolvidos,
        pendentes: dados.chamados.pendentes,
        taxa_resolucao_pct: dados.chamados.taxa_resolucao_pct,
        tempo_medio_resolucao_horas: dados.chamados.tempo_medio_resolucao_horas,
        categorias: dados.chamados.categorias,
      },
      areas: dados.areas_mais_usadas,
      top_unidades: dados.top_unidades,
    };

    const pdfBuffer = await this.pdfService.gerarPdfGeral(payload);
    const nomeArquivo = `relatorio-mensal-oasis-${dados.mes_selecionado}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomeArquivo}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  /**
   * UC13: Emite o Demonstrativo de Cobrança de Áreas Comuns em PDF (para faturamento/boleto).
   */
  @Get('pdf/cobranca-areas')
  @Perfis('SINDICO')
  async cobrancaAreasPdf(
    @Req() req: any,
    @Res() res: Response,
    @Query('mes') mesParam?: string,
  ) {
    const idCondominio = resolverIdCondominio(req);
    const dados = await this.obterDadosConsolidados(idCondominio, mesParam);

    const totalGeral = dados.cobranca_detalhada.reduce(
      (acc, item) => acc + Number(item.valor_taxa || 0),
      0,
    );

    const unidadesImpactadas = new Set(
      dados.cobranca_detalhada.map(i => `${i.bloco}-${i.apartamento}`)
    ).size;

    const payload: DadosRelatorioCobranca = {
      condominio: dados.condominio,
      mes_rotulo: dados.mes_rotulo,
      mes_chave: dados.mes_selecionado,
      periodo_apuracao: dados.periodo_apuracao,
      data_emissao: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      usuario_emissor: req.user?.nome || 'Administração OASIS',
      total_geral: totalGeral,
      total_reservas: dados.cobranca_detalhada.length,
      total_unidades: unidadesImpactadas,
      itens: dados.cobranca_detalhada,
    };

    const pdfBuffer = await this.pdfService.gerarPdfCobrancaAreas(payload);
    const nomeArquivo = `cobranca-taxas-areas-${dados.mes_selecionado}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nomeArquivo}"`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }

  /**
   * UC13: Exporta o espelho de cobrança em formato CSV para importação na contabilidade / administradora.
   */
  @Get('csv/cobranca-areas')
  @Perfis('SINDICO')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async cobrancaAreasCsv(
    @Req() req: any,
    @Res() res: Response,
    @Query('mes') mesParam?: string,
  ) {
    const idCondominio = resolverIdCondominio(req);
    const dados = await this.obterDadosConsolidados(idCondominio, mesParam);

    const totalGeral = dados.cobranca_detalhada.reduce(
      (acc, item) => acc + Number(item.valor_taxa || 0),
      0,
    );

    const unidadesImpactadas = new Set(
      dados.cobranca_detalhada.map(i => `${i.bloco}-${i.apartamento}`)
    ).size;

    const payload: DadosRelatorioCobranca = {
      condominio: dados.condominio,
      mes_rotulo: dados.mes_rotulo,
      mes_chave: dados.mes_selecionado,
      periodo_apuracao: dados.periodo_apuracao,
      data_emissao: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      usuario_emissor: req.user?.nome || 'Administração OASIS',
      total_geral: totalGeral,
      total_reservas: dados.cobranca_detalhada.length,
      total_unidades: unidadesImpactadas,
      itens: dados.cobranca_detalhada,
    };

    const csvContent = this.pdfService.gerarCsvCobrancaAreas(payload);
    const nomeArquivo = `cobranca-taxas-areas-${dados.mes_selecionado}.csv`;

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
    });

    res.send(csvContent);
  }
}

@Module({
  controllers: [RelatoriosController],
  providers: [RelatoriosPdfService],
  exports: [RelatoriosPdfService],
})
export class RelatoriosModule {}
