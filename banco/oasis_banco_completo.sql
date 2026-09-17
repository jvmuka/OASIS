-- =====================================================================
-- OASIS - Sistema de gestao de reservas e controle de acesso
-- Script de criacao do banco de dados - PostgreSQL 16
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados (dominios fechados)
-- ---------------------------------------------------------------------
CREATE TYPE tipo_perfil_enum            AS ENUM ('MORADOR','SINDICO','PORTEIRO');
CREATE TYPE tipo_vinculo_enum           AS ENUM ('PROPRIETARIO','INQUILINO','DEPENDENTE');
CREATE TYPE pavimento_enum              AS ENUM ('TERREO','SUBSOLO_1','SUBSOLO_2');
CREATE TYPE tipo_vaga_enum              AS ENUM ('SIMPLES','DUPLA');
CREATE TYPE tipo_acesso_enum            AS ENUM ('LIVRE','BIOMETRIA','FACIAL','CHAVE');
CREATE TYPE tipo_uso_enum               AS ENUM ('COMUM','EXCLUSIVO','RESERVAVEL');
CREATE TYPE dia_semana_enum             AS ENUM ('DOMINGO','SEGUNDA','TERCA','QUARTA',
                                                 'QUINTA','SEXTA','SABADO');
CREATE TYPE status_reserva_enum         AS ENUM ('ATIVA','CANCELADA','CONCLUIDA');
CREATE TYPE status_chave_enum           AS ENUM ('DISPONIVEL','EMPRESTADA','EXTRAVIADA');
CREATE TYPE motivo_bloqueio_area_enum   AS ENUM ('MANUTENCAO','LIMPEZA','EVENTO','OBRA');
CREATE TYPE motivo_bloqueio_perfil_enum AS ENUM ('INFRACAO','INADIMPLENCIA','SOLICITACAO','OUTRO');
CREATE TYPE tamanho_encomenda_enum      AS ENUM ('PEQUENO','MEDIO','GRANDE');
CREATE TYPE status_encomenda_enum       AS ENUM ('AGUARDANDO_RETIRADA','RETIRADA','DEVOLVIDA');
CREATE TYPE retirado_por_enum           AS ENUM ('PROPRIO','TERCEIRO','PORTEIRO');
CREATE TYPE escopo_aviso_enum           AS ENUM ('MURAL','INDIVIDUAL');
CREATE TYPE grau_parentesco_enum        AS ENUM ('CONJUGE','FILHO','PAI_MAE','OUTRO');
CREATE TYPE status_aprovacao_enum       AS ENUM ('PENDENTE','APROVADO','REJEITADO');
CREATE TYPE status_codigo_enum          AS ENUM ('DISPONIVEL','USADO','EXPIRADO','CANCELADO');

-- =====================================================================
-- Parte 2 de 3: criacao das tabelas
-- As tabelas sao criadas na ordem de dependencia das chaves estrangeiras
-- =====================================================================

CREATE TABLE bloco (
    id_bloco    SERIAL       PRIMARY KEY,
    nome        VARCHAR(20)  NOT NULL UNIQUE,
    descricao   VARCHAR(120)
);

CREATE TABLE unidade (
    id_unidade          SERIAL       PRIMARY KEY,
    id_bloco            INTEGER      NOT NULL,
    numero_apartamento  VARCHAR(10)  NOT NULL,
    numero_vagas        INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT fk_unidade_bloco   FOREIGN KEY (id_bloco) REFERENCES bloco (id_bloco),
    CONSTRAINT uk_unidade_ap      UNIQUE (id_bloco, numero_apartamento),
    CONSTRAINT ck_unidade_vagas   CHECK (numero_vagas >= 0)
);

CREATE TABLE vaga_garagem (
    id_vaga        SERIAL         PRIMARY KEY,
    id_unidade     INTEGER        NOT NULL,
    identificacao  VARCHAR(10)    NOT NULL UNIQUE,
    pavimento      pavimento_enum NOT NULL,
    tipo_vaga      tipo_vaga_enum NOT NULL,
    coberta        BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_vaga_unidade FOREIGN KEY (id_unidade) REFERENCES unidade (id_unidade)
);

CREATE TABLE pessoa (
    id_pessoa        SERIAL        PRIMARY KEY,
    uid_firebase     VARCHAR(128)  NOT NULL UNIQUE,
    nome             VARCHAR(100)  NOT NULL,
    email            VARCHAR(150)  NOT NULL UNIQUE,
    cpf              CHAR(11)      NOT NULL UNIQUE,
    data_nascimento  DATE          NOT NULL,
    celular          VARCHAR(30),
    senha_hash       VARCHAR(255),
    status_conta     VARCHAR(30)   NOT NULL DEFAULT 'ATIVO',
    ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_pessoa_cpf        CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_pessoa_email      CHECK (email LIKE '%_@_%._%'),
    CONSTRAINT ck_pessoa_nascimento CHECK (data_nascimento < CURRENT_DATE),
    CONSTRAINT ck_pessoa_status     CHECK (status_conta IN ('AGUARDANDO_PRIMEIRO_ACESSO', 'ATIVO', 'BLOQUEADO'))
);

