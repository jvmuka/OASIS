-- =====================================================================
-- Migracao: Tabelas de Chamados e Ocorrencias
-- Data: 2026-11-04
-- =====================================================================

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
