-- =====================================================================
-- OASIS - Gatilhos (triggers) em PL/pgSQL - PostgreSQL 16
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

    IF NEW.data_hora_inicio < (CURRENT_TIMESTAMP + (COALESCE(v_area.antecedencia_minima_horas, v_area.antecedencia_minima_dias * 24) || ' hours')::INTERVAL) THEN
        RAISE EXCEPTION 'RN06: a reserva exige antecedencia minima de % hora(s).',
                        COALESCE(v_area.antecedencia_minima_horas, v_area.antecedencia_minima_dias * 24);
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
-- RN18: cancelamento automatico de reservas ativas ao aplicar penalidade
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

