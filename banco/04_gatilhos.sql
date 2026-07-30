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
           AND r.status        = 'ATIVA'
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

    -- RN06: antecedencia minima e maxima
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
       AND r.status        = 'ATIVA'
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
        SELECT prazo_cancelamento_horas INTO v_prazo
          FROM area_comum WHERE id_area_comum = NEW.id_area_comum;

        IF CURRENT_TIMESTAMP > (OLD.data_hora_inicio - (v_prazo || ' hours')::INTERVAL) THEN
            RAISE EXCEPTION 'RN08: cancelamento permitido somente ate % hora(s) antes do inicio.',
                            v_prazo;
        END IF;

        NEW.data_hora_cancelamento := CURRENT_TIMESTAMP;
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
