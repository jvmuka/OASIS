# Relatório de Alterações de Commit

## 1. Identificação
- **Branch**: `correcoes-e-melhorias-gerais`
- **Data e Horário**: 2026-09-21 16:15 (UTC-3)
- **Mensagem do Commit**: `feat: identidade visual, graficos no painel do sindico, inicio unificado e correcoes`

---

## 2. Objetivo
Implementar a nova identidade visual oficial do condomínio OASIS (logos semânticas e tipografia Plus Jakarta Sans / Inter), reformular a tela Inicial do Morador eliminando redundâncias com Super Cards interativos, modernizar o Painel Geral do Administrador com gráficos vetoriais nativos em SVG (área/linha contínua, donut e ranking de barras), corrigir o comportamento de acordeão individual no Mural de Avisos, implantar recuperação de senha com código seguro, cancelamento automático de reservas por penalidade e rate limiting inteligente.

---

## 3. Resumo das Alterações

### A. Identidade Visual, Logos Oficiais & Tipografia
- **Logos Oficiais Adaptadas (`Documentos/Logos/`, `frontend/public/logos/`)**:
  - Incorporação da nova logo oficial (horizontal e quadrada) enviada pelo cliente.
  - Geração de variantes semânticas com fundo transparente: `#1f3864` (Navy Oasis para tema claro), `#38bdf8` (Sky Blue para tema escuro) e branca.
  - Nova `Logo Guia.png` configurada como favicon da aplicação em `frontend/index.html`.
- **Tipografia Cristalina (`tailwind.config.js`, `index.css`, `index.html`)**:
  - **Inter**: Fonte padrão para todos os textos corridos, tabelas, formulários e cards para legibilidade máxima.
  - **Plus Jakarta Sans**: Fonte geométrica moderna sem serifa para títulos (`h1, h2, h3`, display).

### B. Reformulação da Tela Inicial do Morador (`Inicio.tsx`)
- **Fim da Redundância Visual**: Eliminação da duplicação entre métricas no topo e atalhos repetidos no rodapé.
- **4 Super Cards Interativos**:
  - *Nova Reserva* (com status de disponibilidade e link direto de agendamento).
  - *Minhas Reservas* (com status de reservas ativas e horários do próximo evento).
  - *Minhas Encomendas* (com contador de pacotes na portaria e alerta em tempo real).
  - *Mural de Avisos* (com indicador de comunicados não lidos).
- **Cartão da Unidade Familiar**: Gestão de moradores e veículos integrada à página inicial.
- **Perfis Duplos**: Usuários Síndico + Morador acessam sua residência pelo Início sem perda de contexto, com atalho de topo para o Painel Geral.

### C. Mural de Avisos: Expansão Individual em Acordeão (`Mural.tsx`, `avisos.module.ts`)
- **Correção da Abertura Múltipla**: Substituição da checagem por `id_aviso_perfil` (que retornava 0 em avisos não lidos globalmente) pela chave primária única `id_aviso`.
- **Upsert na Marcação de Leitura**: Atualização de leitura com `ON CONFLICT (id_aviso, id_perfil) DO UPDATE SET lido = TRUE`.

### D. Painel Geral do Administrador com Gráficos Vetoriais SVG (`Painel.tsx`, `Graficos.tsx`, `relatorios.module.ts`)
- **Gráficos em SVG Puro e Responsivo**:
  - *Evolução de Agendamentos*: Curvas suaves Bezier cúbicas com preenchimento em gradiente translúcido, linhas de grade, eixos mensais e tooltips interativos no hover.
  - *Status das Reservas*: Donut circular com centro numérico e fatias coloridas por estado (Concluídas, Ativas, Canceladas).
  - *Espaços Mais Demandados*: Barras horizontais com gradiente de alta precisão e percentuais de ocupação.
- **Super Cards de Indicadores**: Reservas no Mês, Encomendas na Portaria, Moradores Ativos e Chaves em Uso.
- **Feed de Atividades Recentes**: Listagem de agendamentos com avatares, identificador de bloco/apartamento e badges de status.
- **Ações Rápidas**: Atalhos diretos para publicação de avisos, cadastro de moradores e navegação administrativa.

### E. Penalidades, Recuperação de Senha & Segurança
- **Cancelamento Automático por Penalidade (`04_gatilhos.sql`, `cadastros.module.ts`)**: Gatilho `tg_bloqueio_perfil_cancela_reservas` para cancelamento imediato de reservas de infratores com bypass de antecedência na RN08.
- **Recuperação de Senha ("Esqueci Minha Senha") (`auth.service.ts`, `auth.controller.ts`, `Login.tsx`)**: Emissão de código temporário `REC-XXXXXX` e redefinição com criptografia PBKDF2 (100.000 iterações).
- **Throttler Inteligente (`auth-throttler.guard.ts`)**: Rate limiting por `IP + E-mail` para prevenir bloqueios indevidos entre moradores de uma mesma rede.

---

## 4. Arquivos Modificados e Novos

### Backend & Banco de Dados
- `backend/src/app.module.ts`
- `backend/src/auth/auth-throttler.guard.ts` (Novo)
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/avisos/avisos.module.ts`
- `backend/src/cadastros/cadastros.module.ts`
- `backend/src/db/db.service.ts`
- `backend/src/main.ts`
- `backend/src/relatorios/relatorios.module.ts`
- `banco/02_tabelas.sql`
- `banco/04_gatilhos.sql`
- `banco/oasis_banco_completo.sql`

### Frontend
- `frontend/index.html`
- `frontend/tailwind.config.js`
- `frontend/src/index.css`
- `frontend/src/components/Graficos.tsx` (Novo)
- `frontend/src/components/Layout.tsx`
- `frontend/src/pages/Inicio.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/morador/Mural.tsx`
- `frontend/src/pages/sindico/Painel.tsx`
- `frontend/src/pages/sindico/Pessoas.tsx`
- `frontend/public/favicon.png` (Novo)
- `frontend/public/logos/` (Novos assets)

### Documentação & Ativos
- `Documentos/Fontes/Runiga.otf`
- `Documentos/Logos/`
- `Documentos/relatorios_commits/commit_recuperacao_senha_identidade_visual_paineis_2026-09-21.md`
