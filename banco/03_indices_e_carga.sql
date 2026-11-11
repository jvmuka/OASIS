-- =====================================================================
-- Parte 3 de 4: indices de apoio e carga inicial de dados
-- =====================================================================

-- ---------------------------------------------------------------------
-- Indices sobre as colunas mais utilizadas nas consultas e nos gatilhos
-- ---------------------------------------------------------------------
CREATE INDEX idx_reserva_area_periodo ON reserva (id_area_comum, data_hora_inicio, status);
CREATE INDEX idx_reserva_perfil       ON reserva (id_perfil, status);
CREATE INDEX idx_reserva_unidade      ON reserva (id_unidade);
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
-- Carga inicial: condominio 1 (OASIS) e catalogo de modulos do sistema
-- ---------------------------------------------------------------------
INSERT INTO condominio (id_condominio, nome, slug, cidade, uf, ativo)
VALUES (1, 'Condomínio Residencial OASIS', 'oasis-central', 'Ponta Grossa', 'PR', TRUE)
ON CONFLICT (id_condominio) DO UPDATE
SET nome = EXCLUDED.nome, slug = EXCLUDED.slug;

SELECT setval('condominio_id_condominio_seq', (SELECT COALESCE(MAX(id_condominio), 1) FROM condominio));

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
            INSERT INTO unidade (id_bloco, numero_apartamento, andar, numero_vagas)
            VALUES (1, (f * 10) + a, f, 1);
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
    ('superadmin_oasis_master', 'Super Administrador OASIS', 'superadmin@oasis.com',
     '00000000000', '1990-01-01', '42999990000');

INSERT INTO perfil (id_pessoa, tipo_perfil, data_inicio, id_condominio) VALUES
    (1, 'MORADOR',    '2024-02-01', 1),
    (2, 'MORADOR',    '2024-05-10', 1),
    (3, 'MORADOR',    '2025-08-01', 1),
    (4, 'SINDICO',    '2026-01-01', 1),
    (4, 'MORADOR',    '2020-03-15', 1),
    (5, 'PORTEIRO',   '2023-07-01', 1),
    (6, 'MORADOR',    '2025-01-20', 1),
    (7, 'SUPERADMIN', '2024-01-01', NULL);

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
