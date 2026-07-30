import { Injectable, OnModuleDestroy, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Camada unica de acesso ao PostgreSQL.
 * As regras de negocio criticas (RN01 a RN14) vivem em gatilhos no banco;
 * quando um gatilho dispara RAISE EXCEPTION, o driver pg devolve a mensagem
 * comecando por "RNxx:", e este servico a converte em erro HTTP 400 legivel.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const r = await this.pool.query(sql, params);
      return r.rows as T[];
    } catch (e) {
      throw this.traduz(e);
    }
  }

  /** Executa varias operacoes dentro de uma unica transacao. */
  async transacao<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK');
      throw this.traduz(e);
    } finally {
      c.release();
    }
  }

  private traduz(e: any) {
    const msg: string = e?.message || 'erro de banco de dados';
    if (/^RN\d{2}:/.test(msg)) return new BadRequestException(msg);          // regra de negocio
    if (e?.code === '23505') return new BadRequestException('Registro duplicado: ' + (e.detail || msg));
    if (e?.code === '23503') return new BadRequestException('Referencia inexistente: ' + (e.detail || msg));
    if (e?.code === '23514') return new BadRequestException('Valor invalido: ' + (e.constraint || msg));
    console.error('[DB]', msg);
    return new InternalServerErrorException('Erro interno de banco de dados.');
  }

  onModuleDestroy() { return this.pool.end(); }
}
