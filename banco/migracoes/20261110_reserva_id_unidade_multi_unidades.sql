-- ==============================================================================
-- MIGRAÇÃO: Suporte completo a múltiplas unidades por pessoa
-- Adiciona id_unidade opcional/rastreável em reserva, realiza backfill das
-- reservas existentes e atualiza fn_valida_reserva() para validar por unidade.
-- ==============================================================================

BEGIN;

ALTER TABLE reserva ADD COLUMN IF NOT EXISTS id_unidade INTEGER REFERENCES unidade(id_unidade);
CREATE INDEX IF NOT EXISTS idx_reserva_unidade ON reserva(id_unidade);

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
    IF TG_OP = 'UPDATE' AND NEW.status <> 'ATIVA' THEN
        RETURN NEW;
    END IF;

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
           AND r.status IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
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
           AND r.status IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
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
       AND r.status IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
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
       AND r.status IN ('ATIVA', 'CONCLUIDA')
       AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
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
           AND r.status IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
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
           AND r.status IN ('ATIVA', 'CONCLUIDA')
           AND r.id_reserva <> COALESCE(NEW.id_reserva, -1)
           AND r.id_perfil = NEW.id_perfil
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

-- Preenche id_unidade nas reservas existentes utilizando a unidade principal do solicitante
UPDATE reserva r
   SET id_unidade = (
     SELECT pu.id_unidade
       FROM perfil pf
       JOIN pessoa_unidade pu ON pu.id_pessoa = pf.id_pessoa AND pu.data_fim_ocupacao IS NULL
      WHERE pf.id_perfil = r.id_perfil
      ORDER BY pu.reside DESC, pu.id_pessoa_unidade ASC
      LIMIT 1
   )
 WHERE r.id_unidade IS NULL;

COMMIT;
