-- =====================================================================
-- OASIS - Sistema de gestao de reservas e controle de acesso
-- Script de criacao do banco de dados - PostgreSQL 16
-- Parte 1 de 3: criacao do banco e dos tipos enumerados
-- =====================================================================

DROP DATABASE IF EXISTS oasis;

-- A codificacao e o locale sao herdados do cluster, o que torna o script
-- portavel entre Windows e Linux (os nomes de locale diferem entre eles).
CREATE DATABASE oasis;

COMMENT ON DATABASE oasis IS 'Base de dados do sistema OASIS - UEPG 2026';

\c oasis

-- ---------------------------------------------------------------------
-- Tipos enumerados (dominios fechados)
-- ---------------------------------------------------------------------
CREATE TYPE tipo_perfil_enum            AS ENUM ('MORADOR','ADMINISTRADOR','SINDICO','PORTEIRO');
CREATE TYPE tipo_vinculo_enum           AS ENUM ('PROPRIETARIO','INQUILINO','DEPENDENTE');
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
