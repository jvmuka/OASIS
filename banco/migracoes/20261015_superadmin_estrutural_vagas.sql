-- =====================================================================
-- Migração: Perfil SUPERADMIN, Vagas de Garagem com Metragem e Andares
-- Data: 15/10/2026
-- =====================================================================

-- 1. Adicionar valor SUPERADMIN ao enum tipo_perfil_enum se não existir
ALTER TYPE tipo_perfil_enum ADD VALUE IF NOT EXISTS 'SUPERADMIN';

-- 2. Adicionar coluna metragem_m2 à tabela vaga_garagem
ALTER TABLE vaga_garagem 
  ADD COLUMN IF NOT EXISTS metragem_m2 NUMERIC(6,2) NOT NULL DEFAULT 12.00;

ALTER TABLE vaga_garagem DROP CONSTRAINT IF EXISTS ck_vaga_metragem_positiva;
ALTER TABLE vaga_garagem ADD CONSTRAINT ck_vaga_metragem_positiva CHECK (metragem_m2 > 0);

COMMENT ON COLUMN vaga_garagem.metragem_m2 IS 'Área útil da vaga de garagem em metros quadrados (m²)';

-- 3. Adicionar coluna andar à tabela unidade
ALTER TABLE unidade 
  ADD COLUMN IF NOT EXISTS andar INTEGER NOT NULL DEFAULT 1;

ALTER TABLE unidade DROP CONSTRAINT IF EXISTS ck_unidade_andar;
ALTER TABLE unidade ADD CONSTRAINT ck_unidade_andar CHECK (andar >= 0);

COMMENT ON COLUMN unidade.andar IS 'Andar físico da unidade no bloco (0 para térreo, 1..N para andares)';

-- 4. Atualizar andares das unidades existentes (4 apartamentos por andar; o prefixo antes do último dígito é o andar)
UPDATE unidade 
   SET andar = (numero_apartamento::INTEGER / 10) 
 WHERE numero_apartamento ~ '^[0-9]+$';

-- 5. Ajustar pessoa para permitir data_nascimento nula se aplicável
ALTER TABLE pessoa ALTER COLUMN data_nascimento DROP NOT NULL;

-- 6. Criar usuário Superadmin padrão de demonstração / master
INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular, ativo, status_conta)
VALUES ('superadmin_oasis_master', 'Super Administrador OASIS', 'superadmin@oasis.com', '00000000000', '1990-01-01', '42999990000', TRUE, 'ATIVO')
ON CONFLICT (email) DO UPDATE 
   SET ativo = TRUE, status_conta = 'ATIVO';

-- 7. Garantir vínculo do perfil SUPERADMIN
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
