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
    papel_controle   VARCHAR(50)   NOT NULL DEFAULT 'MORADOR',
    tipo_servico     VARCHAR(100),
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
    tipo_limite_reserva       VARCHAR(20)       NOT NULL DEFAULT 'SEMANAL',
    max_unidades_simultaneas  INTEGER           NOT NULL DEFAULT 1,
    exige_chave               BOOLEAN           NOT NULL DEFAULT FALSE,
    valor                     NUMERIC(10,2)     NOT NULL DEFAULT 0,
    ativo                     BOOLEAN           NOT NULL DEFAULT TRUE,
    imagem_url                VARCHAR(500),
    observacoes               VARCHAR(255),
    reserva_por_dia           BOOLEAN           NOT NULL DEFAULT FALSE,
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
