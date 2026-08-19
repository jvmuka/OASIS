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
    const idPerfil = perfilDoUsuario(req.user);
    return this.db.query(`
      SELECT ap.id_aviso_perfil, a.id_aviso, a.titulo, a.conteudo, a.escopo,
             a.fixado, a.data_hora_publicacao, ap.lido, ap.data_hora_leitura,
             p.nome AS autor
        FROM aviso_perfil ap
        JOIN aviso a ON a.id_aviso = ap.id_aviso
        JOIN perfil pf ON pf.id_perfil = a.id_perfil_autor
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       WHERE ap.id_perfil = $1
         AND a.data_hora_publicacao <= CURRENT_TIMESTAMP
         AND (a.data_hora_expiracao IS NULL OR a.data_hora_expiracao > CURRENT_TIMESTAMP)
       ORDER BY a.fixado DESC, a.data_hora_publicacao DESC`, [idPerfil]);
  }

  @Patch(':idAvisoPerfil/lido')
  marcarLido(@Req() req: any, @Param('idAvisoPerfil', ParseIntPipe) id: number) {
    const idPerfil = perfilDoUsuario(req.user);
    return this.db.query(`
      UPDATE aviso_perfil SET lido = TRUE
       WHERE id_aviso_perfil = $1 AND id_perfil = $2
       RETURNING id_aviso_perfil, lido, data_hora_leitura`, [id, idPerfil])
      .then(r => {
        if (!r.length) throw new BadRequestException('Aviso inexistente para este perfil.');
        return r[0];
      });
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
    return this.db.query(`
      INSERT INTO aviso (id_perfil_autor, titulo, conteudo, fixado, data_hora_publicacao, data_hora_expiracao)
      VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP), $6)
      RETURNING id_aviso, titulo, data_hora_publicacao, data_hora_expiracao`,
      [
        idPerfil,
        b.titulo,
        b.conteudo,
        b.fixado ?? false,
        b.data_hora_publicacao ? new Date(b.data_hora_publicacao) : null,
        b.data_hora_expiracao ? new Date(b.data_hora_expiracao) : null,
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