CREATE TABLE pessoa_unidade (
    id_pessoa_unidade     SERIAL                 PRIMARY KEY,
    id_pessoa             INTEGER                NOT NULL,
    id_unidade            INTEGER                NOT NULL,
    tipo_vinculo          tipo_vinculo_enum      NOT NULL,
    id_responsavel        INTEGER,
    grau_parentesco       grau_parentesco_enum,
    status_aprovacao      status_aprovacao_enum  NOT NULL DEFAULT 'APROVADO',
    motivo_rejeicao       VARCHAR(255),
    reside                BOOLEAN                NOT NULL DEFAULT TRUE,
    data_inicio_ocupacao  DATE                   NOT NULL DEFAULT CURRENT_DATE,
    data_fim_ocupacao     DATE,
    CONSTRAINT fk_pu_pessoa       FOREIGN KEY (id_pessoa)       REFERENCES pessoa (id_pessoa),
    CONSTRAINT fk_pu_unidade      FOREIGN KEY (id_unidade)      REFERENCES unidade (id_unidade),
    CONSTRAINT fk_pu_responsavel  FOREIGN KEY (id_responsavel)  REFERENCES pessoa (id_pessoa) ON DELETE RESTRICT,
    CONSTRAINT uk_pu_vinculo      UNIQUE (id_pessoa, id_unidade, data_inicio_ocupacao),
    CONSTRAINT ck_pu_periodo      CHECK (data_fim_ocupacao IS NULL
                                         OR data_fim_ocupacao >= data_inicio_ocupacao),
    CONSTRAINT ck_pu_dependente_regra CHECK (
        (tipo_vinculo = 'DEPENDENTE' AND id_responsavel IS NOT NULL AND id_responsavel <> id_pessoa)
        OR
        (tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO') AND id_responsavel IS NULL)
    )
);

CREATE UNIQUE INDEX uk_unidade_proprietario_ativo
    ON pessoa_unidade (id_unidade)
    WHERE tipo_vinculo = 'PROPRIETARIO' AND data_fim_ocupacao IS NULL;

CREATE UNIQUE INDEX uk_unidade_inquilino_ativo
    ON pessoa_unidade (id_unidade)
    WHERE tipo_vinculo = 'INQUILINO' AND data_fim_ocupacao IS NULL;

CREATE INDEX idx_pu_responsavel ON pessoa_unidade (id_responsavel);

CREATE TABLE perfil (
    id_perfil           SERIAL            PRIMARY KEY,
    id_pessoa           INTEGER           NOT NULL,
    tipo_perfil         tipo_perfil_enum  NOT NULL,
    data_inicio         DATE              NOT NULL DEFAULT CURRENT_DATE,
    data_fim            DATE,
    recebe_notificacao  BOOLEAN           NOT NULL DEFAULT TRUE,
    token_fcm           VARCHAR(255),
    CONSTRAINT fk_perfil_pessoa FOREIGN KEY (id_pessoa) REFERENCES pessoa (id_pessoa),
    CONSTRAINT uk_perfil        UNIQUE (id_pessoa, tipo_perfil, data_inicio),
    CONSTRAINT ck_perfil_data   CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

CREATE TABLE area_comum (
    id_area_comum             SERIAL            PRIMARY KEY,
    nome                      VARCHAR(60)       NOT NULL UNIQUE,
    descricao                 VARCHAR(255),
    capacidade                INTEGER           NOT NULL,
    idade_minima              INTEGER           NOT NULL DEFAULT 0,
    tipo_acesso               tipo_acesso_enum  NOT NULL,
    tipo_uso                  tipo_uso_enum     NOT NULL,
    duracao_slot_min          INTEGER           NOT NULL DEFAULT 60,
    antecedencia_minima_dias  INTEGER           NOT NULL DEFAULT 0,
    antecedencia_minima_horas INTEGER           NOT NULL DEFAULT 0,
    antecedencia_maxima_dias  INTEGER           NOT NULL DEFAULT 30,
    prazo_cancelamento_horas  INTEGER           NOT NULL DEFAULT 24,
    limite_reservas_semana    INTEGER           NOT NULL DEFAULT 2,
    exige_chave               BOOLEAN           NOT NULL DEFAULT FALSE,
    valor                     NUMERIC(10,2)     NOT NULL DEFAULT 0,
    ativo                     BOOLEAN           NOT NULL DEFAULT TRUE,
    imagem_url                VARCHAR(500),
    observacoes               VARCHAR(255),
    CONSTRAINT ck_area_capacidade  CHECK (capacidade > 0),
    CONSTRAINT ck_area_idade       CHECK (idade_minima >= 0),
    CONSTRAINT ck_area_slot        CHECK (duracao_slot_min BETWEEN 1 AND 1440),
    CONSTRAINT ck_area_antec       CHECK (antecedencia_maxima_dias >= antecedencia_minima_dias
                                          AND antecedencia_minima_dias >= 0),
    CONSTRAINT ck_area_prazo       CHECK (prazo_cancelamento_horas >= 0),
    CONSTRAINT ck_area_limite      CHECK (limite_reservas_semana > 0),
    CONSTRAINT ck_area_valor       CHECK (valor >= 0)
);

CREATE TABLE area_horario (
    id_horario     SERIAL           PRIMARY KEY,
    id_area_comum  INTEGER          NOT NULL,
    dia_semana     dia_semana_enum  NOT NULL,
    hora_inicio    TIME             NOT NULL,
    hora_fim       TIME             NOT NULL,
    CONSTRAINT fk_horario_area FOREIGN KEY (id_area_comum)
        REFERENCES area_comum (id_area_comum) ON DELETE CASCADE,
    CONSTRAINT uk_horario      UNIQUE (id_area_comum, dia_semana, hora_inicio),
    CONSTRAINT ck_horario      CHECK (hora_fim > hora_inicio)
);

CREATE TABLE area_utensilio (
    id_utensilio   SERIAL       PRIMARY KEY,
    id_area_comum  INTEGER      NOT NULL,
    nome           VARCHAR(60)  NOT NULL,
    quantidade     INTEGER      NOT NULL DEFAULT 1,
    observacao     VARCHAR(255),
    CONSTRAINT fk_utensilio_area FOREIGN KEY (id_area_comum)
        REFERENCES area_comum (id_area_comum) ON DELETE CASCADE,
    CONSTRAINT uk_utensilio      UNIQUE (id_area_comum, nome),
    CONSTRAINT ck_utensilio_qtd  CHECK (quantidade > 0)
);

CREATE TABLE chave (
    id_chave       SERIAL             PRIMARY KEY,
    id_area_comum  INTEGER            NOT NULL,
    codigo         VARCHAR(20)        NOT NULL UNIQUE,
    status         status_chave_enum  NOT NULL DEFAULT 'DISPONIVEL',
    observacao     VARCHAR(255),
    CONSTRAINT fk_chave_area FOREIGN KEY (id_area_comum) REFERENCES area_comum (id_area_comum)
);

CREATE TABLE reserva (
    id_reserva              SERIAL               PRIMARY KEY,
    id_area_comum           INTEGER              NOT NULL,
    id_perfil               INTEGER              NOT NULL,
    data_hora_inicio        TIMESTAMP            NOT NULL,
    data_hora_fim           TIMESTAMP            NOT NULL,
    numero_pessoas          INTEGER              NOT NULL,
    status                  status_reserva_enum  NOT NULL DEFAULT 'ATIVA',
    data_hora_criacao       TIMESTAMP            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_cancelamento  TIMESTAMP,
    motivo_cancelamento     VARCHAR(255),
    observacao              VARCHAR(255),
    CONSTRAINT fk_reserva_area   FOREIGN KEY (id_area_comum) REFERENCES area_comum (id_area_comum),
    CONSTRAINT fk_reserva_perfil FOREIGN KEY (id_perfil)     REFERENCES perfil (id_perfil),
    CONSTRAINT ck_reserva_periodo  CHECK (data_hora_fim > data_hora_inicio),
    CONSTRAINT ck_reserva_mesmodia CHECK (data_hora_fim::date = data_hora_inicio::date),
    CONSTRAINT ck_reserva_pessoas  CHECK (numero_pessoas > 0),
    CONSTRAINT ck_reserva_cancel
        CHECK ((status  = 'CANCELADA' AND data_hora_cancelamento IS NOT NULL)
            OR (status <> 'CANCELADA' AND data_hora_cancelamento IS NULL))
);

CREATE TABLE entrega_chave (
    id_entrega_chave       SERIAL     PRIMARY KEY,
    id_chave               INTEGER    NOT NULL,
    id_perfil_solicitante  INTEGER    NOT NULL,
    id_perfil_entrega      INTEGER    NOT NULL,
    id_perfil_recebimento  INTEGER,
    id_reserva             INTEGER,
    data_hora_retirada     TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_devolucao    TIMESTAMP,
    observacao             VARCHAR(255),
    CONSTRAINT fk_ec_chave     FOREIGN KEY (id_chave)              REFERENCES chave (id_chave),
    CONSTRAINT fk_ec_solic     FOREIGN KEY (id_perfil_solicitante) REFERENCES perfil (id_perfil),
    CONSTRAINT fk_ec_entrega   FOREIGN KEY (id_perfil_entrega)     REFERENCES perfil (id_perfil),
    CONSTRAINT fk_ec_receb     FOREIGN KEY (id_perfil_recebimento) REFERENCES perfil (id_perfil),
    CONSTRAINT fk_ec_reserva   FOREIGN KEY (id_reserva)            REFERENCES reserva (id_reserva),
    CONSTRAINT ck_ec_devolucao CHECK (data_hora_devolucao IS NULL
                                      OR data_hora_devolucao >= data_hora_retirada)
);

CREATE TABLE bloqueio_area (
    id_bloqueio_area    SERIAL                     PRIMARY KEY,
    id_area_comum       INTEGER                    NOT NULL,
    id_perfil_registro  INTEGER                    NOT NULL,
    data_hora_inicio    TIMESTAMP                  NOT NULL,
    data_hora_fim       TIMESTAMP                  NOT NULL,
    motivo              motivo_bloqueio_area_enum  NOT NULL,
    descricao           VARCHAR(255),
    CONSTRAINT fk_ba_area    FOREIGN KEY (id_area_comum)      REFERENCES area_comum (id_area_comum),
    CONSTRAINT fk_ba_perfil  FOREIGN KEY (id_perfil_registro) REFERENCES perfil (id_perfil),
    CONSTRAINT ck_ba_periodo CHECK (data_hora_fim > data_hora_inicio)
);

CREATE TABLE bloqueio_perfil (
    id_bloqueio_perfil  SERIAL                       PRIMARY KEY,
    id_perfil           INTEGER                      NOT NULL,
    id_area_comum       INTEGER,
    id_perfil_registro  INTEGER                      NOT NULL,
    data_hora_inicio    TIMESTAMP                    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_fim       TIMESTAMP,
    motivo              motivo_bloqueio_perfil_enum  NOT NULL,
    descricao           VARCHAR(255),
    CONSTRAINT fk_bp_perfil   FOREIGN KEY (id_perfil)          REFERENCES perfil (id_perfil),
    CONSTRAINT fk_bp_area     FOREIGN KEY (id_area_comum)
                              REFERENCES area_comum (id_area_comum),
    CONSTRAINT fk_bp_registro FOREIGN KEY (id_perfil_registro) REFERENCES perfil (id_perfil),
    CONSTRAINT ck_bp_periodo  CHECK (data_hora_fim IS NULL OR data_hora_fim > data_hora_inicio)
);

CREATE TABLE encomenda (
    id_encomenda            SERIAL                  PRIMARY KEY,
    id_pessoa_destinatario  INTEGER                 NOT NULL,
    id_perfil_recebimento   INTEGER                 NOT NULL,
    id_perfil_entrega       INTEGER,
    descricao               VARCHAR(255),
    tamanho                 tamanho_encomenda_enum  NOT NULL,
    data_hora_recebimento   TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_retirada      TIMESTAMP,
    retirado_por            retirado_por_enum,
    nome_retirante          VARCHAR(100),
    status                  status_encomenda_enum   NOT NULL DEFAULT 'AGUARDANDO_RETIRADA',
    CONSTRAINT fk_enc_pessoa  FOREIGN KEY (id_pessoa_destinatario) REFERENCES pessoa (id_pessoa),
    CONSTRAINT fk_enc_receb   FOREIGN KEY (id_perfil_recebimento)  REFERENCES perfil (id_perfil),
    CONSTRAINT fk_enc_entrega FOREIGN KEY (id_perfil_entrega)      REFERENCES perfil (id_perfil),
    CONSTRAINT ck_enc_retirada
        CHECK ((data_hora_retirada IS NULL     AND retirado_por IS NULL)
            OR (data_hora_retirada IS NOT NULL AND retirado_por IS NOT NULL)),
    CONSTRAINT ck_enc_terceiro CHECK (retirado_por <> 'TERCEIRO' OR nome_retirante IS NOT NULL),
    CONSTRAINT ck_enc_ordem    CHECK (data_hora_retirada IS NULL
                                      OR data_hora_retirada >= data_hora_recebimento)
);

CREATE TABLE aviso (
    id_aviso              SERIAL             PRIMARY KEY,
    id_perfil_autor       INTEGER            NOT NULL,
    escopo                escopo_aviso_enum  NOT NULL DEFAULT 'MURAL',
    titulo                VARCHAR(120)       NOT NULL,
    conteudo              VARCHAR(2000)      NOT NULL,
    data_hora_publicacao  TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_expiracao   TIMESTAMP,
    fixado                BOOLEAN            NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_aviso_autor FOREIGN KEY (id_perfil_autor) REFERENCES perfil (id_perfil),
    CONSTRAINT ck_aviso_exp   CHECK (data_hora_expiracao IS NULL
                                     OR data_hora_expiracao > data_hora_publicacao)
);

CREATE TABLE aviso_perfil (
    id_aviso_perfil    SERIAL     PRIMARY KEY,
    id_aviso           INTEGER    NOT NULL,
    id_perfil          INTEGER    NOT NULL,
    lido               BOOLEAN    NOT NULL DEFAULT FALSE,
    data_hora_leitura  TIMESTAMP,
    notificado         BOOLEAN    NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_ap_aviso  FOREIGN KEY (id_aviso)  REFERENCES aviso (id_aviso) ON DELETE CASCADE,
    CONSTRAINT fk_ap_perfil FOREIGN KEY (id_perfil) REFERENCES perfil (id_perfil),
    CONSTRAINT uk_ap        UNIQUE (id_aviso, id_perfil),
    CONSTRAINT ck_ap_leitura CHECK ((lido = FALSE AND data_hora_leitura IS NULL)
                                 OR (lido = TRUE  AND data_hora_leitura IS NOT NULL))
);

CREATE TABLE codigo_primeiro_acesso (
    id_codigo            SERIAL              PRIMARY KEY,
    codigo               VARCHAR(20)         NOT NULL UNIQUE,
    id_pessoa            INTEGER             NOT NULL,
    id_perfil_gerador    INTEGER,
    status               status_codigo_enum  NOT NULL DEFAULT 'DISPONIVEL',
    data_criacao         TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao       TIMESTAMP           NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    data_utilizacao      TIMESTAMP,
    ip_origem            VARCHAR(45),
    CONSTRAINT fk_cpa_pessoa  FOREIGN KEY (id_pessoa)         REFERENCES pessoa (id_pessoa) ON DELETE CASCADE,
    CONSTRAINT fk_cpa_gerador FOREIGN KEY (id_perfil_gerador) REFERENCES perfil (id_perfil)
);

CREATE INDEX idx_cpa_codigo ON codigo_primeiro_acesso (codigo) WHERE status = 'DISPONIVEL';

-- =====================================================================
-- Parte 3 de 3: indices de apoio e carga inicial de dados
-- =====================================================================

-- ---------------------------------------------------------------------
-- Indices sobre as colunas mais utilizadas nas consultas e nos gatilhos
-- ---------------------------------------------------------------------
CREATE INDEX idx_reserva_area_periodo ON reserva (id_area_comum, data_hora_inicio, status);
CREATE INDEX idx_reserva_perfil       ON reserva (id_perfil, status);
CREATE INDEX idx_bloqueio_area_per    ON bloqueio_area
                                      (id_area_comum, data_hora_inicio, data_hora_fim);
CREATE INDEX idx_bloqueio_perfil_per  ON bloqueio_perfil (id_perfil, data_hora_inicio);
CREATE INDEX idx_pu_pessoa            ON pessoa_unidade (id_pessoa, data_fim_ocupacao);
CREATE INDEX idx_perfil_pessoa        ON perfil (id_pessoa, data_fim);
CREATE INDEX idx_encomenda_status     ON encomenda (status, data_hora_recebimento);
CREATE INDEX idx_entrega_chave_aberta ON entrega_chave (id_chave, data_hora_devolucao);
CREATE INDEX idx_aviso_perfil_lido    ON aviso_perfil (id_perfil, lido);

-- ---------------------------------------------------------------------
-- Carga inicial: estrutura do condominio
-- ---------------------------------------------------------------------
INSERT INTO bloco (nome, descricao) VALUES
    ('A', 'Bloco A');

DO $$
DECLARE
    f INT;
    a INT;
BEGIN
    FOR f IN 5..23 LOOP
        FOR a IN 1..4 LOOP
            INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas)
            VALUES (1, (f * 10) + a, 1);
        END LOOP;
    END LOOP;
END $$;

INSERT INTO vaga_garagem (id_unidade, identificacao, pavimento, tipo_vaga, coberta) VALUES
    (1, 'G-014', 'SUBSOLO_1', 'SIMPLES', TRUE),
    (1, 'G-015', 'SUBSOLO_1', 'SIMPLES', TRUE),
    (2, 'G-032', 'TERREO',    'SIMPLES', FALSE),
    (3, 'G-047', 'SUBSOLO_2', 'DUPLA',   TRUE);

-- ---------------------------------------------------------------------
-- Carga inicial: pessoas, perfis e vinculos
-- ---------------------------------------------------------------------
INSERT INTO pessoa (uid_firebase, nome, email, cpf, data_nascimento, celular) VALUES
    ('fb_uid_0001', 'Carlos Silva',    'carlos.silva@teste.com',
     '11122233344', '1985-04-12', '42999110001'),
    ('fb_uid_0002', 'Maria Santos',    'maria.santos@teste.com',
     '22233344455', '1990-09-30', '42999110002'),
    ('fb_uid_0003', 'Joao Oliveira',   'joao.oliveira@teste.com',
     '33344455566', '1998-01-25', '42999110003'),
    ('fb_uid_0004', 'Ana Paula Souza', 'ana.souza@teste.com',
     '44455566677', '1979-06-08', '42999110004'),
    ('fb_uid_0005', 'Roberto Lima',    'roberto.lima@teste.com',
     '55566677788', '1982-11-17', '42999110005'),
    ('fb_uid_0006', 'Helena Braga',    'helena.braga@teste.com',
     '66677788899', '1995-03-03', '42999110006');

INSERT INTO perfil (id_pessoa, tipo_perfil, data_inicio) VALUES
    (1, 'MORADOR',  '2024-02-01'),
    (2, 'MORADOR',  '2024-05-10'),
    (3, 'MORADOR',  '2025-08-01'),
    (4, 'SINDICO',  '2026-01-01'),
    (4, 'MORADOR',  '2020-03-15'),
    (5, 'PORTEIRO', '2023-07-01'),
    (6, 'MORADOR',  '2025-01-20');

INSERT INTO pessoa_unidade
    (id_pessoa, id_unidade, tipo_vinculo, id_responsavel, grau_parentesco, status_aprovacao, reside, data_inicio_ocupacao) VALUES
    (1, 1, 'PROPRIETARIO', NULL, NULL,     'APROVADO', TRUE, '2024-02-01'),
    (3, 1, 'DEPENDENTE',   1,    'FILHO',    'APROVADO', TRUE, '2025-08-01'),
    (2, 2, 'INQUILINO',    NULL, NULL,     'APROVADO', TRUE, '2024-05-10'),
    (4, 5, 'PROPRIETARIO', NULL, NULL,     'APROVADO', TRUE, '2020-03-15'),
    (6, 3, 'INQUILINO',    NULL, NULL,     'APROVADO', TRUE, '2025-01-20');

-- ---------------------------------------------------------------------
-- Carga inicial: codigos de primeiro acesso para testes
-- ---------------------------------------------------------------------
INSERT INTO codigo_primeiro_acesso (codigo, id_pessoa, id_perfil_gerador, status) VALUES
    ('OASIS-7489', 1, 4, 'DISPONIVEL'),
    ('OASIS-1234', 2, 4, 'DISPONIVEL'),
    ('OASIS-5678', 3, 4, 'DISPONIVEL');

-- ---------------------------------------------------------------------
-- Carga inicial: areas comuns, horarios, utensilios e chaves
-- ---------------------------------------------------------------------
-- colunas: nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso, duracao_slot_min,
--           antecedencia_minima_dias, antecedencia_maxima_dias,
--           prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor
INSERT INTO area_comum (nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso, duracao_slot_min,
                        antecedencia_minima_dias, antecedencia_maxima_dias,
                        prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor) VALUES
    ('Academia',            'Sala de musculacao e esteiras', 10, 16, 'BIOMETRIA', 'RESERVAVEL',
      60, 1, 15, 24, 2, FALSE,   0.00),
    ('Piscina',             'Piscina adulto e infantil',     30,  0, 'BIOMETRIA', 'RESERVAVEL',
     120, 2, 30, 24, 2, FALSE,   0.00),
    ('Salao de Festas',     'Salao com cozinha de apoio',    50, 18, 'CHAVE',     'RESERVAVEL',
     360, 7, 90, 72, 1, TRUE,  150.00),
    ('Churrasqueira',       'Area gourmet coberta',          15, 18, 'CHAVE',     'RESERVAVEL',
     240, 3, 60, 48, 1, TRUE,   60.00),
    ('Elevador de Servico', 'Uso para mudancas',              4, 18, 'LIVRE',     'RESERVAVEL',
     120, 0, 30,  6, 1, FALSE,   0.00);

INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim) VALUES
    (1, 'SEGUNDA', '06:00', '22:00'), (1, 'TERCA',  '06:00', '22:00'),
    (1, 'QUARTA',  '06:00', '22:00'), (1, 'QUINTA', '06:00', '22:00'),
    (1, 'SEXTA',   '06:00', '22:00'), (1, 'SABADO', '08:00', '18:00'),
    (1, 'DOMINGO', '08:00', '14:00'),
    (2, 'SABADO',  '09:00', '20:00'), (2, 'DOMINGO','09:00', '20:00'),
    (3, 'SEXTA',   '12:00', '23:00'), (3, 'SABADO', '10:00', '23:00'),
    (3, 'DOMINGO', '10:00', '22:00'),
    (4, 'SABADO',  '10:00', '22:00'), (4, 'DOMINGO','10:00', '22:00'),
    (5, 'SEGUNDA', '08:00', '17:00'), (5, 'TERCA',  '08:00', '17:00'),
    (5, 'QUARTA',  '08:00', '17:00'), (5, 'QUINTA', '08:00', '17:00'),
    (5, 'SEXTA',   '08:00', '17:00');

