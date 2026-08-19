import { Controller, Get, Post, Put, Patch, Body, Param, Query, Module, UseGuards, ParseIntPipe } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { JwtAuthGuard, PerfilGuard, Perfis } from '../auth/guards';

/**
 * UC11 - Cadastrar / Editar Pessoa e Unidade.
 * CRUD de blocos, unidades, pessoas, perfis e vinculos (perfil SINDICO).
 */
@Controller('cadastros')
@UseGuards(JwtAuthGuard, PerfilGuard)
export class CadastrosController {
  constructor(private db: DbService) {}

  // ------------------------- blocos e unidades -------------------------
  @Get('blocos')
  blocos() {
    return this.db.query(`SELECT * FROM bloco ORDER BY nome`);
  }

  @Post('blocos') @Perfis('SINDICO')
  criarBloco(@Body() b: { nome: string; descricao?: string }) {
    return this.db.query(
      `INSERT INTO bloco (nome, descricao) VALUES ($1,$2) RETURNING *`,
      [b.nome, b.descricao || null]).then(r => r[0]);
  }

  @Get('unidades')
  unidades() {
    return this.db.query(`
      SELECT u.id_unidade, b.nome AS bloco, u.numero_apartamento, u.numero_vagas
        FROM unidade u JOIN bloco b ON b.id_bloco = u.id_bloco
       ORDER BY b.nome, (CASE WHEN u.numero_apartamento ~ '^[0-9]+$' THEN u.numero_apartamento::INTEGER ELSE 999999 END), u.numero_apartamento`);
  }

  @Post('unidades') @Perfis('SINDICO')
  criarUnidade(@Body() u: { id_bloco: number; numero_apartamento: string; numero_vagas?: number }) {
    return this.db.query(
      `INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas)
       VALUES ($1,$2,$3) RETURNING *`,
      [u.id_bloco, u.numero_apartamento, u.numero_vagas ?? 0]).then(r => r[0]);
  }

  // ------------------------- pessoas -------------------------
  @Get('pessoas')
  pessoas(@Query('busca') busca?: string) {
    const filtro = busca ? `%${busca.toLowerCase()}%` : '%';
    return this.db.query(`
      SELECT p.id_pessoa, p.nome, p.email, p.cpf, p.celular, p.ativo,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'tipo', pf.tipo_perfil, 'id_perfil', pf.id_perfil))
               FILTER (WHERE pf.id_perfil IS NOT NULL), '[]') AS perfis,
             COALESCE(json_agg(DISTINCT jsonb_build_object(
               'bloco', b.nome, 'apartamento', u.numero_apartamento, 'vinculo', pu.tipo_vinculo))
               FILTER (WHERE pu.id_pessoa_unidade IS NOT NULL AND pu.data_fim_ocupacao IS NULL), '[]') AS unidades
        FROM pessoa p
        LEFT JOIN perfil pf ON pf.id_pessoa = p.id_pessoa
             AND (pf.data_fim IS NULL OR pf.data_fim >= CURRENT_DATE)
        LEFT JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa
        LEFT JOIN unidade u ON u.id_unidade = pu.id_unidade
        LEFT JOIN bloco   b ON b.id_bloco   = u.id_bloco
       WHERE LOWER(p.nome) LIKE $1 OR p.cpf LIKE $1 OR LOWER(p.email) LIKE $1
       GROUP BY p.id_pessoa
       ORDER BY p.nome`, [filtro]);
  }

  /**
   * Cadastro completo em UMA transacao: pessoa + vinculo com unidade + perfil.
   * No incremento 1 o uid_firebase e gerado localmente ("dev_" + cpf);
   * no incremento 2 ele passa a ser o uid devolvido pelo Firebase Admin.
   */
  @Post('pessoas') @Perfis('SINDICO')
  criarPessoa(@Body() b: {
    nome: string; email: string; cpf: string; data_nascimento: string; celular?: string;
    id_unidade?: number; tipo_vinculo?: string; tipo_perfil: string;
  }) {
    return this.db.transacao(async c => {
      const p = (await c.query(
        `INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_pessoa, nome, email`,
        ['dev_' + b.cpf, b.nome, b.email, b.cpf, b.data_nascimento, b.celular || null])).rows[0];
      if (b.id_unidade)
        await c.query(
          `INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo)
           VALUES ($1,$2,$3)`, [p.id_pessoa, b.id_unidade, b.tipo_vinculo || 'INQUILINO']);
      const perfil = (await c.query(
        `INSERT INTO perfil (id_pessoa, tipo_perfil) VALUES ($1,$2)
         RETURNING id_perfil, tipo_perfil`, [p.id_pessoa, b.tipo_perfil])).rows[0];
      return { ...p, perfil };
    });
  }

  @Put('pessoas/:id') @Perfis('SINDICO')
  editarPessoa(@Param('id', ParseIntPipe) id: number,
               @Body() b: { nome?: string; email?: string; celular?: string }) {
    return this.db.query(
      `UPDATE pessoa SET nome = COALESCE($2,nome), email = COALESCE($3,email),
              celular = COALESCE($4,celular)
        WHERE id_pessoa = $1 RETURNING id_pessoa, nome, email, celular`,
      [id, b.nome, b.email, b.celular]).then(r => r[0]);
  }

  @Patch('pessoas/:id/inativar') @Perfis('SINDICO')
  inativar(@Param('id', ParseIntPipe) id: number) {
    return this.db.transacao(async c => {
      await c.query(`UPDATE pessoa SET ativo = FALSE WHERE id_pessoa = $1`, [id]);
      await c.query(
        `UPDATE perfil SET data_fim = CURRENT_DATE
          WHERE id_pessoa = $1 AND data_fim IS NULL`, [id]);
      return { ok: true };
    });
  }
}

@Module({ controllers: [CadastrosController] })
export class CadastrosModule {}
