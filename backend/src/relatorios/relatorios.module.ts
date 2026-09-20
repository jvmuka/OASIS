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
            AND date_trunc('month', data_hora_inicio) = date_trunc('month', CURRENT_DATE)) AS reservas_mes,
        (SELECT COUNT(*) FROM encomenda WHERE status = 'AGUARDANDO_RETIRADA') AS encomendas_pendentes,
        (SELECT COUNT(*) FROM perfil
          WHERE tipo_perfil = 'MORADOR' AND (data_fim IS NULL OR data_fim > CURRENT_DATE)) AS moradores_ativos,
        (SELECT COUNT(*) FROM chave WHERE status = 'EMPRESTADA') AS chaves_emprestadas`);
    const areas = await this.db.query(`
      SELECT a.nome, COUNT(r.id_reserva) AS reservas
        FROM area_comum a
        LEFT JOIN reserva r ON r.id_area_comum = a.id_area_comum AND r.status <> 'CANCELADA'
       GROUP BY a.nome ORDER BY reservas DESC`);
    const recentes = await this.db.query(`
      SELECT p.nome, a.nome AS area, r.data_hora_inicio,
             CASE WHEN r.status = 'ATIVA' AND r.data_hora_fim < CURRENT_TIMESTAMP THEN 'CONCLUIDA'
                  ELSE r.status END AS status
        FROM reserva r
        JOIN area_comum a ON a.id_area_comum = r.id_area_comum
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       ORDER BY r.data_hora_criacao DESC LIMIT 8`);
    return { totais: tot, areas_mais_usadas: areas, reservas_recentes: recentes };
  }
}

@Module({ controllers: [RelatoriosController] })
export class RelatoriosModule {}
