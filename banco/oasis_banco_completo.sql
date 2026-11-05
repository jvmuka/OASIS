-- =====================================================================
-- OASIS - Sistema de gestao de reservas e controle de acesso
-- Script de criacao do banco de dados - PostgreSQL 16
-- Partes 1 a 4 reunidas; executar conectado ao banco oasis ja existente
-- (a criacao do banco, feita na parte 1, fica a cargo de quem executa)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos enumerados (dominios fechados)
-- ---------------------------------------------------------------------
CREATE TYPE tipo_perfil_enum            AS ENUM ('MORADOR','ADMINISTRADOR','SINDICO','PORTEIRO','SUPERADMIN');
CREATE TYPE tipo_vinculo_enum           AS ENUM ('PROPRIETARIO','INQUILINO','DEPENDENTE','VISITANTE','PRESTADOR_SERVICO');
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
-- Parte 2 de 4: criacao das tabelas
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
    email            VARCHAR(150)  UNIQUE,
    cpf              CHAR(11)      NOT NULL UNIQUE,
    data_nascimento  DATE,
    celular          VARCHAR(30),
    senha_hash       VARCHAR(255),
    status_conta     VARCHAR(30)   NOT NULL DEFAULT 'ATIVO',
    papel_controle   VARCHAR(50)   NOT NULL DEFAULT 'MORADOR',
    tipo_servico     VARCHAR(100),
    ativo            BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_pessoa_cpf        CHECK (cpf ~ '^[0-9]{11}$'),
    CONSTRAINT ck_pessoa_email      CHECK (email IS NULL OR email LIKE '%_@_%._%'),
    CONSTRAINT ck_pessoa_nascimento CHECK (data_nascimento IS NULL OR data_nascimento < CURRENT_DATE),
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
        (tipo_vinculo = 'DEPENDENTE' AND (id_responsavel IS NULL OR id_responsavel <> id_pessoa))
        OR
        (tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO', 'VISITANTE', 'PRESTADOR_SERVICO') AND id_responsavel IS NULL)
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
    tipo_limite_reserva       VARCHAR(20)       NOT NULL DEFAULT 'SEMANAL',
    max_unidades_simultaneas  INTEGER           NOT NULL DEFAULT 1,
    exige_chave               BOOLEAN           NOT NULL DEFAULT FALSE,
    valor                     NUMERIC(10,2)     NOT NULL DEFAULT 0,
    ativo                     BOOLEAN           NOT NULL DEFAULT TRUE,
    imagem_url                VARCHAR(500),
    observacoes               VARCHAR(255),
    reserva_por_dia           BOOLEAN           NOT NULL DEFAULT FALSE,
    requer_reserva            BOOLEAN           NOT NULL DEFAULT TRUE,
    status_livre              VARCHAR(20)       NOT NULL DEFAULT 'LIVRE',
    status_livre_atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_livre_observacao   VARCHAR(255),
    status_livre_porteiro     VARCHAR(100),
    CONSTRAINT ck_area_capacidade  CHECK (capacidade > 0),
    CONSTRAINT ck_area_idade       CHECK (idade_minima >= 0),
    CONSTRAINT ck_area_slot        CHECK (duracao_slot_min BETWEEN 1 AND 1440),
    CONSTRAINT ck_area_antec       CHECK (antecedencia_maxima_dias >= antecedencia_minima_dias
                                          AND antecedencia_minima_dias >= 0),
    CONSTRAINT ck_area_prazo       CHECK (prazo_cancelamento_horas >= 0),
    CONSTRAINT ck_area_limite      CHECK (limite_reservas_semana > 0),
    CONSTRAINT ck_area_tipo_limite CHECK (tipo_limite_reserva IN ('DIARIO', 'SEMANAL', 'MENSAL')),
    CONSTRAINT ck_area_max_simult  CHECK (max_unidades_simultaneas >= 1),
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
    codigo         VARCHAR(100)       NOT NULL UNIQUE,
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
    id_perfil_solicitante  INTEGER,
    id_pessoa_solicitante  INTEGER,
    id_perfil_entrega      INTEGER    NOT NULL,
    id_perfil_recebimento  INTEGER,
    id_reserva             INTEGER,
    data_hora_retirada     TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_devolucao    TIMESTAMP,
    alerta_24h_enviado     BOOLEAN    NOT NULL DEFAULT FALSE,
    observacao             VARCHAR(255),
    CONSTRAINT fk_ec_chave     FOREIGN KEY (id_chave)              REFERENCES chave (id_chave) ON DELETE CASCADE,
    CONSTRAINT fk_ec_solic     FOREIGN KEY (id_perfil_solicitante) REFERENCES perfil (id_perfil),
    CONSTRAINT fk_ec_pessoa    FOREIGN KEY (id_pessoa_solicitante) REFERENCES pessoa (id_pessoa),
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
    anexo_url             VARCHAR(255),
    anexo_nome            VARCHAR(255),
    anexo_tipo            VARCHAR(50),
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
    codigo               VARCHAR(30)         NOT NULL UNIQUE,
    id_pessoa            INTEGER             NOT NULL,
    id_perfil_gerador    INTEGER,
    tipo                 VARCHAR(30)         NOT NULL DEFAULT 'PRIMEIRO_ACESSO',
    status               status_codigo_enum  NOT NULL DEFAULT 'DISPONIVEL',
    criado_em            TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_criacao         TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao       TIMESTAMP           NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    usado_em             TIMESTAMP,
    data_utilizacao      TIMESTAMP,
    ip_origem            VARCHAR(45),
    CONSTRAINT fk_cpa_pessoa  FOREIGN KEY (id_pessoa)         REFERENCES pessoa (id_pessoa) ON DELETE CASCADE,
    CONSTRAINT fk_cpa_gerador FOREIGN KEY (id_perfil_gerador) REFERENCES perfil (id_perfil)
);

