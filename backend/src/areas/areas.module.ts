import { Controller, Get, Post, Put, Delete, Body, Param, Req, Module, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import 'multer';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis, perfilDoUsuario } from '../auth/guards';
import { IMAGEM_MAX_BYTES, IMAGEM_TIPOS_REGEX } from '../common/upload.constants';

/** Largura maxima (px) das imagens de area comum apos redimensionamento. */
const IMAGEM_LARGURA_MAX = 1200;
/** Qualidade WebP aplicada na compressao das imagens enviadas. */
const IMAGEM_QUALIDADE_WEBP = 80;

/**
 * UC09 - Gerenciar Areas Comuns e Recursos.
 * Consulta liberada a todos os perfis; alteracoes restritas ao SINDICO.
 */
@Controller('areas')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class AreasController {
  constructor(private db: DbService) {}

  @Get()
  listar() {
    return this.db.query(`
      SELECT a.*,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'dia_semana', h.dia_semana, 'hora_inicio', h.hora_inicio, 'hora_fim', h.hora_fim))
               FILTER (WHERE h.id_horario IS NOT NULL), '[]') AS horarios
        FROM area_comum a
        LEFT JOIN area_horario h ON h.id_area_comum = a.id_area_comum
       GROUP BY a.id_area_comum
       ORDER BY a.nome`);
  }

  /** Lista todos os bloqueios e manutencoes de areas comuns. */
  @Get('bloqueios')
  listarBloqueios() {
    return this.db.query(`
      SELECT b.id_bloqueio_area, b.id_area_comum, a.nome AS area_nome,
             b.data_hora_inicio, b.data_hora_fim, b.motivo, b.descricao,
             p.nome AS autor_nome
        FROM bloqueio_area b
        JOIN area_comum a ON a.id_area_comum = b.id_area_comum
        JOIN perfil pf ON pf.id_perfil = b.id_perfil_registro
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
       ORDER BY b.data_hora_inicio DESC`);
  }

  /** Registra uma nova manutencao ou interdicao de area comum (SINDICO). */
  @Post('bloqueios') @Perfis('SINDICO')
  async criarBloqueio(
    @Req() req: any,
    @Body() b: {
      id_area_comum: number;
      data_hora_inicio: string;
      data_hora_fim: string;
      motivo: string;
      descricao?: string;
    },
  ) {
    if (!b.id_area_comum || !b.data_hora_inicio || !b.data_hora_fim || !b.motivo) {
      throw new BadRequestException('Preencha a area, motivo e o periodo de inicio e termino.');
    }

    const agora = new Date();
    const dtIni = new Date(b.data_hora_inicio);
    const dtFim = new Date(b.data_hora_fim);

    if (dtFim <= dtIni) {
      throw new BadRequestException('A data/hora de termino deve ser posterior a data/hora de inicio.');
    }
    if (dtFim <= agora) {
      throw new BadRequestException('Nao e permitido agendar manutencao para datas e horarios no passado.');
    }

    const idPerfil = perfilDoUsuario(req.user, 'SINDICO');

    // 1. Identifica reservas ativas conflitantes no periodo
    const reservasConflitantes = await this.db.query(`
      SELECT r.id_reserva, p.nome AS morador_nome,
             CONCAT(b_bloco.nome, ' - Apto ', u.numero_apartamento) AS unidade,
             r.data_hora_inicio, r.data_hora_fim
        FROM reserva r
        JOIN perfil pf ON pf.id_perfil = r.id_perfil
        JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa AND pu.data_fim_ocupacao IS NULL
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco b_bloco ON b_bloco.id_bloco = u.id_bloco
       WHERE r.id_area_comum = $1
         AND r.status = 'ATIVA'
         AND (r.data_hora_inicio, r.data_hora_fim) OVERLAPS ($2::timestamp, $3::timestamp)`,
      [b.id_area_comum, b.data_hora_inicio, b.data_hora_fim]);

    // 2. Cancela automaticamente as reservas conflitantes
    if (reservasConflitantes.length > 0) {
      const ids = reservasConflitantes.map((r: any) => r.id_reserva);
      await this.db.query(`
        UPDATE reserva
           SET status = 'CANCELADA',
               data_hora_cancelamento = CURRENT_TIMESTAMP,
               motivo_cancelamento = $1
         WHERE id_reserva = ANY($2::int[])`,
        [`MANUTENCAO: Interdicao da area para ${b.motivo}`, ids]);
    }

    // 3. Registra a manutencao na tabela de bloqueios
    const novoBloqueio = await this.db.query(`
      INSERT INTO bloqueio_area (id_area_comum, id_perfil_registro, data_hora_inicio, data_hora_fim, motivo, descricao)
      VALUES ($1, $2, $3::timestamp, $4::timestamp, $5, $6)
      RETURNING *`,
      [b.id_area_comum, idPerfil, b.data_hora_inicio, b.data_hora_fim, b.motivo, b.descricao || null])
      .then(r => r[0]);

    return {
      ...novoBloqueio,
      reservas_canceladas: reservasConflitantes.length,
      moradores_afetados: reservasConflitantes.map((r: any) => ({
        id_reserva: r.id_reserva,
        nome: r.morador_nome,
        unidade: r.unidade,
        inicio: r.data_hora_inicio,
        fim: r.data_hora_fim,
      })),
    };
  }

  /** Cancela/remove uma manutencao ou bloqueio (SINDICO). */
  @Delete('bloqueios/:id') @Perfis('SINDICO')
  async removerBloqueio(@Param('id', ParseIntPipe) id: number) {
    return this.db.query(`DELETE FROM bloqueio_area WHERE id_bloqueio_area = $1 RETURNING *`, [id])
      .then(r => {
        if (!r.length) throw new BadRequestException('Bloqueio inexistente.');
        return { ok: true, id_bloqueio_area: id };
      });
  }

  @Get(':id')
  detalhe(@Param('id', ParseIntPipe) id: number) {
    return this.db.query(`SELECT * FROM area_comum WHERE id_area_comum = $1`, [id])
      .then(r => r[0]);
  }

  /**
   * Conta registros associados a uma area (reserva, chave, bloqueio_area, bloqueio_perfil)
   * para decidir se a exclusao fisica e possivel. area_horario e area_utensilio nao entram
   * aqui pois tem ON DELETE CASCADE e saem junto sem impedir a exclusao.
   */
  @Get(':id/dependencias') @Perfis('SINDICO')
  async dependencias(@Param('id', ParseIntPipe) id: number) {
    const area = await this.db.query(`SELECT id_area_comum FROM area_comum WHERE id_area_comum = $1`, [id]);
    if (!area.length) throw new BadRequestException('Área inexistente.');

    const dep = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM reserva WHERE id_area_comum = $1)::int AS reservas_total,
        (SELECT COUNT(*) FROM reserva WHERE id_area_comum = $1 AND status = 'ATIVA'
           AND data_hora_inicio > CURRENT_TIMESTAMP)::int AS reservas_ativas_futuras,
        (SELECT COUNT(*) FROM chave WHERE id_area_comum = $1)::int AS chaves,
        (SELECT COUNT(*) FROM bloqueio_area WHERE id_area_comum = $1)::int AS bloqueios_area,
        (SELECT COUNT(*) FROM bloqueio_perfil WHERE id_area_comum = $1)::int AS bloqueios_perfil`,
      [id]).then(r => r[0]);

    const pode_excluir = dep.reservas_total === 0 && dep.chaves === 0
      && dep.bloqueios_area === 0 && dep.bloqueios_perfil === 0;

    return { ...dep, pode_excluir };
  }

  /**
   * Exclui definitivamente uma area comum, apenas quando nao houver reserva, chave ou
   * bloqueio (area/perfil) associados - essas tabelas nao tem ON DELETE CASCADE de proposito,
   * para preservar historico. Quando ha qualquer dependencia, a exclusao e recusada e o
   * sindico e orientado a usar a inativacao (RESTRICOES: nao altera regras do banco).
   */
  @Delete(':id') @Perfis('SINDICO')
  async excluir(@Param('id', ParseIntPipe) id: number) {
    const resultado = await this.db.transacao(async c => {
      const area = await c.query(`SELECT imagem_url FROM area_comum WHERE id_area_comum = $1`, [id]);
      if (!area.rows.length) throw new BadRequestException('Área inexistente.');

      const dep = await c.query(`
        SELECT
          (SELECT COUNT(*) FROM reserva WHERE id_area_comum = $1)::int AS reservas_total,
          (SELECT COUNT(*) FROM chave WHERE id_area_comum = $1)::int AS chaves,
          (SELECT COUNT(*) FROM bloqueio_area WHERE id_area_comum = $1)::int AS bloqueios_area,
          (SELECT COUNT(*) FROM bloqueio_perfil WHERE id_area_comum = $1)::int AS bloqueios_perfil`,
        [id]).then(r => r.rows[0]);

      const partes: string[] = [];
      if (dep.reservas_total > 0) partes.push(`${dep.reservas_total} reserva(s)`);
      if (dep.chaves > 0) partes.push(`${dep.chaves} chave(s)`);
      if (dep.bloqueios_area > 0) partes.push(`${dep.bloqueios_area} bloqueio(s) de manutenção/interdição`);
      if (dep.bloqueios_perfil > 0) partes.push(`${dep.bloqueios_perfil} bloqueio(s) de morador`);

      if (partes.length > 0) {
        throw new BadRequestException(
          `Não é possível excluir esta área: existem ${partes.join(', ')} vinculado(s) a ela. ` +
          `Utilize a opção de inativar para removê-la da listagem dos moradores sem perder o histórico.`);
      }

      await c.query(`DELETE FROM area_comum WHERE id_area_comum = $1`, [id]);
      return { imagem_url: area.rows[0].imagem_url as string | null };
    });

    if (resultado.imagem_url) {
      await fs.unlink(`.${resultado.imagem_url}`).catch(() => {});
    }
    return { ok: true, id_area_comum: id };
  }

  @Post() @Perfis('SINDICO')
  async criar(@Body() a: any) {
    if (!a.nome || !a.capacidade) {
      throw new BadRequestException('Informe o nome e a capacidade do espaço comum.');
    }
    const antMinHoras = a.antecedencia_minima_horas ?? (a.antecedencia_minima_dias !== undefined ? a.antecedencia_minima_dias * 24 : 0);
    const antMinDias = Math.ceil(antMinHoras / 24);

    return this.db.transacao(async client => {
      const res = await client.query(`
        INSERT INTO area_comum
          (nome, descricao, capacidade, tipo_acesso, tipo_uso, duracao_slot_min,
           antecedencia_minima_dias, antecedencia_maxima_dias,
           prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor, imagem_url, antecedencia_minima_horas, idade_minima, reserva_por_dia)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [a.nome, a.descricao || null, a.capacidade, a.tipo_acesso || 'LIVRE', a.tipo_uso || 'RESERVAVEL',
         a.duracao_slot_min ?? 60, antMinDias,
         a.antecedencia_maxima_dias ?? 30, a.prazo_cancelamento_horas ?? 24,
         a.limite_reservas_semana ?? 2, a.exige_chave ?? false, a.valor ?? 0,
         a.imagem_url || null, antMinHoras, a.idade_minima ?? 0, Boolean(a.reserva_por_dia)]);
      const novaArea = res.rows[0];

      if (Array.isArray(a.horarios) && a.horarios.length > 0) {
        for (const h of a.horarios) {
          if (h.dia_semana && h.hora_inicio && h.hora_fim) {
            await client.query(`
              INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim)
              VALUES ($1, $2, $3, $4)`,
              [novaArea.id_area_comum, h.dia_semana, h.hora_inicio, h.hora_fim]);
          }
        }
      }

      return novaArea;
    });
  }

  @Put(':id') @Perfis('SINDICO')
  async editar(@Param('id', ParseIntPipe) id: number, @Body() a: any) {
    const antMinHoras = a.antecedencia_minima_horas !== undefined
      ? a.antecedencia_minima_horas
      : (a.antecedencia_minima_dias !== undefined ? a.antecedencia_minima_dias * 24 : null);
    const antMinDias = antMinHoras !== null ? Math.ceil(antMinHoras / 24) : null;

    return this.db.transacao(async client => {
      const res = await client.query(`
        UPDATE area_comum SET
          nome = COALESCE($2,nome), descricao = COALESCE($3,descricao),
          capacidade = COALESCE($4,capacidade),
          duracao_slot_min = COALESCE($5,duracao_slot_min),
          antecedencia_minima_dias = COALESCE($6,antecedencia_minima_dias),
          antecedencia_maxima_dias = COALESCE($7,antecedencia_maxima_dias),
          prazo_cancelamento_horas = COALESCE($8,prazo_cancelamento_horas),
          limite_reservas_semana = COALESCE($9,limite_reservas_semana),
          ativo = COALESCE($10,ativo),
          imagem_url = COALESCE($11,imagem_url),
          antecedencia_minima_horas = COALESCE($12,antecedencia_minima_horas),
          idade_minima = COALESCE($13,idade_minima),
          reserva_por_dia = COALESCE($14,reserva_por_dia)
        WHERE id_area_comum = $1 RETURNING *`,
        [id, a.nome, a.descricao, a.capacidade, a.duracao_slot_min,
         antMinDias, a.antecedencia_maxima_dias,
         a.prazo_cancelamento_horas, a.limite_reservas_semana, a.ativo,
         a.imagem_url, antMinHoras, a.idade_minima, a.reserva_por_dia !== undefined ? Boolean(a.reserva_por_dia) : null]);
      const areaAtualizada = res.rows[0];
      if (!areaAtualizada) throw new BadRequestException('Área comum inexistente.');

      if (Array.isArray(a.horarios)) {
        await client.query(`DELETE FROM area_horario WHERE id_area_comum = $1`, [id]);
        for (const h of a.horarios) {
          if (h.dia_semana && h.hora_inicio && h.hora_fim) {
            await client.query(`
              INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim)
              VALUES ($1, $2, $3, $4)`,
              [id, h.dia_semana, h.hora_inicio, h.hora_fim]);
          }
        }
      }

      return areaAtualizada;
    });
  }

  /** Upload de imagem para uma area comum. Redimensiona e comprime para WebP antes de gravar em disco. */
  @Post(':id/imagem') @Perfis('SINDICO')
  @UseInterceptors(FileInterceptor('imagem', {
    storage: memoryStorage(),
    fileFilter: (_req, file, cb) => {
      if (!IMAGEM_TIPOS_REGEX.test(file.mimetype)) {
        cb(new BadRequestException('Formato de imagem invalido. Aceitos: JPEG, PNG, WebP, GIF.'), false);
        return;
      }
      cb(null, true);
    },
    limits: { fileSize: IMAGEM_MAX_BYTES },
  }))
  async uploadImagem(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    let processada: Buffer;
    try {
      processada = await sharp(file.buffer)
        .rotate()
        .resize({ width: IMAGEM_LARGURA_MAX, withoutEnlargement: true })
        .webp({ quality: IMAGEM_QUALIDADE_WEBP })
        .toBuffer();
    } catch {
      throw new BadRequestException('Nao foi possivel processar a imagem enviada. Verifique se o arquivo nao esta corrompido.');
    }

    console.log(
      `[areas] compressao de imagem: ${(file.originalname || '').replace(/[^\w.-]/g, '_')} ${file.size} bytes -> ${processada.length} bytes`,
    );

    // Garante que o diretorio de uploads existe
    await fs.mkdir('./uploads', { recursive: true }).catch(() => {});

    const nome = `area-${Date.now()}.webp`;
    await fs.writeFile(`./uploads/${nome}`, processada);

    // Remove imagem anterior para evitar acumulo de arquivos orfaos
    const areaAnterior = await this.db.query(
      `SELECT imagem_url FROM area_comum WHERE id_area_comum = $1`, [id]);
    if (areaAnterior.length && areaAnterior[0].imagem_url) {
      await fs.unlink(`.${areaAnterior[0].imagem_url}`).catch(() => {});
    }

    const url = `/uploads/${nome}`;
    await this.db.query(
      `UPDATE area_comum SET imagem_url = $2 WHERE id_area_comum = $1`, [id, url]);
    return { imagem_url: url };
  }

  @Post(':id/horarios') @Perfis('SINDICO')
  criarHorario(@Param('id', ParseIntPipe) id: number,
               @Body() h: { dia_semana: string; hora_inicio: string; hora_fim: string }) {
    return this.db.query(`
      INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim)
      VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, h.dia_semana, h.hora_inicio, h.hora_fim]).then(r => r[0]);
  }
}

@Module({ controllers: [AreasController] })
export class AreasModule {}
