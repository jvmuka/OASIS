-- ==============================================================================
-- SCRIPT DE LIMPEZA GERAL PARA PRODUÇÃO / TESTES DEFINITIVOS (OASIS)
-- Preserva:
--   1. Estrutura Física: Condomínio, Blocos, Unidades e Vagas de Garagem.
--   2. Módulos do Sistema e Feature Flags do Condomínio.
--   3. Usuário Master: superadmin@oasis.com (com perfil SUPERADMIN ativo).
-- Zera:
--   - Todas as pessoas (moradores, síndicos, porteiros, dependentes).
--   - Todas as áreas comuns, horários e utensílios.
--   - Todas as reservas, chamados, encomendas, avisos e chaves.
--   - Todos os vínculos de moradores com unidades e códigos de acesso.
-- ==============================================================================

BEGIN;

-- 1. Movimentações operacionais de chamados
TRUNCATE TABLE chamado_mensagem CASCADE;
TRUNCATE TABLE chamado CASCADE;

-- 2. Movimentações de encomendas
TRUNCATE TABLE encomenda CASCADE;

-- 3. Mural de avisos e confirmações de leitura
TRUNCATE TABLE aviso_perfil CASCADE;
TRUNCATE TABLE aviso CASCADE;

-- 4. Chaves e registros de empréstimo/entrega
TRUNCATE TABLE entrega_chave CASCADE;
TRUNCATE TABLE chave CASCADE;

-- 5. Reservas e bloqueios operacionais
TRUNCATE TABLE reserva CASCADE;
TRUNCATE TABLE bloqueio_area CASCADE;
TRUNCATE TABLE bloqueio_perfil CASCADE;

-- 6. Áreas comuns, utensílios e horários
TRUNCATE TABLE area_utensilio CASCADE;
TRUNCATE TABLE area_horario CASCADE;
TRUNCATE TABLE area_comum CASCADE;

-- 7. Vínculos de moradia e parentesco
TRUNCATE TABLE pessoa_unidade CASCADE;

-- 8. Códigos de primeiro acesso e recuperação
TRUNCATE TABLE codigo_primeiro_acesso CASCADE;

-- 9. Remover perfis de todos que não são SUPERADMIN
DELETE FROM perfil WHERE tipo_perfil <> 'SUPERADMIN';

-- 10. Remover todas as pessoas de teste (mantendo apenas o superadmin@oasis.com)
DELETE FROM pessoa WHERE email IS DISTINCT FROM 'superadmin@oasis.com';

-- 11. Garantir que o superadmin@oasis.com existe, está ativo e com a senha definida (Admin@2026)
INSERT INTO pessoa (
    uid_firebase,
    nome,
    email,
    cpf,
    data_nascimento,
    celular,
    ativo,
    status_conta,
    senha_hash
) VALUES (
    'superadmin_oasis_master',
    'Super Administrador OASIS',
    'superadmin@oasis.com',
    '00000000000',
    '1990-01-01',
    '42999990000',
    TRUE,
    'ATIVO',
    'a62948617cce4ff3667dc2d501583441:5fe97992bfd8751e274ed09290a082023b1d420ecf9c3efebaea5571738dd221c47966c79e15e5c5a04c974adb00f1336b39cd89f1969387eefb13c1915f8923'
)
ON CONFLICT (email) DO UPDATE
SET ativo = TRUE,
    status_conta = 'ATIVO',
    senha_hash = 'a62948617cce4ff3667dc2d501583441:5fe97992bfd8751e274ed09290a082023b1d420ecf9c3efebaea5571738dd221c47966c79e15e5c5a04c974adb00f1336b39cd89f1969387eefb13c1915f8923';

-- 12. Garantir vínculo ativo de perfil SUPERADMIN
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

-- 13. Reiniciar contadores de sequências das tabelas zeradas
ALTER SEQUENCE area_comum_id_area_comum_seq RESTART WITH 1;
ALTER SEQUENCE area_horario_id_horario_seq RESTART WITH 1;
ALTER SEQUENCE area_utensilio_id_utensilio_seq RESTART WITH 1;
ALTER SEQUENCE chave_id_chave_seq RESTART WITH 1;
ALTER SEQUENCE reserva_id_reserva_seq RESTART WITH 1;
ALTER SEQUENCE entrega_chave_id_entrega_chave_seq RESTART WITH 1;
ALTER SEQUENCE bloqueio_area_id_bloqueio_area_seq RESTART WITH 1;
ALTER SEQUENCE bloqueio_perfil_id_bloqueio_perfil_seq RESTART WITH 1;
ALTER SEQUENCE encomenda_id_encomenda_seq RESTART WITH 1;
ALTER SEQUENCE aviso_id_aviso_seq RESTART WITH 1;
ALTER SEQUENCE aviso_perfil_id_aviso_perfil_seq RESTART WITH 1;
ALTER SEQUENCE codigo_primeiro_acesso_id_codigo_seq RESTART WITH 1;
ALTER SEQUENCE chamado_id_chamado_seq RESTART WITH 1;
ALTER SEQUENCE chamado_mensagem_id_chamado_mensagem_seq RESTART WITH 1;
ALTER SEQUENCE pessoa_unidade_id_pessoa_unidade_seq RESTART WITH 1;

COMMIT;
