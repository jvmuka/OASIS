-- =====================================================================
-- Migração: Arquitetura Multi-Condomínio (Multi-Tenancy)
-- Data: 2026-11-05
-- =====================================================================

-- 1. Criação da tabela condominio (Tenants)
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

-- 2. Carga inicial e garantia do Condomínio 1 (OASIS)
INSERT INTO condominio (id_condominio, nome, slug, cidade, uf, ativo)
VALUES (1, 'Condomínio Residencial OASIS', 'oasis-central', 'Ponta Grossa', 'PR', TRUE)
ON CONFLICT (id_condominio) DO UPDATE
SET nome = EXCLUDED.nome, slug = EXCLUDED.slug;

SELECT setval('condominio_id_condominio_seq', (SELECT COALESCE(MAX(id_condominio), 1) FROM condominio));

-- 3. Bloco (recebe id_condominio e constraint única composta)
ALTER TABLE bloco ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE bloco DROP CONSTRAINT IF EXISTS bloco_nome_key;
ALTER TABLE bloco DROP CONSTRAINT IF EXISTS uk_bloco_condominio_nome;
ALTER TABLE bloco ADD CONSTRAINT uk_bloco_condominio_nome UNIQUE (id_condominio, nome);
CREATE INDEX IF NOT EXISTS idx_bloco_condominio ON bloco(id_condominio);

-- 4. Área Comum (recebe id_condominio e constraint única composta)
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE area_comum DROP CONSTRAINT IF EXISTS area_comum_nome_key;
ALTER TABLE area_comum DROP CONSTRAINT IF EXISTS uk_area_condominio_nome;
ALTER TABLE area_comum ADD CONSTRAINT uk_area_condominio_nome UNIQUE (id_condominio, nome);
CREATE INDEX IF NOT EXISTS idx_area_condominio ON area_comum(id_condominio);

-- 5. Aviso (Mural)
ALTER TABLE aviso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
CREATE INDEX IF NOT EXISTS idx_aviso_condominio ON aviso(id_condominio);

-- 6. Chave da Portaria
ALTER TABLE chave ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
CREATE INDEX IF NOT EXISTS idx_chave_condominio ON chave(id_condominio);

-- 7. Código de Primeiro Acesso
ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
CREATE INDEX IF NOT EXISTS idx_cpa_condominio ON codigo_primeiro_acesso(id_condominio);

-- 8. Chamado / Ocorrência
ALTER TABLE chamado ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
CREATE INDEX IF NOT EXISTS idx_chamado_condominio ON chamado(id_condominio);

-- 9. Perfil (Vincula porteiros e síndicos ao condomínio específico, mantendo Superadmin global)
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS id_condominio INTEGER REFERENCES condominio(id_condominio);
UPDATE perfil SET id_condominio = 1 WHERE id_condominio IS NULL AND tipo_perfil <> 'SUPERADMIN';
CREATE INDEX IF NOT EXISTS idx_perfil_condominio ON perfil(id_condominio);
