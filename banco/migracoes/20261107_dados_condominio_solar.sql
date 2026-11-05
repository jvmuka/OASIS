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
