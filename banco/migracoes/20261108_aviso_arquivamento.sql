-- ==============================================================================
-- Migração: Suporte ao Arquivamento de Avisos
-- Data: 2026-11-05
-- Regra de Negócio: Ao invés de excluir, a administração arquiva avisos.
--                   Avisos arquivados não são exibidos no mural dos moradores.
-- ==============================================================================

ALTER TABLE aviso ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE aviso ADD COLUMN IF NOT EXISTS data_hora_arquivamento TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_aviso_arquivado ON aviso(id_condominio, arquivado);
