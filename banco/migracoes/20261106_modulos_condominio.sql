-- Migração: Arquitetura Modular e Gestão de Módulos por Condomínio
-- Data: 04/11/2026

-- 1. Catálogo Estático de Módulos do Sistema
CREATE TABLE IF NOT EXISTS modulo_sistema (
    codigo          VARCHAR(40)     PRIMARY KEY,
    nome            VARCHAR(80)     NOT NULL,
    descricao       VARCHAR(255)    NOT NULL,
    categoria       VARCHAR(40)     NOT NULL DEFAULT 'OPERACIONAL',
    icone           VARCHAR(30)     NOT NULL DEFAULT 'wrench',
    ordem_exibicao  INTEGER         NOT NULL DEFAULT 0,
    criado_em       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Configuração de Módulos por Condomínio (Tenancy Modular)
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

-- 3. Carga Inicial do Catálogo de Módulos
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

-- 4. Ativação Padrão de Todos os Módulos para Condomínios Existentes
INSERT INTO condominio_modulo (id_condominio, codigo_modulo, ativo)
SELECT c.id_condominio, m.codigo, TRUE
  FROM condominio c
 CROSS JOIN modulo_sistema m
ON CONFLICT (id_condominio, codigo_modulo) DO NOTHING;