INSERT INTO area_utensilio (id_area_comum, nome, quantidade) VALUES
    (3, 'Mesa de plastico', 10), (3, 'Cadeira de plastico', 50),
    (3, 'Jogo de talheres',  4), (4, 'Grelha grande', 2), (4, 'Espeto', 12);

INSERT INTO chave (id_area_comum, codigo) VALUES
    (3, 'CH-SALAO-01'), (4, 'CH-CHURRAS-01'), (4, 'CH-CHURRAS-02');

-- =====================================================================
-- OASIS - Gatilhos (triggers) em PL/pgSQL - PostgreSQL 16
-- =====================================================================

-- ---------------------------------------------------------------------
-- RN01 a RN07: validacao completa da reserva
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_reserva() RETURNS TRIGGER AS $$
DECLARE
    v_area          area_comum%ROWTYPE;
    v_dia           dia_semana_enum;
    v_dias_antec    INTEGER;
    v_qtd_semana    INTEGER;
    v_nasc          DATE;
BEGIN
    -- na alteracao de status (cancelamento) as validacoes nao se aplicam
    IF TG_OP = 'UPDATE' AND NEW.status <> 'ATIVA' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_area FROM area_comum WHERE id_area_comum = NEW.id_area_comum;

    IF NOT v_area.ativo THEN
        RAISE EXCEPTION 'Area comum inativa: reservas nao sao permitidas.';
    END IF;

    -- RN01: sobreposicao de horario na mesma area comum
    IF EXISTS (
        SELECT 1 FROM reserva r
         WHERE r.id_area_comum = NEW.id_area_comum
           AND r.status        IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
           AND (NEW.data_hora_inicio, NEW.data_hora_fim)
               OVERLAPS (r.data_hora_inicio, r.data_hora_fim)
    ) THEN
        RAISE EXCEPTION 'RN01: ja existe reserva ativa para esta area no horario solicitado.';
    END IF;

    -- RN02: area interditada no periodo
    IF EXISTS (
        SELECT 1 FROM bloqueio_area b
         WHERE b.id_area_comum = NEW.id_area_comum
           AND (NEW.data_hora_inicio, NEW.data_hora_fim)
               OVERLAPS (b.data_hora_inicio, b.data_hora_fim)
    ) THEN
        RAISE EXCEPTION 'RN02: area bloqueada no periodo solicitado.';
    END IF;

    -- RN03: perfil bloqueado para a area ou para todas as areas
    IF EXISTS (
        SELECT 1 FROM bloqueio_perfil p
         WHERE p.id_perfil = NEW.id_perfil
           AND (p.id_area_comum IS NULL OR p.id_area_comum = NEW.id_area_comum)
           AND NEW.data_hora_inicio >= p.data_hora_inicio
           AND (p.data_hora_fim IS NULL OR NEW.data_hora_inicio <= p.data_hora_fim)
    ) THEN
        RAISE EXCEPTION 'RN03: morador com acesso bloqueado para esta area comum.';
    END IF;

    -- RN04: capacidade da area comum
    IF NEW.numero_pessoas > v_area.capacidade THEN
        RAISE EXCEPTION 'RN04: numero de pessoas (%) excede a capacidade da area (%).',
                        NEW.numero_pessoas, v_area.capacidade;
    END IF;

    -- RN17: restricao de idade minima da area comum
    IF COALESCE(v_area.idade_minima, 0) > 0 THEN
        SELECT p.data_nascimento INTO v_nasc
          FROM perfil pf
          JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
         WHERE pf.id_perfil = NEW.id_perfil;

        IF v_nasc IS NOT NULL AND EXTRACT(YEAR FROM age(NEW.data_hora_inicio::date, v_nasc)) < v_area.idade_minima THEN
            RAISE EXCEPTION 'RN17: a area exige idade minima de % anos para realizacao de reservas.',
                            v_area.idade_minima;
        END IF;
    END IF;

    -- RN05: janela de funcionamento do dia da semana
    v_dia := (ARRAY['DOMINGO','SEGUNDA','TERCA','QUARTA','QUINTA','SEXTA','SABADO']
              )[EXTRACT(DOW FROM NEW.data_hora_inicio)::INTEGER + 1]::dia_semana_enum;

    IF NOT EXISTS (
        SELECT 1 FROM area_horario h
         WHERE h.id_area_comum = NEW.id_area_comum
           AND h.dia_semana    = v_dia
           AND NEW.data_hora_inicio::time >= h.hora_inicio
           AND NEW.data_hora_fim::time    <= h.hora_fim
    ) THEN
        RAISE EXCEPTION 'RN05: horario fora da janela de funcionamento da area em %.', v_dia;
    END IF;

    -- RN06: antecedencia minima e maxima e bloqueio de horario no passado
    IF NEW.data_hora_inicio <= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'RN06: nao e permitido realizar reserva para horario no passado.';
    END IF;

    v_dias_antec := NEW.data_hora_inicio::date - CURRENT_DATE;

    IF v_dias_antec < v_area.antecedencia_minima_dias THEN
        RAISE EXCEPTION 'RN06: a reserva exige antecedencia minima de % dia(s).',
                        v_area.antecedencia_minima_dias;
    END IF;

    IF v_dias_antec > v_area.antecedencia_maxima_dias THEN
        RAISE EXCEPTION 'RN06: a reserva so pode ser feita com ate % dia(s) de antecedencia.',
                        v_area.antecedencia_maxima_dias;
    END IF;

    -- RN07: limite semanal de reservas por unidade
    SELECT COUNT(DISTINCT r.id_reserva) INTO v_qtd_semana
      FROM reserva r
      JOIN perfil          pf ON pf.id_perfil = r.id_perfil
      JOIN pessoa_unidade  pu ON pu.id_pessoa = pf.id_pessoa
                             AND pu.data_fim_ocupacao IS NULL
     WHERE r.id_area_comum = NEW.id_area_comum
       AND r.status        IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
       AND date_trunc('week', r.data_hora_inicio) = date_trunc('week', NEW.data_hora_inicio)
       AND pu.id_unidade IN (
             SELECT pu2.id_unidade
               FROM pessoa_unidade pu2
               JOIN perfil pf2 ON pf2.id_pessoa = pu2.id_pessoa
              WHERE pf2.id_perfil = NEW.id_perfil
                AND pu2.data_fim_ocupacao IS NULL);

    IF v_qtd_semana >= v_area.limite_reservas_semana THEN
        RAISE EXCEPTION 'RN07: a unidade atingiu o limite de % reserva(s) semanal(is) nesta area.',
                        v_area.limite_reservas_semana;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_reserva
    BEFORE INSERT OR UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_valida_reserva();

