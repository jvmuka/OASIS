import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis } from '../auth/guards';

/** UC13: indicadores consolidados do painel administrativo. */
@Controller('relatorios')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class RelatoriosController {
  constructor(private db: DbService) {}

  @Get('painel') @Perfis('SINDICO')
  async painel() {
    await this.db.query(`
      UPDATE reserva
         SET status = 'CONCLUIDA'
       WHERE status = 'ATIVA'
         AND data_hora_fim < CURRENT_TIMESTAMP`);

    const [tot] = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM reserva
          WHERE status <> 'CANCELADA'
            AND date_trunc('month', data_hora_inicio) = date_trunc('month', CURRENT_DATE))::int AS reservas_mes,
        (SELECT COUNT(*) FROM encomenda WHERE status = 'AGUARDANDO_RETIRADA')::int AS encomendas_pendentes,
        (SELECT COUNT(*) FROM perfil
          WHERE tipo_perfil = 'MORADOR' AND (data_fim IS NULL OR data_fim > CURRENT_DATE))::int AS moradores_ativos,
        (SELECT COUNT(*) FROM chave WHERE status = 'EMPRESTADA')::int AS chaves_emprestadas,
        (SELECT COUNT(*) FROM unidade)::int AS total_unidades`);

    const mesesNomes: Record<string, string> = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
      '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    };

    const evolucaoRaw = await this.db.query(`
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
          date_trunc('month', CURRENT_DATE),
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
       ORDER BY m.mes ASC`);

    const evolucao = evolucaoRaw.map((row: any) => ({
      mes_chave: row.mes_chave,
      mes_rotulo: mesesNomes[row.mes_num] || row.mes_num,
      total: Number(row.total || 0),
    }));

    const statusReservas = await this.db.query(`
      SELECT status, COUNT(*)::int AS total
        FROM reserva
       GROUP BY status`);

    const areas = await this.db.query(`
      SELECT a.id_area_comum,
             a.nome,
             COUNT(r.id_reserva)::int AS reservas
        FROM area_comum a
        LEFT JOIN reserva r ON r.id_area_comum = a.id_area_comum AND r.status <> 'CANCELADA'
       GROUP BY a.id_area_comum, a.nome
       ORDER BY reservas DESC, a.nome ASC`);

    const recentes = await this.db.query(`
      SELECT r.id_reserva,
             p.nome,
             a.nome AS area,
             r.data_hora_inicio,
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
       ORDER BY r.data_hora_criacao DESC
       LIMIT 6`);

    return {
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
