import { Controller, Get, Post, Delete, Patch, Body, Param, Query, Module, UseGuards, Req, ParseIntPipe, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario, ModuloGuard, ExigeModulo, resolverIdCondominio } from '../auth/guards';
import { AVISO_ANEXO_MAX_BYTES, AVISO_ANEXO_TIPOS_REGEX } from '../common/upload.constants';
import { SyncService } from '../sync/sync.service';

/**
 * UC05 (visualizar/ler) e UC10 (publicar).
 * RN13 distribui o aviso do mural; RN14 grava a data da leitura.
 */
@Controller('avisos')
@UseGuards(JwtAuthGuard, ModuloGuard, PerfilGuard)
@ExigeModulo('MURAL_AVISOS')
export class AvisosController {
  constructor(private db: DbService, private syncService: SyncService) { }

  /** Upload de arquivo anexo para aviso (imagem ou PDF). */
  @Post('upload-anexo')
  @Perfis('SINDICO')
  @UseInterceptors(FileInterceptor('arquivo', {
    storage: memoryStorage(),
    limits: { fileSize: AVISO_ANEXO_MAX_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!AVISO_ANEXO_TIPOS_REGEX.test(file.mimetype)) {
        return cb(new BadRequestException(`Tipo de arquivo não permitido (${file.mimetype}). Envie uma imagem (JPG, PNG, WebP) ou PDF.`), false);
      }
      cb(null, true);
    },
  }))
  async uploadAnexo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    await fs.mkdir('./uploads/avisos', { recursive: true }).catch(() => { });

    const ext = file.originalname.split('.').pop()?.toLowerCase() || (file.mimetype === 'application/pdf' ? 'pdf' : 'png');
    const nomeArquivo = `${Date.now()}-${randomUUID()}.${ext}`;
    await fs.writeFile(`./uploads/avisos/${nomeArquivo}`, file.buffer);

    const anexo_tipo = file.mimetype === 'application/pdf' ? 'PDF' : 'IMAGEM';
    const anexo_url = `/uploads/avisos/${nomeArquivo}`;
    const anexo_nome = file.originalname;

    return { anexo_url, anexo_nome, anexo_tipo };
  }

  /** Listagem completa de avisos gerenciados pelo síndico (publicados, agendados, expirados e arquivados). */
  @Get()
  @Perfis('SINDICO')
  listarTodos(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('busca') busca?: string,
    @Query('data_inicio') dataInicio?: string,
    @Query('data_fim') dataFim?: string,
  ) {
    const idCondominio = resolverIdCondominio(req);
    const whereClauses: string[] = ['a.id_condominio = $1'];
    const params: any[] = [idCondominio];

    const statusFiltro = (status || '').toUpperCase();
    if (statusFiltro === 'ARQUIVADOS') {
      whereClauses.push('a.arquivado = TRUE');
    } else if (statusFiltro === 'TODOS') {
      // traz tanto ativos quanto arquivados
    } else {
      // padrao: apenas ativos (não arquivados)
      whereClauses.push('a.arquivado = FALSE');
    }

    if (busca && busca.trim()) {
      params.push(`%${busca.trim()}%`);
      whereClauses.push(`(a.titulo ILIKE $${params.length} OR a.conteudo ILIKE $${params.length})`);
    }

    if (dataInicio && dataInicio.trim()) {
      params.push(dataInicio.trim());
      whereClauses.push(`a.data_hora_publicacao >= $${params.length}::timestamp`);
    }

    if (dataFim && dataFim.trim()) {
      params.push(`${dataFim.trim()} 23:59:59.999`);
      whereClauses.push(`a.data_hora_publicacao <= $${params.length}::timestamp`);
    }

    return this.db.query(`
      SELECT a.id_aviso, a.titulo, a.conteudo, a.escopo, a.fixado, a.arquivado, a.data_hora_arquivamento,
             a.data_hora_publicacao, a.data_hora_expiracao,
             a.anexo_url, a.anexo_nome, a.anexo_tipo,
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
               WHEN a.arquivado = TRUE THEN 'ARQUIVADO'
               WHEN a.data_hora_publicacao > CURRENT_TIMESTAMP THEN 'AGENDADO'
               WHEN a.data_hora_expiracao IS NOT NULL AND a.data_hora_expiracao <= CURRENT_TIMESTAMP THEN 'EXPIRADO'
               ELSE 'PUBLICADO'
             END AS status,
             (SELECT COUNT(*) FROM aviso_perfil ap WHERE ap.id_aviso = a.id_aviso) AS total_destinatarios,
             (SELECT COUNT(*) FROM aviso_perfil ap WHERE ap.id_aviso = a.id_aviso AND ap.lido = TRUE) AS total_lidos
        FROM aviso a
        JOIN perfil pf ON pf.id_perfil = a.id_perfil_autor
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY a.fixado DESC, a.data_hora_publicacao DESC`, params);
  }

  /** Mural do usuário logado: apenas avisos cuja data de publicação já chegou, que não expiraram e NÃO foram arquivados. */
  @Get('meus')
  meus(@Req() req: any) {
    const idsPerfis: number[] = (req.user?.perfis || []).map((p: any) => p.id_perfil);
    if (!idsPerfis.length) return [];
    const tipos: string[] = (req.user?.perfis || []).map((p: any) => p.tipo);
    const temMorador = tipos.includes('MORADOR');
    const idCondominio = resolverIdCondominio(req);

    return this.db.query(`
      SELECT DISTINCT ON (a.id_aviso)
             COALESCE(ap.id_aviso_perfil, 0) AS id_aviso_perfil,
             a.id_aviso, a.titulo, a.conteudo, a.escopo,
             a.fixado, a.data_hora_publicacao,
             a.anexo_url, a.anexo_nome, a.anexo_tipo,
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
       WHERE a.id_condominio = $3
         AND a.arquivado = FALSE
         AND (
             a.escopo = 'MURAL'
          OR ap.id_perfil = ANY($1::int[])
          OR a.id_perfil_autor = ANY($1::int[])
       )
         AND (
           $2 = TRUE OR (a.escopo <> 'INDIVIDUAL' AND a.titulo NOT ILIKE '%encomenda%')
         )
         AND a.data_hora_publicacao <= CURRENT_TIMESTAMP
         AND (a.data_hora_expiracao IS NULL OR a.data_hora_expiracao > CURRENT_TIMESTAMP)
       ORDER BY a.id_aviso, a.fixado DESC, a.data_hora_publicacao DESC`, [idsPerfis, temMorador, idCondominio])
      .then(rows => rows.sort((x, y) => {
        if (x.fixado !== y.fixado) return x.fixado ? -1 : 1;
        if (x.lido !== y.lido) return x.lido ? 1 : -1;
        return new Date(y.data_hora_publicacao).getTime() - new Date(x.data_hora_publicacao).getTime();
      }));
  }

  /** Alterna o arquivamento de um aviso (não exibe no mural do morador). */
  @Patch(':id/arquivar')
  @Perfis('SINDICO')
  async alternarArquivar(@Param('id', ParseIntPipe) id: number, @Body() b?: { arquivar?: boolean }) {
    const avisos = await this.db.query(`SELECT id_aviso, arquivado, titulo FROM aviso WHERE id_aviso = $1`, [id]);
    if (!avisos.length) throw new BadRequestException('Aviso não encontrado.');

    const novoStatus = b && typeof b.arquivar === 'boolean' ? b.arquivar : !avisos[0].arquivado;
    const res = await this.db.query(`
      UPDATE aviso
         SET arquivado = $1,
             data_hora_arquivamento = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id_aviso = $2
       RETURNING id_aviso, arquivado, data_hora_arquivamento, titulo`, [novoStatus, id]);

    this.syncService.emitir({
      topico: 'AVISOS',
      acao: 'ATUALIZADO',
      detalhes: { id_aviso: id, arquivado: novoStatus, titulo: res[0].titulo },
    });

    return res[0];
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

    this.syncService.emitir({
      topico: 'AVISOS',
      acao: 'ATUALIZADO',
      idPessoaAlvo: req.user?.sub,
      detalhes: { id_aviso: id },
    });

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
  async publicar(@Req() req: any, @Body() b: {
    titulo: string;
    conteudo: string;
    fixado?: boolean;
    data_hora_publicacao?: string;
    data_hora_expiracao?: string;
    anexo_url?: string;
    anexo_nome?: string;
    anexo_tipo?: string;
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
      const dtBase = dtPub || agora;
      if (dtExp <= dtBase) {
        throw new BadRequestException('A data de expiração deve ser posterior à data de publicação.');
      }
    }

    const idCondominio = resolverIdCondominio(req);
    const res = await this.db.query(`
      INSERT INTO aviso (id_perfil_autor, titulo, conteudo, fixado, data_hora_publicacao, data_hora_expiracao, anexo_url, anexo_nome, anexo_tipo, id_condominio)
      VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_TIMESTAMP), $6, $7, $8, $9, $10)
      RETURNING id_aviso, id_condominio, titulo, data_hora_publicacao, data_hora_expiracao, anexo_url, anexo_nome, anexo_tipo`,
      [
        idPerfil,
        b.titulo,
        b.conteudo,
        b.fixado ?? false,
        dtPub,
        dtExp,
        b.anexo_url || null,
        b.anexo_nome || null,
        b.anexo_tipo || null,
        idCondominio,
      ]).then(r => r[0]);

    this.syncService.emitir({
      topico: 'AVISOS',
      acao: 'CRIADO',
      detalhes: { id_aviso: res.id_aviso, titulo: res.titulo },
    });

    return res;
  }

  @Delete(':id') @Perfis('SINDICO')
  async excluir(@Param('id', ParseIntPipe) id: number) {
    const aviso = await this.db.query(`SELECT id_aviso, anexo_url FROM aviso WHERE id_aviso = $1`, [id]);
    if (!aviso.length) throw new BadRequestException('Aviso não encontrado.');

    await this.db.query(`DELETE FROM aviso WHERE id_aviso = $1`, [id]);

    if (aviso[0].anexo_url) {
      await fs.unlink(`.${aviso[0].anexo_url}`).catch(() => { });
    }

    this.syncService.emitir({
      topico: 'AVISOS',
      acao: 'EXCLUIDO',
      detalhes: { id_aviso: id },
    });

    return { ok: true, id_aviso: id };
  }
}

@Module({ controllers: [AvisosController] })
export class AvisosModule { }