-- ---------------------------------------------------------------------
-- RN08: prazo de cancelamento e registro automatico da data
-- ---------------------------------------------------------------------
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

        -- Cancelamento por manutencao/interdicao ou administrativo nao e barrado pelo prazo do morador
        IF (NEW.motivo_cancelamento IS NULL OR (NEW.motivo_cancelamento NOT LIKE 'MANUTENCAO%' AND NEW.motivo_cancelamento NOT LIKE 'ADMINISTRATIVO%')) THEN
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

CREATE TRIGGER tg_cancela_reserva
    BEFORE UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_cancela_reserva();

-- ---------------------------------------------------------------------
-- RN09: emprestimo de chave - validacao e mudanca de status
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_emprestimo_chave() RETURNS TRIGGER AS $$
DECLARE
    v_status status_chave_enum;
BEGIN
    SELECT status INTO v_status FROM chave WHERE id_chave = NEW.id_chave;

    IF v_status <> 'DISPONIVEL' THEN
        RAISE EXCEPTION 'RN09: a chave nao esta disponivel (situacao atual: %).', v_status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_emprestimo_chave
    BEFORE INSERT ON entrega_chave
    FOR EACH ROW EXECUTE FUNCTION fn_valida_emprestimo_chave();

CREATE OR REPLACE FUNCTION fn_aplica_emprestimo_chave() RETURNS TRIGGER AS $$
BEGIN
    UPDATE chave SET status = 'EMPRESTADA' WHERE id_chave = NEW.id_chave;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_aplica_emprestimo_chave
    AFTER INSERT ON entrega_chave
    FOR EACH ROW EXECUTE FUNCTION fn_aplica_emprestimo_chave();

