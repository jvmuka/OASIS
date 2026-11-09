-- Dados de teste demonstrativos para Painel e Relatórios PDF no mês 11/2026 e projeções futuras
SET session_replication_role = 'replica';

INSERT INTO reserva (id_area_comum, id_perfil, data_hora_inicio, data_hora_fim, numero_pessoas, status, observacao)
VALUES
-- 2026-11-01 (Domingo): Churrasqueira Carlos Silva (R$ 60,00) - Concluída
(4, 1, '2026-11-01 12:00:00', '2026-11-01 16:00:00', 10, 'CONCLUIDA', 'Almoço de família'),
-- 2026-11-07 (Sábado): Salão de Festas Carlos Silva (R$ 150,00) - Concluída
(3, 1, '2026-11-07 18:00:00', '2026-11-07 23:00:00', 30, 'CONCLUIDA', 'Aniversário'),
-- 2026-11-08 (Domingo): Salão de Festas Maria Santos (R$ 150,00) - Concluída
(3, 2, '2026-11-08 17:00:00', '2026-11-08 22:00:00', 25, 'CONCLUIDA', 'Jantar entre amigos'),
-- 2026-11-14 (Sábado): Churrasqueira Helena Braga (R$ 60,00) - Ativa (futura no mês)
(4, 7, '2026-11-14 11:00:00', '2026-11-14 15:00:00', 8, 'ATIVA', 'Almoço com amigas'),
-- 2026-11-21 (Sábado): Churrasqueira Maria Santos (R$ 60,00) - Ativa (futura no mês)
(4, 2, '2026-11-21 11:00:00', '2026-11-21 15:00:00', 12, 'ATIVA', 'Confraternização'),
-- 2026-11-28 (Sábado): Salão de Festas Ana Paula Souza (R$ 150,00) - Ativa (futura no mês)
(3, 5, '2026-11-28 18:00:00', '2026-11-28 23:00:00', 20, 'ATIVA', 'Comemoração familiar'),
-- 2026-12-12 (Sábado): Salão de Festas Carlos Silva (R$ 150,00) - Projeção Dezembro
(3, 1, '2026-12-12 18:00:00', '2026-12-12 23:00:00', 35, 'ATIVA', 'Festa de fim de ano'),
-- 2026-12-20 (Domingo): Churrasqueira Maria Santos (R$ 60,00) - Projeção Dezembro
(4, 2, '2026-12-20 12:00:00', '2026-12-20 16:00:00', 15, 'ATIVA', 'Confraternização de Natal'),
-- 2027-01-16 (Sábado): Salão de Festas Helena Braga (R$ 150,00) - Projeção Janeiro
(3, 7, '2027-01-16 18:00:00', '2027-01-16 23:00:00', 20, 'ATIVA', 'Aniversário infantil')
ON CONFLICT DO NOTHING;

INSERT INTO chamado (id_unidade, id_pessoa_autor, id_perfil_autor, id_area_comum, categoria, titulo, descricao, status, data_hora_abertura, data_hora_fechamento, id_condominio)
VALUES
(1, 1, 1, NULL, 'AVARIA_QUEBRADO', 'Lâmpada do corredor queimada', 'A lâmpada em frente ao apto 302 queimou.', 'REALIZADA', '2026-11-03 09:00:00+00', '2026-11-04 14:00:00+00', 1),
(2, 2, 2, NULL, 'LIMPEZA', 'Mancha de óleo na garagem do subsolo', 'Mancha escorregadia próxima à vaga 12.', 'REALIZADA', '2026-11-04 10:00:00+00', '2026-11-05 11:30:00+00', 1),
(3, 4, 5, NULL, 'MANUTENCAO', 'Portão da garagem com ruído anormal', 'O motor do portão principal está rangendo ao fechar.', 'EM_ANDAMENTO', '2026-11-07 14:00:00+00', NULL, 1),
(4, 6, 7, NULL, 'CONVIVENCIA_BARULHO', 'Ruído excessivo após as 22h', 'Som alto frequente no bloco B.', 'EM_ANALISE', '2026-11-08 23:15:00+00', NULL, 1)
ON CONFLICT DO NOTHING;

SET session_replication_role = 'origin';
