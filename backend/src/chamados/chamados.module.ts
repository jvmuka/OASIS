import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Module,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';
import { SyncService } from '../sync/sync.service';

const CATEGORIAS_VALIDAS = [
  'LIMPEZA',
  'AVARIA_QUEBRADO',
  'MANUTENCAO',
  'CONVIVENCIA_BARULHO',
  'OUTROS',
];

const STATUS_VALIDOS = ['EM_ANALISE', 'EM_ANDAMENTO', 'REALIZADA', 'ARQUIVADA'];

@Controller('chamados')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class ChamadosController {
  constructor(
    private db: DbService,
    private syncService: SyncService,
  ) {}

  /** Upload de foto para o chamado */
  @Post('upload-foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
          return cb(
            new BadRequestException('Apenas imagens (JPG, PNG, WebP) são permitidas.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFoto(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const dir = join(process.cwd(), 'uploads', 'chamados');
    await fs.mkdir(dir, { recursive: true }).catch(() => {});

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const nomeArquivo = `${Date.now()}-${randomUUID()}.${ext}`;
    await fs.writeFile(join(dir, nomeArquivo), file.buffer);

    return { imagem_url: `/uploads/chamados/${nomeArquivo}` };
  }

  /**
   * Estatísticas resumidas de chamados para badges e métricas (Síndico / Admin)
   */
  @Get('estatisticas')
  @Perfis('SINDICO', 'ADMINISTRADOR')
  async estatisticas() {
    const rows = await this.db.query<{ status: string; total: string }>(`
      SELECT status, COUNT(*)::text AS total
        FROM chamado
       GROUP BY status
    `);

    const stats = {
      EM_ANALISE: 0,
      EM_ANDAMENTO: 0,
      REALIZADA: 0,
      ARQUIVADA: 0,
      TOTAL: 0,
    };

    for (const r of rows) {
      const q = parseInt(r.total, 10) || 0;
      if (stats.hasOwnProperty(r.status)) {
        (stats as any)[r.status] = q;
      }
      stats.TOTAL += q;
    }

    return stats;
  }

  /**
   * Listagem de chamados da unidade do morador autenticado
   */
  @Get('meus')
  @Perfis('MORADOR')
  async listarMeus(@Req() req: any) {
    const idPessoa = req.user.sub;

    const sql = `
      SELECT c.id_chamado,
             c.id_unidade,
             c.id_pessoa_autor,
             c.categoria,
             c.titulo,
             c.descricao,
             c.local_especifico,
             c.status,
             c.imagem_url,
             c.data_hora_abertura,
             c.data_hora_fechamento,
             c.data_hora_atualizacao,
             u.numero_apartamento,
             b.nome AS bloco,
             p.nome AS autor_nome,
             (SELECT COUNT(*) FROM chamado_mensagem cm WHERE cm.id_chamado = c.id_chamado)::int AS total_mensagens,
             (SELECT MAX(data_hora) FROM chamado_mensagem cm WHERE cm.id_chamado = c.id_chamado) AS ultima_mensagem_em
        FROM chamado c
        JOIN unidade u ON u.id_unidade = c.id_unidade
        JOIN bloco b ON b.id_bloco = u.id_bloco
        JOIN pessoa p ON p.id_pessoa = c.id_pessoa_autor
       WHERE c.id_unidade IN (
         SELECT pu.id_unidade
           FROM pessoa_unidade pu
          WHERE pu.id_pessoa = $1
            AND pu.data_fim_ocupacao IS NULL
       )
       ORDER BY 
         CASE 
           WHEN c.status = 'EM_ANALISE' THEN 1
           WHEN c.status = 'EM_ANDAMENTO' THEN 2
           WHEN c.status = 'REALIZADA' THEN 3
           ELSE 4
         END,
         c.data_hora_atualizacao DESC
    `;

    return this.db.query(sql, [idPessoa]);
  }

  /**
   * Listagem geral de chamados para a administração (Síndico / Administrador)
   */
  @Get()
  @Perfis('SINDICO', 'ADMINISTRADOR')
  async listarTodos(
    @Query('status') status?: string,
    @Query('categoria') categoria?: string,
    @Query('busca') busca?: string,
  ) {
    let whereClauses: string[] = ['1=1'];
    const params: any[] = [];

    if (status && status !== 'TODAS') {
      params.push(status);
      whereClauses.push(`c.status = $${params.length}`);
    }

    if (categoria && categoria !== 'TODAS') {
      params.push(categoria);
      whereClauses.push(`c.categoria = $${params.length}`);
    }

    if (busca && busca.trim().length > 0) {
      params.push(`%${busca.trim()}%`);
      whereClauses.push(`(
        c.titulo ILIKE $${params.length} OR 
        c.descricao ILIKE $${params.length} OR 
        c.local_especifico ILIKE $${params.length} OR 
        p.nome ILIKE $${params.length} OR 
        u.numero_apartamento ILIKE $${params.length} OR
        b.nome ILIKE $${params.length}
      )`);
    }

    const sql = `
      SELECT c.id_chamado,
             c.id_unidade,
             c.id_pessoa_autor,
             c.categoria,
             c.titulo,
             c.descricao,
             c.local_especifico,
             c.status,
             c.imagem_url,
             c.data_hora_abertura,
             c.data_hora_fechamento,
             c.data_hora_atualizacao,
             u.numero_apartamento,
             b.nome AS bloco,
             p.nome AS autor_nome,
             p.email AS autor_email,
             p.celular AS autor_celular,
             (SELECT COUNT(*) FROM chamado_mensagem cm WHERE cm.id_chamado = c.id_chamado)::int AS total_mensagens,
             (SELECT MAX(data_hora) FROM chamado_mensagem cm WHERE cm.id_chamado = c.id_chamado) AS ultima_mensagem_em
        FROM chamado c
        JOIN unidade u ON u.id_unidade = c.id_unidade
        JOIN bloco b ON b.id_bloco = u.id_bloco
        JOIN pessoa p ON p.id_pessoa = c.id_pessoa_autor
       WHERE ${whereClauses.join(' AND ')}
       ORDER BY 
         CASE 
           WHEN c.status = 'EM_ANALISE' THEN 1
           WHEN c.status = 'EM_ANDAMENTO' THEN 2
           WHEN c.status = 'REALIZADA' THEN 3
           ELSE 4
         END,
         c.data_hora_atualizacao DESC
    `;

    return this.db.query(sql, params);
  }

  /**
   * Consulta os detalhes de um chamado específico + histórico de mensagens particulares
   */
  @Get(':id')
  async obterDetalhes(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const chamados = await this.db.query(
      `
      SELECT c.*,
             u.numero_apartamento,
             b.nome AS bloco,
             p.nome AS autor_nome,
             p.email AS autor_email,
             p.celular AS autor_celular,
             ac.nome AS area_comum_nome
        FROM chamado c
        JOIN unidade u ON u.id_unidade = c.id_unidade
        JOIN bloco b ON b.id_bloco = u.id_bloco
        JOIN pessoa p ON p.id_pessoa = c.id_pessoa_autor
        LEFT JOIN area_comum ac ON ac.id_area_comum = c.id_area_comum
       WHERE c.id_chamado = $1
    `,
      [id],
    );

    if (!chamados.length) {
      throw new NotFoundException('Chamado não encontrado.');
    }

    const chamado = chamados[0];
    const perfis = (req.user?.perfis || []).map((p: any) => p.tipo);
    const ehAdmin = perfis.some(
      (t: string) => t === 'SINDICO' || t === 'ADMINISTRADOR' || t === 'SUPERADMIN',
    );

    // Se não for admin, verificar se o chamado é da unidade do morador logado
    if (!ehAdmin) {
      const vinculo = await this.db.query(
        `
        SELECT 1 FROM pessoa_unidade
         WHERE id_pessoa = $1
           AND id_unidade = $2
           AND data_fim_ocupacao IS NULL
      `,
        [req.user.sub, chamado.id_unidade],
      );

      if (!vinculo.length) {
        throw new ForbiddenException(
          'Você não tem permissão para visualizar este chamado particular.',
        );
      }
    }

    // Buscar histórico de mensagens
    const mensagens = await this.db.query(
      `
      SELECT cm.id_chamado_mensagem,
             cm.id_chamado,
             cm.id_pessoa,
             cm.id_perfil,
             cm.origem,
             cm.mensagem,
             cm.anexo_url,
             cm.data_hora,
             p.nome AS autor_nome,
             pf.tipo_perfil
        FROM chamado_mensagem cm
        JOIN pessoa p ON p.id_pessoa = cm.id_pessoa
        JOIN perfil pf ON pf.id_perfil = cm.id_perfil
       WHERE cm.id_chamado = $1
       ORDER BY cm.data_hora ASC
    `,
      [id],
    );

    return {
      ...chamado,
      mensagens,
    };
  }

  /**
   * Morador abre um novo chamado
   */
  @Post()
  @Perfis('MORADOR')
  async abrirChamado(
    @Body()
    body: {
      titulo: string;
      categoria: string;
      descricao: string;
      local_especifico?: string;
      id_area_comum?: number;
      imagem_url?: string;
      id_unidade?: number;
    },
    @Req() req: any,
  ) {
    const idPessoa = req.user.sub;
    const idPerfil = perfilDoUsuario(req.user, 'MORADOR');

    if (!body.titulo || !body.titulo.trim()) {
      throw new BadRequestException('O título do chamado é obrigatório.');
    }
    if (!body.categoria || !CATEGORIAS_VALIDAS.includes(body.categoria)) {
      throw new BadRequestException(
        `Categoria inválida. Categorias permitidas: ${CATEGORIAS_VALIDAS.join(', ')}`,
      );
    }
    if (!body.descricao || !body.descricao.trim()) {
      throw new BadRequestException('A descrição do chamado é obrigatória.');
    }

    // Identificar a unidade habitacional ativa do morador
    let idUnidade = body.id_unidade;
    if (idUnidade) {
      const checaUnidade = await this.db.query(
        `
        SELECT id_unidade FROM pessoa_unidade
         WHERE id_pessoa = $1 AND id_unidade = $2 AND data_fim_ocupacao IS NULL
      `,
        [idPessoa, idUnidade],
      );
      if (!checaUnidade.length) {
        throw new BadRequestException('Você não possui vínculo ativo com a unidade informada.');
      }
    } else {
      const unidades = await this.db.query<{ id_unidade: number }>(
        `
        SELECT id_unidade FROM pessoa_unidade
         WHERE id_pessoa = $1 AND data_fim_ocupacao IS NULL
         ORDER BY id_pessoa_unidade DESC
         LIMIT 1
      `,
        [idPessoa],
      );

      if (!unidades.length) {
        throw new BadRequestException(
          'Você não possui nenhuma unidade ativa vinculada ao seu usuário.',
        );
      }
      idUnidade = unidades[0].id_unidade;
    }

    const insertResult = await this.db.query<{ id_chamado: number }>(
      `
      INSERT INTO chamado (
        id_unidade,
        id_pessoa_autor,
        id_perfil_autor,
        id_area_comum,
        categoria,
        titulo,
        descricao,
        local_especifico,
        status,
        imagem_url,
        data_hora_abertura,
        data_hora_atualizacao
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'EM_ANALISE', $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id_chamado
    `,
      [
        idUnidade,
        idPessoa,
        idPerfil,
        body.id_area_comum || null,
        body.categoria,
        body.titulo.trim(),
        body.descricao.trim(),
        body.local_especifico ? body.local_especifico.trim() : null,
        body.imagem_url || null,
      ],
    );

    const novoId = insertResult[0].id_chamado;

    // Emissão de sincronização em tempo real (notifica o síndico e o morador)
    this.syncService.emitir({
      topico: 'CHAMADOS',
      acao: 'CRIADO',
      idUnidadeAlvo: idUnidade,
      detalhes: {
        id_chamado: novoId,
        id_unidade: idUnidade,
        categoria: body.categoria,
        titulo: body.titulo.trim(),
      },
    });

    return {
      id_chamado: novoId,
      mensagem: 'Chamado aberto com sucesso! A administração foi notificada.',
    };
  }

  /**
   * Adiciona uma mensagem ou réplica na thread de conversa do chamado
   * (Morador ou Síndico / Admin)
   */
  @Post(':id/mensagens')
  async enviarMensagem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { mensagem: string; anexo_url?: string },
    @Req() req: any,
  ) {
    if (!body.mensagem || !body.mensagem.trim()) {
      throw new BadRequestException('A mensagem não pode ser vazia.');
    }

    // Buscar o chamado
    const chamados = await this.db.query(
      `SELECT id_chamado, id_unidade, id_pessoa_autor, status FROM chamado WHERE id_chamado = $1`,
      [id],
    );
    if (!chamados.length) {
      throw new NotFoundException('Chamado não encontrado.');
    }
    const chamado = chamados[0];

    const perfis = (req.user?.perfis || []).map((p: any) => p.tipo);
    const ehAdmin = perfis.some(
      (t: string) => t === 'SINDICO' || t === 'ADMINISTRADOR' || t === 'SUPERADMIN',
    );

    let origem: 'MORADOR' | 'ADMINISTRACAO' = 'MORADOR';
    let idPerfil: number;

    if (ehAdmin) {
      origem = 'ADMINISTRACAO';
      idPerfil = perfilDoUsuario(req.user, 'SINDICO');
    } else {
      // Validar se o morador pertence à unidade do chamado
      const vinculo = await this.db.query(
        `
        SELECT 1 FROM pessoa_unidade
         WHERE id_pessoa = $1
           AND id_unidade = $2
           AND data_fim_ocupacao IS NULL
      `,
        [req.user.sub, chamado.id_unidade],
      );

      if (!vinculo.length) {
        throw new ForbiddenException(
          'Você não tem permissão para responder a este chamado particular.',
        );
      }
      origem = 'MORADOR';
      idPerfil = perfilDoUsuario(req.user, 'MORADOR');
    }

    await this.db.query(
      `
      INSERT INTO chamado_mensagem (
        id_chamado,
        id_pessoa,
        id_perfil,
        origem,
        mensagem,
        anexo_url,
        data_hora
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `,
      [
        id,
        req.user.sub,
        idPerfil,
        origem,
        body.mensagem.trim(),
        body.anexo_url || null,
      ],
    );

    // Atualiza a data de atualização do chamado
    await this.db.query(
      `UPDATE chamado SET data_hora_atualizacao = CURRENT_TIMESTAMP WHERE id_chamado = $1`,
      [id],
    );

    // Notificação de sincronização
    this.syncService.emitir({
      topico: 'CHAMADOS',
      acao: 'ATUALIZADO',
      idPessoaAlvo: origem === 'ADMINISTRACAO' ? chamado.id_pessoa_autor : undefined,
      idUnidadeAlvo: chamado.id_unidade,
      detalhes: {
        id_chamado: id,
        origem,
      },
    });

    return { mensagem: 'Mensagem enviada com sucesso!' };
  }

  /**
   * Atualização de status do chamado pelo Síndico / Administrador
   * (Opcionalmente insere uma resposta oficial)
   */
  @Patch(':id/status')
  @Perfis('SINDICO', 'ADMINISTRADOR')
  async atualizarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; resposta_oficial?: string },
    @Req() req: any,
  ) {
    if (!body.status || !STATUS_VALIDOS.includes(body.status)) {
      throw new BadRequestException(
        `Status inválido. Status permitidos: ${STATUS_VALIDOS.join(', ')}`,
      );
    }

    const chamados = await this.db.query(
      `SELECT id_chamado, id_unidade, id_pessoa_autor, status, titulo FROM chamado WHERE id_chamado = $1`,
      [id],
    );
    if (!chamados.length) {
      throw new NotFoundException('Chamado não encontrado.');
    }
    const chamado = chamados[0];

    const dataFechamentoSql =
      body.status === 'REALIZADA' || body.status === 'ARQUIVADA'
        ? 'CURRENT_TIMESTAMP'
        : 'NULL';

    await this.db.query(
      `
      UPDATE chamado
         SET status = $1,
             data_hora_fechamento = ${dataFechamentoSql},
             data_hora_atualizacao = CURRENT_TIMESTAMP
       WHERE id_chamado = $2
    `,
      [body.status, id],
    );

    // Se informou resposta oficial, grava na thread de mensagens
    if (body.resposta_oficial && body.resposta_oficial.trim()) {
      const idPerfil = perfilDoUsuario(req.user, 'SINDICO');
      await this.db.query(
        `
        INSERT INTO chamado_mensagem (
          id_chamado,
          id_pessoa,
          id_perfil,
          origem,
          mensagem,
          data_hora
        ) VALUES ($1, $2, $3, 'ADMINISTRACAO', $4, CURRENT_TIMESTAMP)
      `,
        [id, req.user.sub, idPerfil, body.resposta_oficial.trim()],
      );
    }

    // Sincronização em tempo real
    this.syncService.emitir({
      topico: 'CHAMADOS',
      acao: 'ATUALIZADO',
      idPessoaAlvo: chamado.id_pessoa_autor,
      idUnidadeAlvo: chamado.id_unidade,
      detalhes: {
        id_chamado: id,
        novo_status: body.status,
        titulo: chamado.titulo,
      },
    });

    return {
      mensagem: `Status do chamado atualizado para "${body.status}" com sucesso!`,
    };
  }
}

@Module({
  controllers: [ChamadosController],
  providers: [DbService, SyncService],
})
export class ChamadosModule {}