-- ---------------------------------------------------------------------
-- RN10: devolucao de chave - validacao e liberacao
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_devolucao_chave() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_hora_devolucao IS NOT NULL THEN
        IF NEW.data_hora_devolucao < NEW.data_hora_retirada THEN
            RAISE EXCEPTION 'RN10: a devolucao nao pode ser anterior a retirada.';
        END IF;
        IF NEW.id_perfil_recebimento IS NULL THEN
            RAISE EXCEPTION 'RN10: informe o funcionario que recebeu a chave.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_devolucao_chave
    BEFORE UPDATE ON entrega_chave
    FOR EACH ROW EXECUTE FUNCTION fn_valida_devolucao_chave();

CREATE OR REPLACE FUNCTION fn_aplica_devolucao_chave() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_hora_devolucao IS NOT NULL AND OLD.data_hora_devolucao IS NULL THEN
        UPDATE chave SET status = 'DISPONIVEL' WHERE id_chave = NEW.id_chave;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_aplica_devolucao_chave
    AFTER UPDATE ON entrega_chave
    FOR EACH ROW EXECUTE FUNCTION fn_aplica_devolucao_chave();

-- ---------------------------------------------------------------------
-- RN11: aviso individual de chegada de encomenda
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_notifica_encomenda() RETURNS TRIGGER AS $$
DECLARE
    v_perfil_dest  INTEGER;
    v_aviso        INTEGER;