CREATE INDEX idx_cpa_codigo ON codigo_primeiro_acesso (codigo) WHERE status = 'DISPONIVEL';

-- =====================================================================
-- Parte 3 de 4: indices de apoio e carga inicial de dados
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
CREATE INDEX idx_entrega_chave_atraso ON entrega_chave (data_hora_retirada) WHERE data_hora_devolucao IS NULL;
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
     '66677788899', '1995-03-03', '42999110006'),
    ('fb_uid_superadmin', 'Super Administrador OASIS', 'superadmin@oasis.com',
     '00000000000', '1990-01-01', '42999990000');

INSERT INTO perfil (id_pessoa, tipo_perfil, data_inicio) VALUES
    (1, 'MORADOR',  '2024-02-01'),
    (2, 'MORADOR',  '2024-05-10'),
    (3, 'MORADOR',  '2025-08-01'),
    (4, 'SINDICO',  '2026-01-01'),
    (4, 'MORADOR',  '2020-03-15'),
    (5, 'PORTEIRO', '2023-07-01'),
    (6, 'MORADOR',  '2025-01-20'),
    (7, 'SUPERADMIN', '2024-01-01');

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
-- Parte 4 de 4: gatilhos das regras de negocio RN01 a RN17
-- =====================================================================

-- ---------------------------------------------------------------------
-- RN01 a RN07: validacao completa da reserva
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_valida_reserva() RETURNS TRIGGER AS $$
DECLARE
    v_area                  area_comum%ROWTYPE;
    v_dia                   dia_semana_enum;
    v_dias_antec            INTEGER;
    v_qtd_periodo           INTEGER;
    v_qtd_simultaneas       INTEGER;
    v_total_pessoas_horario INTEGER;
    v_nasc                  DATE;
