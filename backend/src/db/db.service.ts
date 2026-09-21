import { Injectable, OnModuleInit, OnModuleDestroy, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Camada unica de acesso ao PostgreSQL.
 * As regras de negocio criticas (RN01 a RN14) vivem em gatilhos no banco;
 * quando um gatilho dispara RAISE EXCEPTION, o driver pg devolve a mensagem
 * comecando por "RNxx:", e este servico a converte em erro HTTP 400 legivel.
 */
@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,                    // maximo de conexoes simultanias no pool
    connectionTimeoutMillis: 5_000,   // timeout para obter conexao do pool
    idleTimeoutMillis: 30_000,        // tempo maximo de ociosidade antes de fechar
  });

  async onModuleInit() {
    try {
      await this.pool.query(`
        ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS usado_em TIMESTAMP;
        ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) DEFAULT 'PRIMEIRO_ACESSO';
        ALTER TABLE area_comum ALTER COLUMN descricao TYPE TEXT;
        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS requer_reserva BOOLEAN NOT NULL DEFAULT true;
        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre VARCHAR(20) NOT NULL DEFAULT 'LIVRE';
        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_observacao VARCHAR(255);
        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_porteiro VARCHAR(100);
        ALTER TABLE chave ALTER COLUMN codigo TYPE VARCHAR(100);

        CREATE OR REPLACE FUNCTION fn_cancela_reserva() RETURNS TRIGGER AS $$
        DECLARE
            v_prazo INTEGER;
        BEGIN
            IF NEW.status = 'CANCELADA' AND OLD.status <> 'CANCELADA' THEN
                IF OLD.status = 'CONCLUIDA' THEN
                    RAISE EXCEPTION 'RN08: nao e permitido cancelar uma reserva ja concluida.';
                END IF;

                SELECT prazo_cancelamento_horas INTO v_prazo
                  FROM area_comum WHERE id_area_comum = NEW.id_area_comum;

                IF (NEW.motivo_cancelamento IS NULL OR (NEW.motivo_cancelamento NOT LIKE 'MANUTENCAO%' AND NEW.motivo_cancelamento NOT LIKE 'ADMINISTRATIVO%' AND NEW.motivo_cancelamento NOT LIKE 'PENALIDADE%')) THEN
                    IF CURRENT_TIMESTAMP > (OLD.data_hora_inicio - (v_prazo || ' hours')::INTERVAL) THEN
                        RAISE EXCEPTION 'RN08: cancelamento permitido somente ate % hora(s) antes do inicio.',
                                        v_prazo;
                    END IF;
                END IF;

                NEW.data_hora_cancelamento := COALESCE(NEW.data_hora_cancelamento, CURRENT_TIMESTAMP);
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION fn_bloqueio_perfil_cancela_reservas() RETURNS TRIGGER AS $$
        BEGIN
            UPDATE reserva r
               SET status = 'CANCELADA',
                   data_hora_cancelamento = CURRENT_TIMESTAMP,
                   motivo_cancelamento = 'PENALIDADE: ' || COALESCE(NEW.motivo::text, 'Bloqueio disciplinar aplicado pelo sindico.')
              FROM perfil pf_res, perfil pf_bloq
             WHERE r.id_perfil = pf_res.id_perfil
               AND pf_bloq.id_perfil = NEW.id_perfil
               AND pf_res.id_pessoa = pf_bloq.id_pessoa
               AND r.status = 'ATIVA'
               AND (NEW.id_area_comum IS NULL OR r.id_area_comum = NEW.id_area_comum)
               AND (r.data_hora_fim > NEW.data_hora_inicio AND (NEW.data_hora_fim IS NULL OR r.data_hora_inicio < NEW.data_hora_fim));
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS tg_bloqueio_perfil_cancela_reservas ON bloqueio_perfil;
        CREATE TRIGGER tg_bloqueio_perfil_cancela_reservas
            AFTER INSERT ON bloqueio_perfil
            FOR EACH ROW EXECUTE FUNCTION fn_bloqueio_perfil_cancela_reservas();
      `);
    } catch (err) {
      console.warn('Aviso na migracao automatica do banco:', err);
    }
  }

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
    if (e instanceof BadRequestException || (e?.status && typeof e?.getStatus === 'function')) {
      return e;
    }
    const msg: string = e?.message || 'erro de banco de dados';
    if (/^RN\d{2}:/.test(msg)) return new BadRequestException(msg);          // regra de negocio
    if (e?.code === '23505') {
      if (e?.constraint === 'uk_unidade_proprietario_ativo' || msg.includes('uk_unidade_proprietario_ativo')) {
        return new BadRequestException('Erro de cadastro: Este apartamento já possui um proprietário ativo cadastrado.');
      }
      if (e?.constraint === 'uk_unidade_inquilino_ativo' || msg.includes('uk_unidade_inquilino_ativo')) {
        return new BadRequestException('Erro de cadastro: Este apartamento já possui um inquilino ativo cadastrado.');
      }
      if (e?.constraint?.includes('cpf') || e?.constraint?.includes('uid_firebase') || msg.includes('cpf') || msg.includes('uid_firebase')) {
        return new BadRequestException('Erro de cadastro: Este CPF já possui cadastro no sistema.');
      }
      if (e?.constraint?.includes('email') || msg.includes('email')) {
        return new BadRequestException('Erro de cadastro: Este e-mail já está cadastrado no sistema.');
      }
      return new BadRequestException('Registro duplicado: ' + (e.detail || msg));
    }
    if (e?.code === '22001' || msg.includes('value too long')) {
      return new BadRequestException('Erro de cadastro: O valor digitado para um dos campos (ex.: celular ou telefone) ultrapassa o limite permitido.');
    }
    if (e?.code === '23503') return new BadRequestException('Referência inexistente no sistema: ' + (e.detail || msg));
    if (e?.code === '23514') {
      if (e?.constraint === 'ck_pessoa_cpf' || msg.includes('ck_pessoa_cpf')) {
        return new BadRequestException('Erro de cadastro: O CPF deve conter exatamente 11 dígitos numéricos.');
      }
      if (e?.constraint === 'ck_pessoa_email' || msg.includes('ck_pessoa_email')) {
        return new BadRequestException('Erro de cadastro: Formato de e-mail inválido.');
      }
      if (e?.constraint === 'ck_pessoa_nascimento' || msg.includes('ck_pessoa_nascimento')) {
        return new BadRequestException('Erro de cadastro: A data de nascimento deve ser anterior à data de hoje.');
      }
      return new BadRequestException('Valor inválido para as regras do sistema: ' + (e.constraint || msg));
    }
    console.error('[DB] erro inesperado:', e?.code || 'desconhecido', e?.message || '', e?.constraint || '');
    return new InternalServerErrorException('Erro interno de banco de dados: ' + (e?.message || 'falha na operação.'));
  }

  onModuleDestroy() { return this.pool.end(); }
}