BEGIN
    SELECT p.id_perfil INTO v_perfil_dest
      FROM perfil p
     WHERE p.id_pessoa   = NEW.id_pessoa_destinatario
       AND p.tipo_perfil = 'MORADOR'
       AND p.data_fim IS NULL
     ORDER BY p.data_inicio DESC
     LIMIT 1;

    IF v_perfil_dest IS NOT NULL THEN
        INSERT INTO aviso (id_perfil_autor, escopo, titulo, conteudo)
        VALUES (NEW.id_perfil_recebimento, 'INDIVIDUAL', 'Nova encomenda na portaria',
                'Voce recebeu uma encomenda de porte ' || NEW.tamanho ||
                '. Retire na portaria apresentando um documento.')
        RETURNING id_aviso INTO v_aviso;

        INSERT INTO aviso_perfil (id_aviso, id_perfil) VALUES (v_aviso, v_perfil_dest);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_notifica_encomenda
    AFTER INSERT ON encomenda
    FOR EACH ROW EXECUTE FUNCTION fn_notifica_encomenda();

-- ---------------------------------------------------------------------
-- RN12: retirada de encomenda
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_retirada_encomenda() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.data_hora_retirada IS NOT NULL AND OLD.data_hora_retirada IS NULL THEN
        IF NEW.retirado_por IS NULL THEN
            RAISE EXCEPTION 'RN12: informe quem retirou a encomenda.';
        END IF;
        IF NEW.retirado_por = 'TERCEIRO' AND NEW.nome_retirante IS NULL THEN
            RAISE EXCEPTION 'RN12: informe o nome do terceiro que retirou a encomenda.';
        END IF;
        IF NEW.id_perfil_entrega IS NULL THEN
            RAISE EXCEPTION 'RN12: informe o funcionario que entregou a encomenda.';
        END IF;
        NEW.status := 'RETIRADA';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_retirada_encomenda
    BEFORE UPDATE ON encomenda
    FOR EACH ROW EXECUTE FUNCTION fn_retirada_encomenda();