BEGIN
    -- na alteracao de status (cancelamento) as validacoes nao se aplicam
    IF TG_OP = 'UPDATE' AND NEW.status <> 'ATIVA' THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_area FROM area_comum WHERE id_area_comum = NEW.id_area_comum;

    IF NOT v_area.ativo THEN
        RAISE EXCEPTION 'Area comum inativa: reservas nao sao permitidas.';
    END IF;

    -- RN01-A: a mesma unidade nao pode reservar o mesmo horario mais de uma vez
    IF EXISTS (
        SELECT 1
          FROM reserva r
          JOIN perfil pf ON pf.id_perfil = r.id_perfil
          JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
         WHERE r.id_area_comum = NEW.id_area_comum
           AND r.status        IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
           AND (NEW.data_hora_inicio, NEW.data_hora_fim)
               OVERLAPS (r.data_hora_inicio, r.data_hora_fim)
           AND pu.id_unidade IN (
                 SELECT pu2.id_unidade
                   FROM pessoa_unidade pu2
                   JOIN perfil pf2 ON pf2.id_pessoa = pu2.id_pessoa
                  WHERE pf2.id_perfil = NEW.id_perfil
                    AND pu2.data_fim_ocupacao IS NULL)
    ) THEN
        RAISE EXCEPTION 'RN01: sua unidade ja possui uma reserva ativa para este mesmo horario.';
    END IF;

    -- RN01-B: limite de unidades/reservas simultaneas no mesmo horario
    SELECT COUNT(*) INTO v_qtd_simultaneas
      FROM reserva r
     WHERE r.id_area_comum = NEW.id_area_comum
       AND r.status        IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
       AND (NEW.data_hora_inicio, NEW.data_hora_fim)
           OVERLAPS (r.data_hora_inicio, r.data_hora_fim);

    IF v_qtd_simultaneas >= COALESCE(v_area.max_unidades_simultaneas, 1) THEN
        RAISE EXCEPTION 'RN01: o limite de reservas simultaneas para este horario ja foi atingido (% vaga(s)).',
                        COALESCE(v_area.max_unidades_simultaneas, 1);
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

    -- RN03: morador com acesso bloqueado para esta area comum ou para todas as areas
    IF EXISTS (
        SELECT 1 FROM bloqueio_perfil bp
        JOIN perfil pf_bloq ON pf_bloq.id_perfil = bp.id_perfil
        JOIN perfil pf_res  ON pf_res.id_perfil  = NEW.id_perfil
         WHERE pf_bloq.id_pessoa = pf_res.id_pessoa
           AND (bp.id_area_comum IS NULL OR bp.id_area_comum = NEW.id_area_comum)
           AND NEW.data_hora_inicio >= bp.data_hora_inicio
           AND (bp.data_hora_fim IS NULL OR NEW.data_hora_inicio <= bp.data_hora_fim)
    ) THEN
        RAISE EXCEPTION 'RN03: morador com acesso bloqueado para esta area comum.';
    END IF;

    -- RN04: capacidade da area comum e soma total de pessoas no mesmo horario
    SELECT COALESCE(SUM(r.numero_pessoas), 0) INTO v_total_pessoas_horario
      FROM reserva r
     WHERE r.id_area_comum = NEW.id_area_comum
       AND r.status        IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
       AND (NEW.data_hora_inicio, NEW.data_hora_fim)
           OVERLAPS (r.data_hora_inicio, r.data_hora_fim);

    IF (v_total_pessoas_horario + NEW.numero_pessoas) > v_area.capacidade THEN
        IF v_total_pessoas_horario > 0 THEN
            RAISE EXCEPTION 'RN04: a capacidade maxima de pessoas (%) para este horario foi excedida (ja ha % pessoa(s) agendada(s), restando apenas % vaga(s)).',
                            v_area.capacidade, v_total_pessoas_horario, GREATEST(0, v_area.capacidade - v_total_pessoas_horario);
        ELSE
            RAISE EXCEPTION 'RN04: numero de pessoas (%) excede a capacidade da area (%).',
                            NEW.numero_pessoas, v_area.capacidade;
        END IF;
    END IF;

    -- RN16: restricao de idade minima da area comum
    IF COALESCE(v_area.idade_minima, 0) > 0 THEN
        SELECT p.data_nascimento INTO v_nasc
          FROM perfil pf
          JOIN pessoa p ON p.id_pessoa = pf.id_pessoa
         WHERE pf.id_perfil = NEW.id_perfil;

        IF v_nasc IS NOT NULL AND EXTRACT(YEAR FROM age(NEW.data_hora_inicio::date, v_nasc)) < v_area.idade_minima THEN
            RAISE EXCEPTION 'RN16: a area exige idade minima de % anos para realizacao de reservas.',
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
           AND (
               NEW.data_hora_fim::time <= h.hora_fim
               OR (h.hora_fim >= '23:59:00'::time AND NEW.data_hora_fim::time <= '23:59:59'::time)
           )
    ) THEN
        RAISE EXCEPTION 'RN05: horario fora da janela de funcionamento da area em %.', v_dia;
    END IF;

    -- RN06: antecedencia minima e maxima e bloqueio de horario no passado
    IF NEW.data_hora_inicio <= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'RN06: nao e permitido realizar reserva para horario no passado.';
    END IF;

    IF NEW.data_hora_inicio < (CURRENT_TIMESTAMP + (GREATEST(v_area.antecedencia_minima_horas, v_area.antecedencia_minima_dias * 24) || ' hours')::INTERVAL) THEN
        RAISE EXCEPTION 'RN06: a reserva exige antecedencia minima de % hora(s).',
                        GREATEST(v_area.antecedencia_minima_horas, v_area.antecedencia_minima_dias * 24);
    END IF;

    v_dias_antec := NEW.data_hora_inicio::date - CURRENT_DATE;

    IF v_dias_antec > v_area.antecedencia_maxima_dias THEN
        RAISE EXCEPTION 'RN06: a reserva so pode ser feita com ate % dia(s) de antecedencia.',
                        v_area.antecedencia_maxima_dias;
    END IF;

    -- RN07: limite de reservas por unidade (DIARIO, SEMANAL ou MENSAL)
    SELECT COUNT(DISTINCT r.id_reserva) INTO v_qtd_periodo
      FROM reserva r
      JOIN perfil          pf ON pf.id_perfil = r.id_perfil
      JOIN pessoa_unidade  pu ON pu.id_pessoa = pf.id_pessoa
                             AND pu.data_fim_ocupacao IS NULL
     WHERE r.id_area_comum = NEW.id_area_comum
       AND r.status        IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
       AND (
           (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'DIARIO'
            AND r.data_hora_inicio::date = NEW.data_hora_inicio::date)
        OR (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'SEMANAL'
            AND date_trunc('week', r.data_hora_inicio) = date_trunc('week', NEW.data_hora_inicio))
        OR (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'MENSAL'
            AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', NEW.data_hora_inicio))
       )
       AND pu.id_unidade IN (
             SELECT pu2.id_unidade
               FROM pessoa_unidade pu2
               JOIN perfil pf2 ON pf2.id_pessoa = pu2.id_pessoa
              WHERE pf2.id_perfil = NEW.id_perfil
                AND pu2.data_fim_ocupacao IS NULL);

    IF v_qtd_periodo >= v_area.limite_reservas_semana THEN
        IF COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'DIARIO' THEN
            RAISE EXCEPTION 'RN07: a unidade atingiu o limite de % reserva(s) diaria(s) nesta area.',
                            v_area.limite_reservas_semana;
        ELSIF COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'MENSAL' THEN
            RAISE EXCEPTION 'RN07: a unidade atingiu o limite de % reserva(s) mensais nesta area.',
                            v_area.limite_reservas_semana;
        ELSE
            RAISE EXCEPTION 'RN07: a unidade atingiu o limite de % reserva(s) semanal(is) nesta area.',
                            v_area.limite_reservas_semana;
        END IF;
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

        -- Cancelamento por manutencao/interdicao, administrativo ou penalidade nao e barrado pelo prazo do morador
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
           AND p.recebe_notificacao = TRUE
           AND p.id_perfil <> NEW.id_perfil_autor;
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
-- RN17: cancelamento automatico de reservas ativas ao aplicar penalidade
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Carga inicial de avisos no mural (com trigger ativo para distribuicao)
-- ---------------------------------------------------------------------
INSERT INTO aviso (id_perfil_autor, escopo, titulo, conteudo, fixado, data_hora_publicacao) VALUES
    (4, 'MURAL', 'Boas-vindas ao Sistema OASIS', 'Seja bem-vindo ao OASIS, o sistema integrado de gestao de reservas, comunicados e portaria do nosso condominio. Em caso de duvidas, procure a administracao.', TRUE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
    (4, 'MURAL', 'Manutencao Preventiva dos Elevadores', 'Informamos que na proxima terca-feira, entre 09:00 e 12:00, os elevadores do Bloco A passarao por manutencao preventiva de rotina. Contamos com a compreensao de todos.', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    (4, 'MURAL', 'Regras de Uso da Piscina e Academia', 'Lembramos a todos os moradores que a realizacao de reservas e obrigatoria para a Academia e que a Piscina opera conforme os horarios cadastrados no aplicativo.', FALSE, CURRENT_TIMESTAMP);


-- =====================================================================
-- TABELAS DE CHAMADOS E OCORRENCIAS
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
  id_chamado             SERIAL                   PRIMARY KEY,
  id_unidade             INTEGER                  NOT NULL REFERENCES unidade(id_unidade) ON DELETE RESTRICT,
  id_pessoa_autor        INTEGER                  NOT NULL REFERENCES pessoa(id_pessoa) ON DELETE RESTRICT,
  id_perfil_autor        INTEGER                  NOT NULL REFERENCES perfil(id_perfil) ON DELETE RESTRICT,
  id_area_comum          INTEGER                  REFERENCES area_comum(id_area_comum) ON DELETE SET NULL,
  categoria              categoria_chamado_enum   NOT NULL,
  titulo                 VARCHAR(120)             NOT NULL,
  descricao              TEXT                     NOT NULL,
  local_especifico       VARCHAR(150),
  status                 status_chamado_enum      NOT NULL DEFAULT 'EM_ANALISE',
  imagem_url             VARCHAR(255),
  data_hora_abertura     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  data_hora_fechamento   TIMESTAMP WITH TIME ZONE,
  data_hora_atualizacao  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chamado_unidade ON chamado(id_unidade);
CREATE INDEX IF NOT EXISTS idx_chamado_status ON chamado(status);
CREATE INDEX IF NOT EXISTS idx_chamado_categoria ON chamado(categoria);
CREATE INDEX IF NOT EXISTS idx_chamado_abertura ON chamado(data_hora_abertura DESC);

CREATE TABLE IF NOT EXISTS chamado_mensagem (
  id_chamado_mensagem    SERIAL                   PRIMARY KEY,
  id_chamado             INTEGER                  NOT NULL REFERENCES chamado(id_chamado) ON DELETE CASCADE,
  id_pessoa              INTEGER                  NOT NULL REFERENCES pessoa(id_pessoa) ON DELETE RESTRICT,
  id_perfil              INTEGER                  NOT NULL REFERENCES perfil(id_perfil) ON DELETE RESTRICT,
  origem                 VARCHAR(20)              NOT NULL CHECK (origem IN ('MORADOR', 'ADMINISTRACAO')),
  mensagem               TEXT                     NOT NULL,
  anexo_url              VARCHAR(255),
  data_hora              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chamado_msg_chamado ON chamado_mensagem(id_chamado, data_hora ASC);


-- =====================================================================
-- MULTI-CONDOMINIO (MULTI-TENANCY)
-- =====================================================================

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
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE aviso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE chave ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE chamado ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
ALTER TABLE perfil ADD COLUMN IF NOT EXISTS id_condominio INTEGER REFERENCES condominio(id_condominio);

-- ----------------------------------------------------
-- 19. MODULOS DO SISTEMA E TENANCY MODULAR
-- ----------------------------------------------------
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
ON CONFLICT (id_condominio, codigo_modulo) DO NOTHING;


-- ============================================================================
-- MIGRAÇÃO / CARGA DE DADOS DEMONSTRATIVOS: CONDOMÍNIO SOLAR DAS PALMEIRAS (ID 2)
-- Garante segregação multi-tenancy e dados autônomos para alternância de condomínios
-- ============================================================================

DO $$
DECLARE
    v_id_condo_solar INTEGER;
    v_id_bloco_solar INTEGER;
    v_id_unidade_101 INTEGER;
    v_id_unidade_102 INTEGER;
    v_id_unidade_201 INTEGER;
    v_id_unidade_202 INTEGER;
    v_id_pessoa_mariana INTEGER;
    v_id_perfil_mariana_morador INTEGER;
    v_id_perfil_mariana_sindico INTEGER;
    v_id_area_piscina INTEGER;
    v_id_area_gourmet INTEGER;
    v_id_area_salao INTEGER;
    v_id_area_quadra INTEGER;
    v_senha_hash TEXT := '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8';
BEGIN
    -- 1. Identifica Condomínio Solar das Palmeiras (ou cria se necessário)
    SELECT id_condominio INTO v_id_condo_solar FROM condominio WHERE id_condominio = 2;
    IF v_id_condo_solar IS NULL THEN
        SELECT id_condominio INTO v_id_condo_solar FROM condominio WHERE slug = 'solar-palmeiras';
    END IF;

    IF v_id_condo_solar IS NULL THEN
        INSERT INTO condominio (nome, razao_social, cnpj, slug, endereco_completo, cidade, uf, cep, ativo)
        VALUES ('Residencial Solar das Palmeiras', 'Condomínio Solar das Palmeiras Ltda', '98765432000188', 'solar-palmeiras', 'Av. das Palmeiras, 500', 'Curitiba', 'PR', '80000-000', TRUE)
        RETURNING id_condominio INTO v_id_condo_solar;
    END IF;

    -- 2. Bloco do Solar das Palmeiras
    SELECT id_bloco INTO v_id_bloco_solar FROM bloco WHERE id_condominio = v_id_condo_solar LIMIT 1;
    IF v_id_bloco_solar IS NULL THEN
        INSERT INTO bloco (nome, descricao, id_condominio)
        VALUES ('Bloco A', 'Torre Sul do Residencial Solar', v_id_condo_solar)
        RETURNING id_bloco INTO v_id_bloco_solar;
    END IF;

    -- 3. Unidades do Bloco Solar
    SELECT id_unidade INTO v_id_unidade_101 FROM unidade WHERE id_bloco = v_id_bloco_solar AND numero_apartamento = '101';
    IF v_id_unidade_101 IS NULL THEN
        INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas, andar)
        VALUES (v_id_bloco_solar, '101', 1, 1) RETURNING id_unidade INTO v_id_unidade_101;
    END IF;

    SELECT id_unidade INTO v_id_unidade_102 FROM unidade WHERE id_bloco = v_id_bloco_solar AND numero_apartamento = '102';
    IF v_id_unidade_102 IS NULL THEN
        INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas, andar)
        VALUES (v_id_bloco_solar, '102', 1, 1) RETURNING id_unidade INTO v_id_unidade_102;
    END IF;

    SELECT id_unidade INTO v_id_unidade_201 FROM unidade WHERE id_bloco = v_id_bloco_solar AND numero_apartamento = '201';
    IF v_id_unidade_201 IS NULL THEN
        INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas, andar)
        VALUES (v_id_bloco_solar, '201', 2, 2) RETURNING id_unidade INTO v_id_unidade_201;
    END IF;

    SELECT id_unidade INTO v_id_unidade_202 FROM unidade WHERE id_bloco = v_id_bloco_solar AND numero_apartamento = '202';
    IF v_id_unidade_202 IS NULL THEN
        INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas, andar)
        VALUES (v_id_bloco_solar, '202', 2, 2) RETURNING id_unidade INTO v_id_unidade_202;
    END IF;

    -- 4. Moradora e Síndica do Solar (Mariana Santos)
    SELECT id_pessoa INTO v_id_pessoa_mariana FROM pessoa WHERE email = 'mariana.santos@solar.com';
    IF v_id_pessoa_mariana IS NULL THEN
        INSERT INTO pessoa (uid_firebase, nome, email, celular, cpf, senha_hash, ativo)
        VALUES ('firebase-mariana-solar', 'Mariana Santos', 'mariana.santos@solar.com', '(41) 99888-1122', '77788899900', v_senha_hash, TRUE)
        RETURNING id_pessoa INTO v_id_pessoa_mariana;
    END IF;

    -- Perfis de Mariana no condomínio Solar
    SELECT id_perfil INTO v_id_perfil_mariana_morador FROM perfil WHERE id_pessoa = v_id_pessoa_mariana AND tipo_perfil = 'MORADOR' AND id_condominio = v_id_condo_solar;
    IF v_id_perfil_mariana_morador IS NULL THEN
        INSERT INTO perfil (id_pessoa, tipo_perfil, id_condominio)
        VALUES (v_id_pessoa_mariana, 'MORADOR', v_id_condo_solar)
        RETURNING id_perfil INTO v_id_perfil_mariana_morador;
    END IF;

    SELECT id_perfil INTO v_id_perfil_mariana_sindico FROM perfil WHERE id_pessoa = v_id_pessoa_mariana AND tipo_perfil = 'SINDICO' AND id_condominio = v_id_condo_solar;
    IF v_id_perfil_mariana_sindico IS NULL THEN
        INSERT INTO perfil (id_pessoa, tipo_perfil, id_condominio)
        VALUES (v_id_pessoa_mariana, 'SINDICO', v_id_condo_solar)
        RETURNING id_perfil INTO v_id_perfil_mariana_sindico;
    END IF;

    -- Ocupação da unidade 101 por Mariana
    IF NOT EXISTS (SELECT 1 FROM pessoa_unidade WHERE id_pessoa = v_id_pessoa_mariana AND id_unidade = v_id_unidade_101) THEN
        INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, reside, status_aprovacao)
        VALUES (v_id_pessoa_mariana, v_id_unidade_101, 'PROPRIETARIO', TRUE, 'APROVADO');
    END IF;

    -- 5. Áreas Comuns exclusivas do Condomínio Solar
    -- 5.1 Piscina Tropical (Livre)
    SELECT id_area_comum INTO v_id_area_piscina FROM area_comum WHERE nome = 'Piscina Tropical' AND id_condominio = v_id_condo_solar;
    IF v_id_area_piscina IS NULL THEN
        INSERT INTO area_comum (nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso,
                                duracao_slot_min, antecedencia_minima_dias, antecedencia_maxima_dias,
                                prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor,
                                imagem_url, requer_reserva, status_livre, id_condominio)
        VALUES ('Piscina Tropical', 'Piscina aquecida adulto e deck molhado para moradores do Solar.',
                25, 0, 'BIOMETRIA', 'COMUM',
                120, 0, 30, 24, 7, FALSE, 0.00,
                'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80',
                FALSE, 'LIVRE', v_id_condo_solar)
        RETURNING id_area_comum INTO v_id_area_piscina;

        INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim) VALUES
            (v_id_area_piscina, 'TERCA', '08:00', '21:00'),
            (v_id_area_piscina, 'QUARTA', '08:00', '21:00'),
            (v_id_area_piscina, 'QUINTA', '08:00', '21:00'),
            (v_id_area_piscina, 'SEXTA', '08:00', '22:00'),
            (v_id_area_piscina, 'SABADO', '08:00', '22:00'),
            (v_id_area_piscina, 'DOMINGO', '08:00', '20:00');
    END IF;

    -- 5.2 Espaço Gourmet Solar (Reservável)
    SELECT id_area_comum INTO v_id_area_gourmet FROM area_comum WHERE nome = 'Espaço Gourmet Solar' AND id_condominio = v_id_condo_solar;
    IF v_id_area_gourmet IS NULL THEN
        INSERT INTO area_comum (nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso,
                                duracao_slot_min, antecedencia_minima_dias, antecedencia_maxima_dias,
                                prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor,
                                imagem_url, requer_reserva, reserva_por_dia, id_condominio)
        VALUES ('Espaço Gourmet Solar', 'Espaço climatizado com churrasqueira a gás e bancada de chopp.',
                20, 18, 'CHAVE', 'RESERVAVEL',
                240, 2, 60, 48, 1, TRUE, 80.00,
                'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
                TRUE, TRUE, v_id_condo_solar)
        RETURNING id_area_comum INTO v_id_area_gourmet;

        INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim) VALUES
            (v_id_area_gourmet, 'SEXTA', '12:00', '23:59:59'),
            (v_id_area_gourmet, 'SABADO', '10:00', '23:59:59'),
            (v_id_area_gourmet, 'DOMINGO', '10:00', '22:00');

        INSERT INTO chave (id_area_comum, codigo, status, observacao)
        VALUES (v_id_area_gourmet, 'CH-SOLAR-GOURMET', 'DISPONIVEL', 'Chave e controle do ar condicionado');
    END IF;

    -- 5.3 Salão Nobre Solar (Reservável)
    SELECT id_area_comum INTO v_id_area_salao FROM area_comum WHERE nome = 'Salão Nobre Solar' AND id_condominio = v_id_condo_solar;
    IF v_id_area_salao IS NULL THEN
        INSERT INTO area_comum (nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso,
                                duracao_slot_min, antecedencia_minima_dias, antecedencia_maxima_dias,
                                prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor,
                                imagem_url, requer_reserva, reserva_por_dia, id_condominio)
        VALUES ('Salão Nobre Solar', 'Salão nobre com isolamento acústico e capacidade ampliada para eventos.',
                60, 18, 'CHAVE', 'RESERVAVEL',
                360, 5, 90, 72, 1, TRUE, 200.00,
                'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
                TRUE, TRUE, v_id_condo_solar)
        RETURNING id_area_comum INTO v_id_area_salao;

        INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim) VALUES
            (v_id_area_salao, 'SEXTA', '12:00', '23:59:59'),
            (v_id_area_salao, 'SABADO', '10:00', '23:59:59'),
            (v_id_area_salao, 'DOMINGO', '10:00', '23:00');

        INSERT INTO chave (id_area_comum, codigo, status, observacao)
        VALUES (v_id_area_salao, 'CH-SOLAR-NOBRE', 'DISPONIVEL', 'Chave principal do Salão Nobre');
    END IF;

    -- 5.4 Quadra de Areia (Livre)
    SELECT id_area_comum INTO v_id_area_quadra FROM area_comum WHERE nome = 'Quadra de Beach Tennis' AND id_condominio = v_id_condo_solar;
    IF v_id_area_quadra IS NULL THEN
        INSERT INTO area_comum (nome, descricao, capacidade, idade_minima, tipo_acesso, tipo_uso,
                                duracao_slot_min, antecedencia_minima_dias, antecedencia_maxima_dias,
                                prazo_cancelamento_horas, limite_reservas_semana, exige_chave, valor,
                                imagem_url, requer_reserva, status_livre, id_condominio)
        VALUES ('Quadra de Beach Tennis', 'Quadra de areia para práticas de beach tennis e futevôlei.',
                12, 10, 'LIVRE', 'COMUM',
                60, 0, 30, 24, 7, FALSE, 0.00,
                'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80',
                FALSE, 'LIVRE', v_id_condo_solar)
        RETURNING id_area_comum INTO v_id_area_quadra;

        INSERT INTO area_horario (id_area_comum, dia_semana, hora_inicio, hora_fim) VALUES
            (v_id_area_quadra, 'SEGUNDA', '07:00', '22:00'),
            (v_id_area_quadra, 'TERCA', '07:00', '22:00'),
            (v_id_area_quadra, 'QUARTA', '07:00', '22:00'),
            (v_id_area_quadra, 'QUINTA', '07:00', '22:00'),
            (v_id_area_quadra, 'SEXTA', '07:00', '22:00'),
            (v_id_area_quadra, 'SABADO', '08:00', '21:00'),
            (v_id_area_quadra, 'DOMINGO', '08:00', '20:00');
    END IF;

    -- 6. Avisos exclusivos do Solar das Palmeiras
    IF NOT EXISTS (SELECT 1 FROM aviso WHERE id_condominio = v_id_condo_solar AND titulo ILIKE '%Boas-vindas ao Residencial Solar%') THEN
        INSERT INTO aviso (id_perfil_autor, titulo, conteudo, fixado, data_hora_publicacao, id_condominio)
        VALUES (v_id_perfil_mariana_sindico,
                'Boas-vindas ao Residencial Solar das Palmeiras!',
                'Prezados moradores do Solar, nosso sistema agora está plenamente integrado. Consultem horários da Piscina e façam reservas online do Espaço Gourmet.',
                TRUE, CURRENT_TIMESTAMP, v_id_condo_solar);
    END IF;

    -- 7. Chamados exclusivos do Solar das Palmeiras
    IF NOT EXISTS (SELECT 1 FROM chamado WHERE id_condominio = v_id_condo_solar) THEN
        INSERT INTO chamado (id_unidade, id_pessoa_autor, id_perfil_autor, categoria, titulo, descricao, local_especifico, status, id_condominio)
        VALUES (v_id_unidade_101, v_id_pessoa_mariana, v_id_perfil_mariana_morador, 'MANUTENCAO',
                'Troca de lâmpada no hall do 1º andar',
                'A lâmpada em frente ao apartamento 101 está piscando e precisa de substituição.',
                'Hall social do 1º andar', 'EM_ANDAMENTO', v_id_condo_solar);
    END IF;

    -- 8. Encomenda demonstrativa no Solar
    IF NOT EXISTS (SELECT 1 FROM encomenda e JOIN pessoa p ON p.id_pessoa = e.id_pessoa_destinatario JOIN pessoa_unidade pu ON pu.id_pessoa = p.id_pessoa JOIN unidade u ON u.id_unidade = pu.id_unidade JOIN bloco b ON b.id_bloco = u.id_bloco WHERE b.id_condominio = v_id_condo_solar) THEN
        INSERT INTO encomenda (id_pessoa_destinatario, id_perfil_recebimento, descricao, tamanho, status)
        VALUES (v_id_pessoa_mariana, v_id_perfil_mariana_sindico, 'Pacote Mercado Livre (Cabo HDMI)', 'PEQUENO', 'AGUARDANDO_RETIRADA');
    END IF;

END $$;
