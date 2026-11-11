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

    -- no backfill administrativo de id_unidade em reservas existentes nao revalidar antecedencia
    IF TG_OP = 'UPDATE'
       AND OLD.id_unidade IS NULL
       AND NEW.id_unidade IS NOT NULL
       AND NEW.status = OLD.status
       AND NEW.id_area_comum = OLD.id_area_comum
       AND NEW.id_perfil = OLD.id_perfil
       AND NEW.data_hora_inicio = OLD.data_hora_inicio
       AND NEW.data_hora_fim = OLD.data_hora_fim THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_area FROM area_comum WHERE id_area_comum = NEW.id_area_comum;

    IF NOT v_area.ativo THEN
        RAISE EXCEPTION 'Area comum inativa: reservas nao sao permitidas.';
    END IF;

    -- Resolve unidade da reserva quando nao informada explicitamente
    IF NEW.id_unidade IS NULL THEN
        SELECT pu.id_unidade INTO NEW.id_unidade
          FROM perfil pf
          JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
         WHERE pf.id_perfil = NEW.id_perfil
         ORDER BY pu.reside DESC, pu.id_pessoa_unidade ASC
         LIMIT 1;
    END IF;

    -- RN01-A: a mesma unidade nao pode reservar o mesmo horario mais de uma vez
    IF (NEW.id_unidade IS NOT NULL AND EXISTS (
        SELECT 1
          FROM reserva r
         WHERE r.id_area_comum = NEW.id_area_comum
           AND r.status        IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
           AND (NEW.data_hora_inicio, NEW.data_hora_fim)
               OVERLAPS (r.data_hora_inicio, r.data_hora_fim)
           AND (
               r.id_unidade = NEW.id_unidade
               OR (
                   r.id_unidade IS NULL
                   AND EXISTS (
                       SELECT 1
                         FROM perfil pf
                         JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
                        WHERE pf.id_perfil = r.id_perfil
                          AND pu.id_unidade = NEW.id_unidade
                   )
               )
           )
    )) OR (NEW.id_unidade IS NULL AND EXISTS (
        SELECT 1
          FROM reserva r
         WHERE r.id_area_comum = NEW.id_area_comum
           AND r.status        IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
           AND (NEW.data_hora_inicio, NEW.data_hora_fim)
               OVERLAPS (r.data_hora_inicio, r.data_hora_fim)
           AND r.id_perfil = NEW.id_perfil
    )) THEN
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
    IF NEW.id_unidade IS NOT NULL THEN
        SELECT COUNT(DISTINCT r.id_reserva) INTO v_qtd_periodo
          FROM reserva r
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
           AND (
               r.id_unidade = NEW.id_unidade
               OR (
                   r.id_unidade IS NULL
                   AND EXISTS (
                       SELECT 1
                         FROM perfil pf
                         JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
                        WHERE pf.id_perfil = r.id_perfil
                          AND pu.id_unidade = NEW.id_unidade
                   )
               )
           );
    ELSE
        SELECT COUNT(DISTINCT r.id_reserva) INTO v_qtd_periodo
          FROM reserva r
         WHERE r.id_area_comum = NEW.id_area_comum
           AND r.status        IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva   <> COALESCE(NEW.id_reserva, -1)
           AND r.id_perfil     = NEW.id_perfil
           AND (
               (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'DIARIO'
                AND r.data_hora_inicio::date = NEW.data_hora_inicio::date)
            OR (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'SEMANAL'
                AND date_trunc('week', r.data_hora_inicio) = date_trunc('week', NEW.data_hora_inicio))
            OR (COALESCE(v_area.tipo_limite_reserva, 'SEMANAL') = 'MENSAL'
                AND date_trunc('month', r.data_hora_inicio) = date_trunc('month', NEW.data_hora_inicio))
           );
    END IF;

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
        VALUES ('Residencial Solar das Palmeiras', 'Condomínio Solar das Palmeiras Ltda', '98765432000188', 'solar-palmeiras', 'Av. das Palmeiras, 500', 'Curitiba', 'PR', '80000000', TRUE)
        RETURNING id_condominio INTO v_id_condo_solar;
    END IF;

    INSERT INTO condominio_modulo (id_condominio, codigo_modulo, ativo)
    SELECT v_id_condo_solar, m.codigo, TRUE
      FROM modulo_sistema m
    ON CONFLICT (id_condominio, codigo_modulo) DO NOTHING;

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
        VALUES ('firebase-mariana-solar', 'Mariana Santos', 'mariana.santos@solar.com', '41998881122', '77788899900', v_senha_hash, TRUE)
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

        INSERT INTO chave (id_area_comum, codigo, status, observacao, id_condominio)
        VALUES (v_id_area_gourmet, 'CH-SOLAR-GOURMET', 'DISPONIVEL', 'Chave e controle do ar condicionado', v_id_condo_solar);
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

        INSERT INTO chave (id_area_comum, codigo, status, observacao, id_condominio)
        VALUES (v_id_area_salao, 'CH-SOLAR-NOBRE', 'DISPONIVEL', 'Chave principal do Salão Nobre', v_id_condo_solar);
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
