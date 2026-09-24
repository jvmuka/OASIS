import { Controller, Get, Post, Delete, Patch, Body, Param, Module, UseGuards, Req, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';

/**
 * UC05 (visualizar/ler) e UC10 (publicar).
 * RN13 distribui o aviso do mural; RN14 grava a data da leitura.
 */
@Controller('avisos')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class AvisosController {
  constructor(private db: DbService) {}

  /** Listagem completa de avisos gerenciados pelo síndico (publicados, agendados e expirados). */
  @Get()
  @Perfis('SINDICO')
  listarTodos() {
    return this.db.query(`
      SELECT a.id_aviso, a.titulo, a.conteudo, a.escopo, a.fixado,
             a.data_hora_publicacao, a.data_hora_expiracao,
             p.nome AS autor,
             CASE
               WHEN a.escopo = 'INDIVIDUAL' OR a.titulo ILIKE '%encomenda%' THEN 'ENCOMENDA'
               ELSE 'ADMINISTRADOR'
             END AS categoria,
             CASE
               WHEN a.escopo = 'INDIVIDUAL' THEN (
                 SELECT p_dest.nome
                   FROM aviso_perfil ap_dest
                   JOIN perfil pf_dest ON pf_dest.id_perfil = ap_dest.id_perfil
                   JOIN pessoa p_dest ON p_dest.id_pessoa = pf_dest.id_pessoa
                  WHERE ap_dest.id_aviso = a.id_aviso
                  LIMIT 1
               )
               ELSE 'Todos os Moradores'
             END AS destinatario_nome,
             CASE
               WHEN a.escopo = 'INDIVIDUAL' THEN (
                 SELECT CONCAT('Bloco ', b.nome, ' - Ap ', u.numero_apartamento)
                   FROM aviso_perfil ap_dest
                   JOIN perfil pf_dest ON pf_dest.id_perfil = ap_dest.id_perfil
                   JOIN pessoa_unidade pu ON pu.id_pessoa = pf_dest.id_pessoa AND pu.data_fim_ocupacao IS NULL
                   JOIN unidade u ON u.id_unidade = pu.id_unidade
                   JOIN bloco b ON b.id_bloco = u.id_bloco
                  WHERE ap_dest.id_aviso = a.id_aviso
                  LIMIT 1
               )
               ELSE 'Condomínio Completo'
             END AS destinatario_unidade,
             CASE
               WHEN a.data_hora_publicacao > CURRENT_TIMESTAMP THEN 'AGENDADO'
               WHEN a.data_hora_expiracao IS NOT NULL AND a.data_hora_expiracao <= CURRENT_TIMESTAMP THEN 'EXPIRADO'
               ELSE 'PUBLICADO'
             END AS status,
             (SELECT COUNT(*) FROM aviso_perfil ap WHERE ap.id_aviso = a.id_aviso) AS total_destinatarios,
             (SELECT COUNT(*) FROM aviso_perfil ap WHERE ap.id_aviso = a.id_aviso AND ap.lido = TRUE) AS total_lidos
        FROM aviso a
        JOIN perfil pf ON pf.id_perfil = a.id_perfil_autor
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       ORDER BY a.fixado DESC, a.data_hora_publicacao DESC`);
  }

  /** Mural do usuário logado: apenas avisos cuja data de publicação já chegou e que não expiraram. */
  @Get('meus')
  meus(@Req() req: any) {
    const idsPerfis: number[] = (req.user?.perfis || []).map((p: any) => p.id_perfil);
    if (!idsPerfis.length) return [];
    const tipos: string[] = (req.user?.perfis || []).map((p: any) => p.tipo);
    const temMorador = tipos.includes('MORADOR');

    return this.db.query(`
      SELECT DISTINCT ON (a.id_aviso)
             COALESCE(ap.id_aviso_perfil, 0) AS id_aviso_perfil,
             a.id_aviso, a.titulo, a.conteudo, a.escopo,
             a.fixado, a.data_hora_publicacao,
             COALESCE(ap.lido, FALSE) AS lido,
             ap.data_hora_leitura,
             p.nome AS autor,
             CASE
               WHEN a.escopo = 'INDIVIDUAL' OR a.titulo ILIKE '%encomenda%' THEN 'ENCOMENDA'
               ELSE 'ADMINISTRADOR'
             END AS categoria
        FROM aviso a
        JOIN perfil pf ON pf.id_perfil = a.id_perfil_autor
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN aviso_perfil ap ON ap.id_aviso = a.id_aviso AND ap.id_perfil = ANY($1::int[])
       WHERE (
             a.escopo = 'MURAL'
          OR ap.id_perfil = ANY($1::int[])
          OR a.id_perfil_autor = ANY($1::int[])
       )
         AND (
           $2 = TRUE OR (a.escopo <> 'INDIVIDUAL' AND a.titulo NOT ILIKE '%encomenda%')
         )
         AND a.data_hora_publicacao <= CURRENT_TIMESTAMP
         AND (a.data_hora_expiracao IS NULL OR a.data_hora_expiracao > CURRENT_TIMESTAMP)
       ORDER BY a.id_aviso, a.fixado DESC, a.data_hora_publicacao DESC`, [idsPerfis, temMorador])
      .then(rows => rows.sort((x, y) => {
        if (x.fixado !== y.fixado) return x.fixado ? -1 : 1;
        return new Date(y.data_hora_publicacao).getTime() - new Date(x.data_hora_publicacao).getTime();
      }));
  }

  @Patch(':id/lido')
  async marcarLido(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const idsPerfis: number[] = (req.user?.perfis || []).map((p: any) => p.id_perfil);
    if (!idsPerfis.length) throw new BadRequestException('Perfil não encontrado.');

    // 1. Tenta atualizar caso o id fornecido seja id_aviso_perfil ou id_aviso existente
    const r = await this.db.query(`
      UPDATE aviso_perfil SET lido = TRUE, data_hora_leitura = COALESCE(data_hora_leitura, CURRENT_TIMESTAMP)
       WHERE (id_aviso_perfil = $1 OR id_aviso = $1) AND id_perfil = ANY($2::int[])
       RETURNING id_aviso_perfil, lido, data_hora_leitura`, [id, idsPerfis]);
    if (r.length) return r[0];

    // 2. Se for aviso de escopo MURAL que ainda não tinha linha em aviso_perfil, insere
    const idPerfil = idsPerfis[0];
    const ins = await this.db.query(`
      INSERT INTO aviso_perfil (id_aviso, id_perfil, lido, data_hora_leitura)
      VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP)
      ON CONFLICT (id_aviso, id_perfil)
      DO UPDATE SET lido = TRUE, data_hora_leitura = COALESCE(aviso_perfil.data_hora_leitura, CURRENT_TIMESTAMP)
      RETURNING id_aviso_perfil, lido, data_hora_leitura`, [id, idPerfil]);
    return ins[0] || { ok: true };
  }

  @Post() @Perfis('SINDICO')
  publicar(@Req() req: any, @Body() b: {
    titulo: string;
    conteudo: string;
    fixado?: boolean;
    data_hora_publicacao?: string;
    data_hora_expiracao?: string;
  }) {
    const idPerfil = perfilDoUsuario(req.user, 'SINDICO');
    const agora = new Date();
    // Tolerância de 2 minutos para compensar atraso de requisição / relógio do cliente
    const limitePassado = new Date(agora.getTime() - 2 * 60 * 1000);

    let dtPub: Date | null = null;
    if (b.data_hora_publicacao) {
      dtPub = new Date(b.data_hora_publicacao);
      if (isNaN(dtPub.getTime())) {
        throw new BadRequestException('Data de publicação inválida.');
      }
      if (dtPub < limitePassado) {
        throw new BadRequestException('A data de publicação não pode ser no passado.');
      }
    }

    let dtExp: Date | null = null;
    if (b.data_hora_expiracao) {
      dtExp = new Date(b.data_hora_expiracao);
      if (isNaN(dtExp.getTime())) {
        throw new BadRequestException('Data de expiração inválida.');
      }
      if (dtExp < agora) {
        throw new BadRequestException('A data de expiração não pode ser no passado.');
      }
      const dtBase = dtPub ?? agora;
      if (dtExp <= dtBase) {
        throw new BadRequestException('A data de expiração deve ser posterior à data de publicação.');
      }
    }

    return this.db.query(`
      INSERT INTO aviso (id_perfil_autor, titulo, conteudo, fixado, data_hora_publicacao, data_hora_expiracao)
      VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP), $6)
      RETURNING id_aviso, titulo, data_hora_publicacao, data_hora_expiracao`,
      [
        idPerfil,
        b.titulo,
        b.conteudo,
        b.fixado ?? false,
        dtPub,
        dtExp,
      ]).then(r => r[0]);
  }

  @Delete(':id') @Perfis('SINDICO')
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.db.query(`DELETE FROM aviso WHERE id_aviso = $1 RETURNING id_aviso`, [id])
      .then(r => {
        if (!r.length) throw new BadRequestException('Aviso não encontrado.');
        return { ok: true, id_aviso: r[0].id_aviso };
      });
  }
}

@Module({ controllers: [AvisosController] })
export class AvisosModule {}
