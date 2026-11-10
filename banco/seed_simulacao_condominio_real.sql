-- ============================================================================
-- OASIS - SEED DE SIMULAÇÃO DE CONDOMÍNIO REAL
-- Condomínio Residencial OASIS (id_condominio = 1)
-- Popula Moradores, Unidades, Reservas, Encomendas, Avisos, Chamados e Chaves
-- ============================================================================

SET session_replication_role = 'replica';

-- ----------------------------------------------------------------------------
-- 1. MORADORES (PESSOAS, PERFIS E VÍNCULOS COM UNIDADES)
-- ----------------------------------------------------------------------------

-- Senha padrão para todos os moradores de teste: Teste@2026
-- Hash: 995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8

INSERT INTO pessoa (id_pessoa, uid_firebase, nome, email, cpf, celular, ativo, senha_hash, status_conta, papel_controle)
VALUES
  (101, 'uid_fb_101', 'Rodrigo Ferreira', 'rodrigo.ferreira@oasis.com', '90111122233', '(42) 99111-2233', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (102, 'uid_fb_102', 'Camila Rocha', 'camila.rocha@oasis.com', '90222233344', '(42) 99222-3344', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (103, 'uid_fb_103', 'Felipe Castro', 'felipe.castro@oasis.com', '90333344455', '(42) 99333-4455', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (104, 'uid_fb_104', 'Beatriz Lima', 'beatriz.lima@oasis.com', '90444455566', '(42) 99444-5566', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (105, 'uid_fb_105', 'Lucas Pires', 'lucas.pires@oasis.com', '90555566677', '(42) 99555-6677', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (106, 'uid_fb_106', 'Fernanda Ramos', 'fernanda.ramos@oasis.com', '90666677788', '(42) 99666-7788', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (107, 'uid_fb_107', 'Gabriel Oliveira', 'gabriel.oliveira@oasis.com', '90777788899', '(42) 99777-8899', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (108, 'uid_fb_108', 'Patricia Almeida', 'patricia.almeida@oasis.com', '90888899900', '(42) 99888-9900', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (109, 'uid_fb_109', 'Marcelo Souza', 'marcelo.souza@oasis.com', '90999900011', '(42) 99999-0011', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (110, 'uid_fb_110', 'Juliana Mendes', 'juliana.mendes@oasis.com', '91011122233', '(42) 99101-1122', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (111, 'uid_fb_111', 'Thiago Barbosa', 'thiago.barbosa@oasis.com', '91122233344', '(42) 99112-2233', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (112, 'uid_fb_112', 'Amanda Costa', 'amanda.costa@oasis.com', '91233344455', '(42) 99123-3344', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (113, 'uid_fb_113', 'Bruno Albuquerque', 'bruno.albuquerque@oasis.com', '91344455566', '(42) 99134-4455', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (114, 'uid_fb_114', 'Rafael Moreira', 'rafael.moreira@oasis.com', '91455566677', '(42) 99145-5566', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (115, 'uid_fb_115', 'Renata Guimarães', 'renata.guimaraes@oasis.com', '91566677788', '(42) 99156-6677', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (116, 'uid_fb_116', 'Diego Silveira', 'diego.silveira@oasis.com', '91677788899', '(42) 99167-7788', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR'),
  (117, 'uid_fb_117', 'Vanessa Cardoso', 'vanessa.cardoso@oasis.com', '91788899900', '(42) 99178-8899', true, '995828a19cd944b4704a9b9e5229ae29:6f164bb3ba8797d416c8ebd81caa3d0ab7facdd0de4a8eb6ad654406fb89cb9101f8de00a92d216757b1408b08e230813e1d16141b669247524821d122e970e8', 'ATIVO', 'MORADOR')
ON CONFLICT (id_pessoa) DO NOTHING;

-- Perfis de Morador
INSERT INTO perfil (id_perfil, id_pessoa, tipo_perfil, data_inicio, recebe_notificacao, id_condominio)
VALUES
  (101, 101, 'MORADOR', '2026-01-01', true, 1),
  (102, 102, 'MORADOR', '2026-01-01', true, 1),
  (103, 103, 'MORADOR', '2026-01-01', true, 1),
  (104, 104, 'MORADOR', '2026-01-01', true, 1),
  (105, 105, 'MORADOR', '2026-01-01', true, 1),
  (106, 106, 'MORADOR', '2026-01-01', true, 1),
  (107, 107, 'MORADOR', '2026-01-01', true, 1),
  (108, 108, 'MORADOR', '2026-01-01', true, 1),
  (109, 109, 'MORADOR', '2026-01-01', true, 1),
  (110, 110, 'MORADOR', '2026-01-01', true, 1),
  (111, 111, 'MORADOR', '2026-01-01', true, 1),
  (112, 112, 'MORADOR', '2026-01-01', true, 1),
  (113, 113, 'MORADOR', '2026-01-01', true, 1),
  (114, 114, 'MORADOR', '2026-01-01', true, 1),
  (115, 115, 'MORADOR', '2026-01-01', true, 1),
  (116, 116, 'MORADOR', '2026-01-01', true, 1),
  (117, 117, 'MORADOR', '2026-01-01', true, 1)
ON CONFLICT (id_perfil) DO NOTHING;

-- Vínculo Pessoa -> Unidade
INSERT INTO pessoa_unidade (id_pessoa, id_unidade, tipo_vinculo, reside, data_inicio_ocupacao, status_aprovacao)
VALUES
  (101, 4, 'PROPRIETARIO', true, '2026-01-01', 'APROVADO'),   -- Apto 54
  (102, 6, 'PROPRIETARIO', true, '2026-01-01', 'APROVADO'),   -- Apto 62
  (103, 12, 'INQUILINO',   true, '2026-02-01', 'APROVADO'),   -- Apto 74
  (104, 10, 'PROPRIETARIO', true, '2026-01-15', 'APROVADO'),  -- Apto 72
  (105, 13, 'PROPRIETARIO', true, '2026-01-10', 'APROVADO'),  -- Apto 81
  (106, 14, 'INQUILINO',    true, '2026-03-01', 'APROVADO'),  -- Apto 82
  (107, 17, 'PROPRIETARIO', true, '2026-01-05', 'APROVADO'),  -- Apto 91
  (108, 22, 'PROPRIETARIO', true, '2026-01-20', 'APROVADO'),  -- Apto 102
  (109, 25, 'INQUILINO',    true, '2026-04-01', 'APROVADO'),  -- Apto 111
  (110, 29, 'PROPRIETARIO', true, '2026-01-10', 'APROVADO'),  -- Apto 121
  (111, 33, 'PROPRIETARIO', true, '2026-02-15', 'APROVADO'),  -- Apto 131
  (112, 37, 'INQUILINO',    true, '2026-05-01', 'APROVADO'),  -- Apto 141
  (113, 41, 'PROPRIETARIO', true, '2026-01-15', 'APROVADO'),  -- Apto 151
  (114, 53, 'PROPRIETARIO', true, '2026-02-01', 'APROVADO'),  -- Apto 181
  (115, 61, 'INQUILINO',    true, '2026-06-01', 'APROVADO'),  -- Apto 201
  (116, 65, 'PROPRIETARIO', true, '2026-01-10', 'APROVADO'),  -- Apto 211
  (117, 69, 'PROPRIETARIO', true, '2026-01-10', 'APROVADO')   -- Apto 221
ON CONFLICT (id_pessoa, id_unidade, data_inicio_ocupacao) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. RESERVAS DE ÁREAS COMUNS (HISTÓRICO REALISTA E RESERVAS ATIVAS FUTURAS)
-- ----------------------------------------------------------------------------
-- Áreas Comuns do OASIS (id_condominio = 1):
-- 1: Academia (R$ 0)
-- 2: Piscina (R$ 0)
-- 3: Salão de Festas (R$ 180,00)
-- 4: Pizza / Churrasqueira (R$ 60,00)
-- 5: Elevador de Serviço (R$ 60,00)
-- 7: Sala de Jogos (R$ 0)

INSERT INTO reserva (id_reserva, id_area_comum, id_perfil, data_hora_inicio, data_hora_fim, numero_pessoas, status, motivo_cancelamento, data_hora_cancelamento)
VALUES
  -- --- OUTUBRO/2026 (Passadas / Concluídas) ---
  (101, 3, 102, '2026-10-03 12:00:00', '2026-10-03 22:00:00', 35, 'CONCLUIDA', NULL, NULL), -- Camila (Apto 62) - Salão de Festas
  (102, 4, 105, '2026-10-04 11:00:00', '2026-10-04 18:00:00', 12, 'CONCLUIDA', NULL, NULL), -- Lucas (Apto 81) - Pizza
  (103, 1, 101, '2026-10-06 06:00:00', '2026-10-06 07:30:00', 1,  'CONCLUIDA', NULL, NULL), -- Rodrigo - Academia
  (104, 4, 110, '2026-10-10 18:00:00', '2026-10-10 23:00:00', 14, 'CONCLUIDA', NULL, NULL), -- Juliana (Apto 121) - Pizza
  (105, 3, 112, '2026-10-11 12:00:00', '2026-10-11 22:00:00', 40, 'CONCLUIDA', NULL, NULL), -- Amanda (Apto 141) - Salão de Festas
  (106, 5, 113, '2026-10-19 08:00:00', '2026-10-19 12:00:00', 3,  'CONCLUIDA', NULL, NULL), -- Bruno (Apto 151) - Elevador Mudança
  (107, 1, 107, '2026-10-21 19:00:00', '2026-10-21 20:30:00', 1,  'CONCLUIDA', NULL, NULL), -- Gabriel - Academia
  (108, 3, 101, '2026-10-24 12:00:00', '2026-10-24 22:00:00', 30, 'CONCLUIDA', NULL, NULL), -- Rodrigo (Apto 54) - Salão de Festas
  (109, 4, 103, '2026-10-25 12:00:00', '2026-10-25 19:00:00', 10, 'CONCLUIDA', NULL, NULL), -- Felipe (Apto 71) - Pizza
  (110, 7, 109, '2026-10-28 15:00:00', '2026-10-28 17:00:00', 4,  'CONCLUIDA', NULL, NULL), -- Marcelo - Sala de Jogos
  (111, 3, 108, '2026-10-31 18:00:00', '2026-10-31 23:00:00', 45, 'CONCLUIDA', NULL, NULL), -- Patricia (Apto 102) - Salão Halloween

  -- --- NOVEMBRO/2026 (Passadas: 01/11 a 08/11) ---
  (112, 4, 109, '2026-11-06 19:00:00', '2026-11-06 23:00:00', 10, 'CONCLUIDA', NULL, NULL), -- Marcelo (Apto 111) - Pizza
  (113, 3, 104, '2026-11-07 12:00:00', '2026-11-07 22:00:00', 25, 'CONCLUIDA', NULL, NULL), -- Beatriz (Apto 72) - Salão de Festas
  (114, 4, 114, '2026-11-08 11:00:00', '2026-11-08 18:00:00', 12, 'CONCLUIDA', NULL, NULL), -- Rafael (Apto 181) - Pizza
  (115, 5, 117, '2026-11-08 08:00:00', '2026-11-08 12:00:00', 2,  'CONCLUIDA', NULL, NULL), -- Vanessa (Apto 221) - Elevador Serviço
  (116, 3, 106, '2026-11-05 18:00:00', '2026-11-05 22:00:00', 20, 'CANCELADA', 'Viagem a trabalho imprevista', '2026-11-03 14:20:00'),
  (117, 1, 110, '2026-11-09 07:00:00', '2026-11-09 08:30:00', 1,  'CONCLUIDA', NULL, NULL), -- Juliana - Academia Manhã

  -- --- NOVEMBRO/2026 (Futuras / Ativas: 10/11 em diante) ---
  (118, 1, 101, '2026-11-10 06:30:00', '2026-11-10 07:30:00', 1,  'ATIVA', NULL, NULL), -- Rodrigo - Academia amanhã
  (119, 3, 106, '2026-11-14 12:00:00', '2026-11-14 22:00:00', 45, 'ATIVA', NULL, NULL), -- Fernanda (Apto 82) - Salão de Festas
  (120, 4, 107, '2026-11-15 11:00:00', '2026-11-15 19:00:00', 15, 'ATIVA', NULL, NULL), -- Gabriel (Apto 91) - Pizza Feriado
  (121, 5, 115, '2026-11-16 08:00:00', '2026-11-16 12:00:00', 2,  'ATIVA', NULL, NULL), -- Renata (Apto 201) - Elevador Mudança
  (122, 4, 112, '2026-11-20 19:00:00', '2026-11-20 23:00:00', 12, 'ATIVA', NULL, NULL), -- Amanda (Apto 141) - Pizza
  (123, 3, 116, '2026-11-21 12:00:00', '2026-11-21 22:00:00', 50, 'ATIVA', NULL, NULL), -- Diego (Apto 211) - Salão de Festas
  (124, 4, 1,   '2026-11-22 11:00:00', '2026-11-22 17:00:00', 10, 'ATIVA', NULL, NULL), -- Carlos Silva (Apto 51) - Pizza
  (125, 3, 111, '2026-11-28 12:00:00', '2026-11-28 22:00:00', 40, 'ATIVA', NULL, NULL), -- Thiago (Apto 131) - Salão de Festas
  (126, 4, 102, '2026-11-29 11:00:00', '2026-11-29 18:00:00', 14, 'ATIVA', NULL, NULL), -- Camila (Apto 62) - Pizza
  (127, 3, 110, '2026-12-05 12:00:00', '2026-12-05 22:00:00', 50, 'ATIVA', NULL, NULL)  -- Juliana (Apto 121) - Salão Dezembro
ON CONFLICT (id_reserva) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. ENCOMENDAS NA PORTARIA (HISTÓRICO RETIRADO E PENDENTES ATUAIS)
-- ----------------------------------------------------------------------------
-- id_perfil_recebimento = 6 (Roberto Lima - Porteiro)
-- id_perfil_entrega = 6 (Roberto Lima - Porteiro)

INSERT INTO encomenda (id_encomenda, id_pessoa_destinatario, id_perfil_recebimento, id_perfil_entrega, descricao, tamanho, data_hora_recebimento, data_hora_retirada, retirado_por, nome_retirante, status)
VALUES
  -- Encomendas já retiradas pelos moradores nos últimos dias
  (101, 101, 6, 6, 'Pacote Mercado Livre Full - Cabos e Carregadores (Apto 54)', 'PEQUENO', '2026-10-28 10:15:00', '2026-10-28 18:30:00', 'PROPRIO', NULL, 'RETIRADA'),
  (102, 102, 6, 6, 'Caixa Amazon Prime - Cafeteira Nespresso (Apto 62)', 'MEDIO',   '2026-10-29 14:20:00', '2026-10-29 19:10:00', 'PROPRIO', NULL, 'RETIRADA'),
  (103, 103, 6, 6, 'Envelope Sedex - Documentos da Seguradora (Apto 74)', 'PEQUENO', '2026-10-30 09:40:00', '2026-10-30 12:05:00', 'PROPRIO', NULL, 'RETIRADA'),
  (104, 104, 6, 6, 'Pacote Shopee - Decoração de Quarto (Apto 72)', 'PEQUENO', '2026-10-31 11:30:00', '2026-10-31 17:45:00', 'TERCEIRO', 'Marcos Lima (Irmão)', 'RETIRADA'),
  (105, 105, 6, 6, 'Caixa Kabum - Monitor Gamer 27pol LG (Apto 81)', 'GRANDE',  '2026-11-02 13:10:00', '2026-11-02 20:00:00', 'PROPRIO', NULL, 'RETIRADA'),
  (106, 106, 6, 6, 'Pacote Shein - Vestidos e Roupas Infantis (Apto 82)', 'MEDIO',   '2026-11-03 15:50:00', '2026-11-03 18:25:00', 'PROPRIO', NULL, 'RETIRADA'),
  (107, 107, 6, 6, 'Caixa Droga Raia - Vitaminas e Shampoos (Apto 91)', 'PEQUENO', '2026-11-04 10:00:00', '2026-11-04 19:15:00', 'PROPRIO', NULL, 'RETIRADA'),
  (108, 108, 6, 6, 'Caixa Petz - Ração Royal Canin Golden Retriever 15kg (Apto 102)', 'GRANDE',  '2026-11-05 11:20:00', '2026-11-05 18:40:00', 'PROPRIO', NULL, 'RETIRADA'),
  (109, 109, 6, 6, 'Pacote Mercado Livre - Peças Automotivas (Apto 111)', 'MEDIO',   '2026-11-06 14:00:00', '2026-11-06 20:10:00', 'PROPRIO', NULL, 'RETIRADA'),
  (110, 110, 6, 6, 'Envelope Banco Inter - Novo Cartão Black (Apto 121)', 'PEQUENO', '2026-11-06 16:30:00', '2026-11-06 19:00:00', 'PROPRIO', NULL, 'RETIRADA'),
  (111, 111, 6, 6, 'Caixa Magazine Luiza - Fritadeira Air Fryer Mondial (Apto 131)', 'GRANDE',  '2026-11-07 10:45:00', '2026-11-07 13:20:00', 'PROPRIO', NULL, 'RETIRADA'),
  (112, 112, 6, 6, 'Pacote Shopee - Capas de Almofada e Cortinas (Apto 141)', 'MEDIO',   '2026-11-07 15:00:00', '2026-11-07 19:40:00', 'TERCEIRO', 'Ana Clara (Filha)', 'RETIRADA'),
  (113, 1,   6, 6, 'Caixa Amazon Prime - Livros de Gestão e Kindle (Apto 51)', 'MEDIO',   '2026-11-08 11:15:00', '2026-11-08 17:30:00', 'PROPRIO', NULL, 'RETIRADA'),
  (114, 4,   6, 6, 'Pacote Mercado Livre - Suprimentos de Escritório (Apto 61)', 'PEQUENO', '2026-11-08 14:40:00', '2026-11-08 18:00:00', 'PROPRIO', NULL, 'RETIRADA'),

  -- Encomendas ATUAIS (Aguardando Retirada na Portaria hoje e ontem)
  (115, 101, 6, NULL, 'Caixa Amazon Prime - Filtro de Água e Purificador (Apto 54)', 'MEDIO',   '2026-11-08 16:30:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (116, 102, 6, NULL, 'Envelope Sedex Correios - Documentos Cartório de Imóveis (Apto 62)', 'PEQUENO', '2026-11-09 09:15:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (117, 104, 6, NULL, 'Caixa Mercado Livre Full - Fraldas Pampers e Toalhas Umedecidas (Apto 72)', 'GRANDE',  '2026-11-09 10:20:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (118, 105, 6, NULL, 'Pacote Shopee - Fone de Ouvido Bluetooth Sem Fio (Apto 81)', 'PEQUENO', '2026-11-09 11:05:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (119, 108, 6, NULL, 'Caixa Magazine Luiza - Liquidificador Arno Silence (Apto 102)', 'MEDIO',   '2026-11-09 11:45:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (120, 110, 6, NULL, 'Pacote Zara Online - Roupas e Calçados (Apto 121)', 'MEDIO',   '2026-11-09 13:30:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (121, 113, 6, NULL, 'Caixa Nespresso - Sortimento 100 Cápsulas de Café (Apto 151)', 'PEQUENO', '2026-11-09 14:10:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (122, 114, 6, NULL, 'Caixa Cobasi - Areia Sanitária e Brinquedos Pet (Apto 181)', 'GRANDE',  '2026-11-09 15:00:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (123, 115, 6, NULL, 'Envelope Banco Santander - Token de Segurança (Apto 201)', 'PEQUENO', '2026-11-09 15:40:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (124, 116, 6, NULL, 'Pacote Mercado Livre - Suporte Articulado para TV 55pol (Apto 211)', 'MEDIO',   '2026-11-09 16:20:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA'),
  (125, 117, 6, NULL, 'Caixa Mercado Livre - Jogo de Panelas Tramontina Ceramic (Apto 221)', 'GRANDE',  '2026-11-09 17:15:00', NULL, NULL, NULL, 'AGUARDANDO_RETIRADA')
ON CONFLICT (id_encomenda) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. COMUNICADOS E AVISOS OFICIAIS NO MURAL
-- ----------------------------------------------------------------------------
-- id_perfil_autor = 4 (Ana Paula Souza - Síndica)
-- id_condominio = 1 (OASIS)

INSERT INTO aviso (id_aviso, id_perfil_autor, escopo, titulo, conteudo, data_hora_publicacao, fixado, id_condominio, arquivado)
VALUES
  (101, 4, 'MURAL', 'Assembleia Geral Ordinária (AGO) - Previsão Orçamentária 2027', 
   'Prezados condôminos, convocamos a todos para a nossa Assembleia Geral Ordinária no dia 26/11/2026 às 19h30 no Salão de Festas. Pauta: Prestação de contas do exercício 2026, votação do orçamento 2027 e eleição do Conselho Fiscal. Sua presença é fundamental!', 
   '2026-11-05 10:00:00', true, 1, false),

  (102, 4, 'MURAL', 'Limpeza Semestral dos Reservatórios e Caixas d''Água (15/11)', 
   'Informamos que no feriado de 15/11/2026, das 08h00 às 14h00, será realizada a limpeza e desinfecção semestral dos reservatórios e caixas d''água do condomínio. Solicitamos a todos que mantenham suas torneiras fechadas e façam uso consciente da água.', 
   '2026-11-04 14:30:00', true, 1, false),

  (103, 4, 'MURAL', 'Dedetização e Desratização das Áreas Comuns e Garagens', 
   'No próximo dia 22/11/2026 (domingo), a empresa especializada fará a aplicação de produtos sanitários nas áreas comuns, garagens e lixeiras. O produto é inodoro e seguro para animais de estimação, mas pedimos atenção redobrada com crianças no local durante a aplicação.', 
   '2026-11-03 09:00:00', false, 1, false),

  (104, 4, 'MURAL', 'Regras de Convivência: Pets nas Áreas Comuns e Coleta de Dejetos', 
   'Lembramos que conforme o Regulamento Interno (Art. 34), animais de estimação devem circular nas áreas sociais sempre na guia e acompanhados de seus tutores. É dever cívico do responsável recolher imediatamente quaisquer dejetos de seu animal.', 
   '2026-10-28 16:00:00', false, 1, false),

  (105, 4, 'MURAL', 'Manutenção Preventiva dos Elevadores Sociais - Cronograma Otis', 
   'Informamos que na próxima terça-feira (11/11), entre 09h e 11h, o Elevador Social 1 passará pela vistoria e lubrificação mensal preventiva da Otis. O Elevador Social 2 e o Elevador de Serviço operarão normalmente.', 
   '2026-10-25 11:20:00', false, 1, false),

  (106, 4, 'MURAL', 'Campanha de Natal: Doação de Alimentos e Brinquedos na Portaria', 
   'Iniciamos a arrecadação anual de Natal do OASIS em benefício das crianças e famílias atendidas pela creche comunitária do bairro. Traga brinquedos novos ou alimentos não-perecíveis até a caixa sinalizada na portaria até 15/12.', 
   '2026-11-08 17:00:00', false, 1, false),

  (107, 4, 'MURAL', 'Instalação de Iluminação LED Inteligente nas Garagens e Corredores', 
   'Concluímos a modernização de 100% dos sensores e lâmpadas dos corredores do 5º ao 23º andar e subsolos de garagem por tecnologia LED inteligente, o que representará uma economia estimada de 28% no consumo elétrico condominial.', 
   '2026-10-20 08:30:00', false, 1, false),

  (108, 4, 'MURAL', 'Orientações de Segurança para Entregadores de Aplicativos (iFood/Rappi)', 
   'Por motivos de segurança e cumprimento da Convenção Condominial, não é permitida a subida de entregadores de delivery até os apartamentos. Todas as entregas devem ser retiradas pessoalmente pelo morador na portaria.', 
   '2026-10-15 13:45:00', false, 1, false)
ON CONFLICT (id_aviso) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. CHAMADOS E MANUTENÇÕES COM HISTÓRICO DE MENSAGENS
-- ----------------------------------------------------------------------------
-- id_condominio = 1

INSERT INTO chamado (id_chamado, id_unidade, id_pessoa_autor, id_perfil_autor, id_area_comum, categoria, titulo, descricao, local_especifico, status, data_hora_abertura, data_hora_fechamento, id_condominio)
VALUES
  -- 1. Realizada
  (101, 13, 105, 105, NULL, 'MANUTENCAO', 'Lâmpada tubular do corredor do 8º andar piscando', 
   'A lâmpada em frente ao apartamento 81 está piscando constantemente há dois dias e incomoda à noite.', 
   'Corredor do 8º andar, em frente ao Apto 81', 'REALIZADA', '2026-10-26 14:10:00', '2026-10-27 10:30:00', 1),

  -- 2. Realizada
  (102, 6, 102, 102, 4, 'AVARIA_QUEBRADO', 'Vazamento leve na torneira da pia da churrasqueira', 
   'Notei que a torneira da pia da área da pizza/churrasqueira não está vedando direito quando fechada, ficando um gotejamento contínuo.', 
   'Pia principal da área da churrasqueira', 'REALIZADA', '2026-10-28 17:30:00', '2026-10-29 16:00:00', 1),

  -- 3. Realizada
  (103, 10, 104, 104, 2, 'AVARIA_QUEBRADO', 'Piso da área da piscina com azulejo solto próximo à escada', 
   'Há um azulejo antiderrapante ligeiramente solto perto do corrimão da piscina rasa. Risco de tropeço ou corte nos pés.', 
   'Borda norte da piscina, próximo à escada', 'REALIZADA', '2026-11-01 11:20:00', '2026-11-02 15:00:00', 1),

  -- 4. Realizada
  (104, 6, 102, 102, NULL, 'CONVIVENCIA_BARULHO', 'Barulho excessivo de salto e móveis arrastados após 23h', 
   'Gostaria de solicitar uma advertência amigável em relação ao arrastar de móveis pesados e barulho contínuo tarde da noite no andar superior.', 
   'Apto 72 (acima do 62)', 'REALIZADA', '2026-11-03 23:45:00', '2026-11-04 11:00:00', 1),

  -- 5. Realizada
  (105, 29, 110, 110, NULL, 'LIMPEZA', 'Limpeza necessária no elevador social após transporte de compras', 
   'Houve derramamento acidental de líquido no piso do Elevador Social 1 na tarde de hoje.', 
   'Elevador Social 1', 'REALIZADA', '2026-11-06 15:10:00', '2026-11-06 16:00:00', 1),

  -- 6. Em Andamento
  (106, 33, 111, 111, NULL, 'MANUTENCAO', 'Portão veicular da garagem travando ocasionalmente ao fechar', 
   'O portão automático da rampa do 1º subsolo está emitindo um estalo metálico e demorando alguns segundos a mais para iniciar o fechamento.', 
   'Portão de entrada da garagem - Rampa G1', 'EM_ANDAMENTO', '2026-11-07 08:30:00', NULL, 1),

  -- 7. Em Andamento
  (107, 37, 112, 112, NULL, 'MANUTENCAO', 'Controle de acesso biométrico da entrada de pedestres lento', 
   'A catraca de entrada principal da portaria está demorando quase 10 segundos para reconhecer a impressão digital dos moradores.', 
   'Catraca da guarita principal', 'EM_ANDAMENTO', '2026-11-07 18:20:00', NULL, 1),

  -- 8. Em Andamento
  (108, 41, 113, 113, 1, 'AVARIA_QUEBRADO', 'Ruído estranho no motor da esteira 2 da academia', 
   'A esteira nº 2 da academia está com um chiado forte e trepidação na lona quando passa de 6 km/h.', 
   'Academia - Esteira 02', 'EM_ANDAMENTO', '2026-11-08 07:45:00', NULL, 1),

  -- 9. Em Análise
  (109, 53, 114, 114, NULL, 'AVARIA_QUEBRADO', 'Infiltração no teto da garagem do subsolo próximo à vaga 12', 
   'Notei que há uma mancha úmida e pequenas gotas de água pingando do teto sobre a linha divisória da vaga 12.', 
   'Subsolo 1, teto da vaga 12', 'EM_ANALISE', '2026-11-09 11:30:00', NULL, 1),

  -- 10. Em Análise
  (110, 61, 115, 115, NULL, 'OUTROS', 'Solicitação de espelho convexo na curva da rampa da garagem', 
   'Sugiro a instalação de um espelho convexo panorâmico na curva de descida para o G2 para aumentar a visibilidade entre veículos.', 
   'Curva entre o G1 e o G2', 'EM_ANALISE', '2026-11-09 14:15:00', NULL, 1)
ON CONFLICT (id_chamado) DO NOTHING;

-- Mensagens dos Chamados (Diálogo entre Morador e Gestão)
INSERT INTO chamado_mensagem (id_chamado, id_pessoa, id_perfil, origem, mensagem, data_hora)
VALUES
  -- Chamado 101
  (101, 105, 105, 'MORADOR', 'Boa tarde, a lâmpada em frente ao meu apto continua piscando. Podem verificar?', '2026-10-26 14:12:00'),
  (101, 4, 4, 'ADMINISTRACAO', 'Olá Lucas, o zelador já foi notificado e fará a substituição do reator/lâmpada amanhã cedo.', '2026-10-26 16:00:00'),
  (101, 4, 4, 'ADMINISTRACAO', 'Lâmpada substituída por modelo LED novo. Chamado finalizado!', '2026-10-27 10:30:00'),

  -- Chamado 102
  (102, 102, 102, 'MORADOR', 'A torneira da pia da churrasqueira está pingando sem parar.', '2026-10-28 17:32:00'),
  (102, 4, 4, 'ADMINISTRACAO', 'Compramos o reparo de cerâmica e o encanador já fez a troca. Testado com sucesso.', '2026-10-29 16:00:00'),

  -- Chamado 103
  (103, 104, 104, 'MORADOR', 'Cuidado com o piso perto da piscina rasa, tem uma placa solta que pode machucar.', '2026-11-01 11:22:00'),
  (103, 4, 4, 'ADMINISTRACAO', 'Obrigada pelo aviso, Beatriz! Isolamos a área imediatamente e o azulejista já fixou com argamassa especial.', '2026-11-02 15:00:00'),

  -- Chamado 106
  (106, 111, 111, 'MORADOR', 'O portão da garagem travou por 5 segundos antes de fechar hoje cedo.', '2026-11-07 08:32:00'),
  (106, 4, 4, 'ADMINISTRACAO', 'Empresa de automação PPA já foi chamada. Técnico agendado para lubrificação e ajuste da embreagem nesta terça-feira.', '2026-11-07 10:15:00'),

  -- Chamado 108
  (108, 113, 113, 'MORADOR', 'A esteira 2 está perigosa, a lona parece patinar em velocidade mais alta.', '2026-11-08 07:47:00'),
  (108, 4, 4, 'ADMINISTRACAO', 'Aparelho devidamente sinalizado como em manutenção. Chamado aberto com a assistência técnica da Movement.', '2026-11-08 09:20:00'),

  -- Chamado 109
  (109, 114, 114, 'MORADOR', 'Gostaria que o zelador desse uma olhada no teto da vaga 12, está pingando água.', '2026-11-09 11:32:00'),
  (109, 4, 4, 'ADMINISTRACAO', 'Recebido Rafael. O zelador irá vistoriar na tarde de hoje para verificar se é condensação de ar-condicionado ou cano pluvial.', '2026-11-09 13:00:00')
ON CONFLICT (id_chamado_mensagem) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. ENTREGA DE CHAVES NA PORTARIA (SALAO DE FESTAS E PIZZA/CHURRASQUEIRA)
-- ----------------------------------------------------------------------------
-- id_chave:
-- 1: CH-SALAO-01 (Área 3 - Salão de Festas)
-- 2: CH-CHURRAS-01 (Área 4 - Pizza)
-- 3: CH-CHURRAS-02 (Área 4 - Pizza)
-- Roberto Lima Porteiro = id_perfil 6

INSERT INTO entrega_chave (id_entrega_chave, id_chave, id_perfil_solicitante, id_pessoa_solicitante, id_perfil_entrega, id_perfil_recebimento, id_reserva, data_hora_retirada, data_hora_devolucao, observacao, alerta_24h_enviado)
VALUES
  -- Devoluções de Outubro
  (101, 1, 102, 102, 6, 6, 101, '2026-10-03 11:30:00', '2026-10-03 22:30:00', 'Chave entregue e devolvida com o salão limpo e vistoriado.', false),
  (102, 2, 105, 105, 6, 6, 102, '2026-10-04 10:45:00', '2026-10-04 18:30:00', 'Utensílios e grelhas conferidos.', false),
  (103, 3, 110, 110, 6, 6, 104, '2026-10-10 17:30:00', '2026-10-10 23:20:00', 'Devolução sem avarias.', false),
  (104, 1, 112, 112, 6, 6, 105, '2026-10-11 11:15:00', '2026-10-11 22:45:00', 'Chave entregue à moradora Amanda. Devolvida em ordem.', false),
  (105, 1, 101, 101, 6, 6, 108, '2026-10-24 11:30:00', '2026-10-24 22:20:00', 'Salão e lixeiras conferidos.', false),

  -- Devoluções de Novembro
  (106, 2, 109, 109, 6, 6, 112, '2026-11-06 18:30:00', '2026-11-06 23:30:00', 'Espaço Pizza utilizado e devolvido higienizado.', false),
  (107, 1, 104, 104, 6, 6, 113, '2026-11-07 11:30:00', '2026-11-07 22:15:00', 'Devolvida pela moradora Beatriz.', false),
  (108, 3, 114, 114, 6, 6, 114, '2026-11-08 10:30:00', '2026-11-08 18:30:00', 'Devolvido pelo morador Rafael Moreira.', false),

  -- Chave retirada hoje para vistoria pré-evento
  (109, 1, 106, 106, 6, NULL, 119, '2026-11-09 17:00:00', NULL, 'Chave retirada para decoração e conferência prévia do salão.', false)
ON CONFLICT (id_entrega_chave) DO NOTHING;

-- Atualizar status da chave 1 para EMPRESTADA devido à entrega 109
UPDATE chave SET status = 'EMPRESTADA' WHERE id_chave = 1;

-- ----------------------------------------------------------------------------
-- 7. AJUSTAR SEQUÊNCIAS DO BANCO DE DADOS
-- ----------------------------------------------------------------------------
SELECT setval('pessoa_id_pessoa_seq', GREATEST((SELECT MAX(id_pessoa) FROM pessoa), 200));
SELECT setval('perfil_id_perfil_seq', GREATEST((SELECT MAX(id_perfil) FROM perfil), 200));
SELECT setval('reserva_id_reserva_seq', GREATEST((SELECT MAX(id_reserva) FROM reserva), 200));
SELECT setval('encomenda_id_encomenda_seq', GREATEST((SELECT MAX(id_encomenda) FROM encomenda), 200));
SELECT setval('aviso_id_aviso_seq', GREATEST((SELECT MAX(id_aviso) FROM aviso), 200));
SELECT setval('chamado_id_chamado_seq', GREATEST((SELECT MAX(id_chamado) FROM chamado), 200));
SELECT setval('chamado_mensagem_id_chamado_mensagem_seq', GREATEST((SELECT MAX(id_chamado_mensagem) FROM chamado_mensagem), 200));
SELECT setval('entrega_chave_id_entrega_chave_seq', GREATEST((SELECT MAX(id_entrega_chave) FROM entrega_chave), 200));

SET session_replication_role = 'origin';
