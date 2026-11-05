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
      try {
        await this.pool.query("ALTER TYPE tipo_perfil_enum ADD VALUE IF NOT EXISTS 'SUPERADMIN'");
      } catch {}

      await this.pool.query(`
        ALTER TABLE vaga_garagem ADD COLUMN IF NOT EXISTS metragem_m2 NUMERIC(6,2) NOT NULL DEFAULT 12.00;
        ALTER TABLE vaga_garagem DROP CONSTRAINT IF EXISTS ck_vaga_metragem_positiva;
        ALTER TABLE vaga_garagem ADD CONSTRAINT ck_vaga_metragem_positiva CHECK (metragem_m2 > 0);

        ALTER TABLE unidade ADD COLUMN IF NOT EXISTS andar INTEGER NOT NULL DEFAULT 1;
        ALTER TABLE unidade DROP CONSTRAINT IF EXISTS ck_unidade_andar;
        ALTER TABLE unidade ADD CONSTRAINT ck_unidade_andar CHECK (andar >= 0);
        UPDATE unidade SET andar = (numero_apartamento::INTEGER / 10) WHERE numero_apartamento ~ '^[0-9]+$';

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
        ALTER TABLE aviso ADD COLUMN IF NOT EXISTS anexo_url VARCHAR(255);
        ALTER TABLE aviso ADD COLUMN IF NOT EXISTS anexo_nome VARCHAR(255);
        ALTER TABLE aviso ADD COLUMN IF NOT EXISTS anexo_tipo VARCHAR(50);

        ALTER TABLE pessoa ALTER COLUMN data_nascimento DROP NOT NULL;
        ALTER TABLE pessoa DROP CONSTRAINT IF EXISTS ck_pessoa_nascimento;
        ALTER TABLE pessoa ADD CONSTRAINT ck_pessoa_nascimento CHECK (data_nascimento IS NULL OR data_nascimento < CURRENT_DATE);

        ALTER TABLE pessoa ALTER COLUMN email DROP NOT NULL;
        ALTER TABLE pessoa DROP CONSTRAINT IF EXISTS ck_pessoa_email;
        ALTER TABLE pessoa ADD CONSTRAINT ck_pessoa_email CHECK (email IS NULL OR email LIKE '%_@_%._%');

        ALTER TABLE pessoa_unidade DROP CONSTRAINT IF EXISTS ck_pu_dependente_regra;
        ALTER TABLE pessoa_unidade ADD CONSTRAINT ck_pu_dependente_regra CHECK (
            (tipo_vinculo = 'DEPENDENTE' AND (id_responsavel IS NULL OR id_responsavel <> id_pessoa))
            OR
            (tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO', 'VISITANTE', 'PRESTADOR_SERVICO') AND id_responsavel IS NULL)
        );

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

        INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular, ativo, status_conta)
        VALUES ('superadmin_oasis_master', 'Super Administrador OASIS', 'superadmin@oasis.com', '00000000000', '1990-01-01', '42999990000', TRUE, 'ATIVO')
        ON CONFLICT (email) DO NOTHING;

        INSERT INTO perfil (id_pessoa, tipo_perfil, data_inicio)
        SELECT p.id_pessoa, 'SUPERADMIN', CURRENT_DATE
          FROM pessoa p
         WHERE p.email = 'superadmin@oasis.com'
           AND NOT EXISTS (
             SELECT 1 FROM perfil pf 
              WHERE pf.id_pessoa = p.id_pessoa 
                AND pf.tipo_perfil = 'SUPERADMIN' 
                AND pf.data_fim IS NULL
           );
      

        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_chamado_enum') THEN
            CREATE TYPE categoria_chamado_enum AS ENUM (
              'LIMPEZA',
              'AVARIA_QUEBRADO',
              'MANUTENCAO',
              'CONVIVENCIA_BARULHO',
              'OUTROS'
            );
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_chamado_enum') THEN
            CREATE TYPE status_chamado_enum AS ENUM (
              'EM_ANALISE',
              'EM_ANDAMENTO',
              'REALIZADA',
              'ARQUIVADA'
            );
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS chamado (
          id_chamado SERIAL PRIMARY KEY,
          id_unidade INTEGER NOT NULL REFERENCES unidade(id_unidade) ON DELETE RESTRICT,
          id_pessoa_autor INTEGER NOT NULL REFERENCES pessoa(id_pessoa) ON DELETE RESTRICT,
          id_perfil_autor INTEGER NOT NULL REFERENCES perfil(id_perfil) ON DELETE RESTRICT,
          id_area_comum INTEGER REFERENCES area_comum(id_area_comum) ON DELETE SET NULL,
          categoria categoria_chamado_enum NOT NULL,
          titulo VARCHAR(120) NOT NULL,
          descricao TEXT NOT NULL,
          local_especifico VARCHAR(150),
          status status_chamado_enum NOT NULL DEFAULT 'EM_ANALISE',
          imagem_url VARCHAR(255),
          data_hora_abertura TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          data_hora_fechamento TIMESTAMP WITH TIME ZONE,
          data_hora_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chamado_unidade ON chamado(id_unidade);
        CREATE INDEX IF NOT EXISTS idx_chamado_status ON chamado(status);
        CREATE INDEX IF NOT EXISTS idx_chamado_categoria ON chamado(categoria);
        CREATE INDEX IF NOT EXISTS idx_chamado_abertura ON chamado(data_hora_abertura DESC);

        CREATE TABLE IF NOT EXISTS chamado_mensagem (
          id_chamado_mensagem SERIAL PRIMARY KEY,
          id_chamado INTEGER NOT NULL REFERENCES chamado(id_chamado) ON DELETE CASCADE,
          id_pessoa INTEGER NOT NULL REFERENCES pessoa(id_pessoa) ON DELETE RESTRICT,
          id_perfil INTEGER NOT NULL REFERENCES perfil(id_perfil) ON DELETE RESTRICT,
          origem VARCHAR(20) NOT NULL CHECK (origem IN ('MORADOR', 'ADMINISTRACAO')),
          mensagem TEXT NOT NULL,
          anexo_url VARCHAR(255),
          data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chamado_msg_chamado ON chamado_mensagem(id_chamado, data_hora ASC);

        CREATE TABLE IF NOT EXISTS condominio (
            id_condominio       SERIAL          PRIMARY KEY,
            nome                VARCHAR(120)    NOT NULL,
            razao_social        VARCHAR(150),
            cnpj                CHAR(14)        UNIQUE,
            slug                VARCHAR(60)     NOT NULL UNIQUE,
            endereco_completo   VARCHAR(255),
            cidade              VARCHAR(80)     NOT NULL DEFAULT 'Ponta Grossa',
            uf                  CHAR(2)         NOT NULL DEFAULT 'PR',
            cep                 CHAR(8),
            telefone_contato    VARCHAR(20),
            email_contato       VARCHAR(150),
            logo_url            VARCHAR(255),
            ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
            criado_em           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            atualizado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_condominio_slug ON condominio(slug);
        CREATE INDEX IF NOT EXISTS idx_condominio_ativo ON condominio(ativo);

        INSERT INTO condominio (id_condominio, nome, slug, cidade, uf, ativo)
        VALUES (1, 'Condomínio Residencial OASIS', 'oasis-central', 'Ponta Grossa', 'PR', TRUE)
        ON CONFLICT (id_condominio) DO UPDATE
        SET nome = EXCLUDED.nome, slug = EXCLUDED.slug;

        SELECT setval('condominio_id_condominio_seq', (SELECT COALESCE(MAX(id_condominio), 1) FROM condominio));

        ALTER TABLE bloco ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        ALTER TABLE bloco DROP CONSTRAINT IF EXISTS bloco_nome_key;
        ALTER TABLE bloco DROP CONSTRAINT IF EXISTS uk_bloco_condominio_nome;
        ALTER TABLE bloco ADD CONSTRAINT uk_bloco_condominio_nome UNIQUE (id_condominio, nome);
        CREATE INDEX IF NOT EXISTS idx_bloco_condominio ON bloco(id_condominio);

        ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        ALTER TABLE area_comum DROP CONSTRAINT IF EXISTS area_comum_nome_key;
        ALTER TABLE area_comum DROP CONSTRAINT IF EXISTS uk_area_condominio_nome;
        ALTER TABLE area_comum ADD CONSTRAINT uk_area_condominio_nome UNIQUE (id_condominio, nome);
        CREATE INDEX IF NOT EXISTS idx_area_condominio ON area_comum(id_condominio);

        ALTER TABLE aviso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        CREATE INDEX IF NOT EXISTS idx_aviso_condominio ON aviso(id_condominio);

        ALTER TABLE chave ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        CREATE INDEX IF NOT EXISTS idx_chave_condominio ON chave(id_condominio);

        ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        CREATE INDEX IF NOT EXISTS idx_cpa_condominio ON codigo_primeiro_acesso(id_condominio);

        ALTER TABLE chamado ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
        CREATE INDEX IF NOT EXISTS idx_chamado_condominio ON chamado(id_condominio);

        ALTER TABLE perfil ADD COLUMN IF NOT EXISTS id_condominio INTEGER REFERENCES condominio(id_condominio);
        UPDATE perfil SET id_condominio = 1 WHERE id_condominio IS NULL AND tipo_perfil <> 'SUPERADMIN';
        CREATE INDEX IF NOT EXISTS idx_perfil_condominio ON perfil(id_condominio);

        -- Módulos do Sistema e Tenancy Modular
        CREATE TABLE IF NOT EXISTS modulo_sistema (
            codigo          VARCHAR(40)     PRIMARY KEY,
            nome            VARCHAR(80)     NOT NULL,
            descricao       VARCHAR(255)    NOT NULL,
            categoria       VARCHAR(40)     NOT NULL DEFAULT 'OPERACIONAL',
            icone           VARCHAR(30)     NOT NULL DEFAULT 'wrench',
            ordem_exibicao  INTEGER         NOT NULL DEFAULT 0,
            criado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS condominio_modulo (
            id_condominio_modulo SERIAL PRIMARY KEY,
            id_condominio        INTEGER NOT NULL REFERENCES condominio(id_condominio) ON DELETE CASCADE,
            codigo_modulo        VARCHAR(40) NOT NULL REFERENCES modulo_sistema(codigo) ON DELETE RESTRICT,
            ativo                BOOLEAN NOT NULL DEFAULT TRUE,
            data_ativacao        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data_desativacao     TIMESTAMP WITH TIME ZONE,
            CONSTRAINT uk_condominio_modulo UNIQUE (id_condominio, codigo_modulo)
        );

        CREATE INDEX IF NOT EXISTS idx_cm_condo ON condominio_modulo(id_condominio);
        CREATE INDEX IF NOT EXISTS idx_cm_ativo ON condominio_modulo(id_condominio, ativo);

        INSERT INTO modulo_sistema (codigo, nome, descricao, icone, ordem_exibicao) VALUES
        ('RESERVAS_AREAS', 'Reservas de Áreas Comuns', 'Agendamento de salões, churrasqueiras e espaços reserváveis com regras de convivência.', 'calendar', 1),
        ('AREAS_LIVRES', 'Áreas de Uso Livre', 'Monitoramento de ocupação e lotação em tempo real (Academia, Piscina, Sala de Jogos).', 'clock', 2),
        ('ENCOMENDAS_PACOTES', 'Gestão de Encomendas', 'Registro de entrada, notificações de entrega e controle de retirada de pacotes na portaria.', 'package', 3),
        ('CONTROLE_CHAVES', 'Controle de Chaves', 'Empréstimo, devolução e controle de posse de chaves de áreas comuns e técnicas.', 'key', 4),
        ('MURAL_AVISOS', 'Mural de Avisos & Comunicados', 'Publicação oficial de comunicados gerais com anexos e confirmação de leitura.', 'megaphone', 5),
        ('CHAMADOS_OCORRENCIAS', 'Gestão de Chamados & Avarias', 'Abertura particular de chamados de limpeza, avarias e manutenção para triagem do síndico.', 'wrench', 6),
        ('DEPENDENTES_FAMILIA', 'Gestão Familiar & Dependentes', 'Cadastro e aprovação de dependentes, familiares e inquilinos vinculados à residência.', 'users', 7)
        ON CONFLICT (codigo) DO UPDATE
        SET nome = EXCLUDED.nome,
            descricao = EXCLUDED.descricao,
            icone = EXCLUDED.icone,
            ordem_exibicao = EXCLUDED.ordem_exibicao;

        INSERT INTO condominio_modulo (id_condominio, codigo_modulo, ativo)
        SELECT c.id_condominio, m.codigo, TRUE
          FROM condominio c
         CROSS JOIN modulo_sistema m
        ON CONFLICT (id_condominio, codigo_modulo) DO NOTHING;`);
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