-- ---------------------------------------------------------------------
-- RN13: distribuicao automatica dos avisos do mural
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_distribui_aviso() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.escopo = 'MURAL' THEN
        INSERT INTO aviso_perfil (id_aviso, id_perfil)
        SELECT NEW.id_aviso, p.id_perfil
          FROM perfil p
         WHERE p.data_fim IS NULL
           AND p.recebe_notificacao = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_distribui_aviso
    AFTER INSERT ON aviso
    FOR EACH ROW EXECUTE FUNCTION fn_distribui_aviso();

-- ---------------------------------------------------------------------
-- RN14: registro da data e hora de leitura do aviso
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_leitura_aviso() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lido = TRUE AND OLD.lido = FALSE THEN
        NEW.data_hora_leitura := CURRENT_TIMESTAMP;
    ELSIF NEW.lido = FALSE THEN
        NEW.data_hora_leitura := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_leitura_aviso
    BEFORE UPDATE ON aviso_perfil
    FOR EACH ROW EXECUTE FUNCTION fn_leitura_aviso();

-- ---------------------------------------------------------------------
-- RN15: validacao de dependente (responsavel deve ser titular ativo da mesma unidade)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_dependente() RETURNS TRIGGER AS $$
BEGIN
    -- Se o vinculo esta sendo encerrado ou ja esta inativo, nao exige titular ativo
    IF NEW.data_fim_ocupacao IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.tipo_vinculo = 'DEPENDENTE' THEN
        IF NOT EXISTS (
            SELECT 1 FROM pessoa_unidade pu
             WHERE pu.id_pessoa = NEW.id_responsavel
               AND pu.id_unidade = NEW.id_unidade
               AND pu.data_fim_ocupacao IS NULL
               AND pu.tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO')
        ) THEN
            RAISE EXCEPTION 'RN15: o responsavel informado deve ser o titular ativo (proprietario ou inquilino) da mesma unidade.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_valida_dependente
    BEFORE INSERT OR UPDATE ON pessoa_unidade
    FOR EACH ROW EXECUTE FUNCTION fn_valida_dependente();

-- ---------------------------------------------------------------------
-- Carga inicial de avisos no mural (com trigger ativo para distribuicao)
-- ---------------------------------------------------------------------
INSERT INTO aviso (id_perfil_autor, escopo, titulo, conteudo, fixado, data_hora_publicacao) VALUES
    (4, 'MURAL', 'Boas-vindas ao Sistema OASIS', 'Seja bem-vindo ao OASIS, o sistema integrado de gestao de reservas, comunicados e portaria do nosso condominio. Em caso de duvidas, procure a administracao.', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (4, 'MURAL', 'Manutencao Preventiva dos Elevadores', 'Informamos que na proxima terca-feira, entre 09:00 e 12:00, os elevadores do Bloco A passarao por manutencao preventiva de rotina. Contamos com a compreensao de todos.', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (4, 'MURAL', 'Regras de Uso da Piscina e Academia', 'Lembramos a todos os moradores que a realizacao de reservas e obrigatoria para a Academia e que a Piscina opera conforme os horarios cadastrados no aplicativo.', FALSE, CURRENT_TIMESTAMP);


