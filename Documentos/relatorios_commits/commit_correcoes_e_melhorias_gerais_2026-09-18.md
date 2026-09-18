# Relatório de Alterações de Commit

## 1. Identificação
- **Hash do Commit**: `de02f76`
- **Branch**: `correcoes-e-melhorias-gerais`
- **Autor**: João Pedro Ramos (`jpbramos50@gmail.com`)
- **Data e Horário**: 2026-09-18 10:52 (UTC-3)

---

## 2. Objetivo
Consolidar correções de usabilidade, regras de negócio e melhorias visuais em múltiplos módulos do sistema OASIS (Primeiro Acesso, Painel da Portaria, Áreas Comuns, Reservas e Gestão Familiar).

---

## 3. Resumo das Alterações

### Camadas Impactadas
- `frontend`:
  - **Primeiro Acesso & Login (`Login.tsx`)**:
    - Ajuste da política mínima de senha para 6 caracteres (alinhado aos requisitos).
    - Exibição de mensagens de validação e confirmação de senha inline, diretamente abaixo dos campos correspondentes.
    - Botão de alternar visibilidade de senha (olho) sempre visível e funcional em qualquer momento da digitação.
    - Desativação do botão nativo do Edge (`::-ms-reveal`) em `index.html` para evitar duplicidade de ícones.
  - **Layout & Perfil (`Layout.tsx`)**:
    - Exibição do número do apartamento/unidade ao lado do nome do usuário logado no canto superior direito.
  - **Calendário de Reservas (`Calendario.tsx`, `NovaReserva.tsx`)**:
    - Inclusão de ponto vermelho indicador sob o número do dia no calendário para datas com reservas de dia inteiro.
  - **Portaria (`Portaria.tsx`, `Chaves.tsx`, `Encomendas.tsx`, `SeletorMorador.tsx`)**:
    - Criação do componente reutilizável `SeletorMorador` com busca dinâmica por nome e número do apartamento, eliminando a rolagem manual exaustiva ao registrar encomendas ou emprestar chaves.
    - No painel da portaria ("Agora no Condomínio"), correção para que reservas encerradas desapareçam imediatamente assim que o horário de término chega, eliminando o status indevido de "Em atraso".
  - **Áreas Comuns (`Areas.tsx`)**:
    - Inclusão de seletor de abas ("Futuras / Ativas" vs "Histórico") no card de "Interdições & Manutenções Agendadas", ocultando da tela principal manutenções já finalizadas e movendo-as para o histórico com tags de status e opções contextuais de liberação/exclusão.
  - **Minha Família (`Dependentes.tsx`)**:
    - Ajuste na tela para moradores que são dependentes, exibindo todos os membros cadastrados na unidade (titular e dependentes), acompanhados do grau de parentesco e indicação do próprio usuário "(Você)".

- `backend`:
  - **Autenticação (`auth.service.ts`)**:
    - Ajustada validação do primeiro acesso para aceitar senhas com 6 caracteres ou mais.
  - **Portaria (`portaria.module.ts`)**:
    - Removida query com `UNION ALL` que mantinha reservas passadas por até 3 horas com rótulo "em atraso"; a rota `GET /portaria/ocupacao-agora` agora retorna estritamente reservas ativas no intervalo corrente (`CURRENT_TIMESTAMP BETWEEN inicio AND fim`) e atualiza reservas passadas para `CONCLUIDA`.
  - **Cadastros (`cadastros.module.ts`)**:
    - Rota `GET /cadastros/meus-dependentes` adaptada para que dependentes consigam visualizar os demais membros da mesma unidade familiar.
  - **Banco de Dados (`db.service.ts`)**:
    - Garantia de migração e compatibilidade de colunas para `codigo_primeiro_acesso`.

---

## 4. Detalhamento dos Arquivos Modificados
- `backend/src/auth/auth.service.ts`
- `backend/src/cadastros/cadastros.module.ts`
- `backend/src/db/db.service.ts`
- `backend/src/portaria/portaria.module.ts`
- `backend/src/reservas/reservas.module.ts`
- `frontend/index.html`
- `frontend/nginx.conf`
- `frontend/src/components/Calendario.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/SeletorMorador.tsx` (Novo)
- `frontend/src/components/ui.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/morador/Dependentes.tsx`
- `frontend/src/pages/morador/NovaReserva.tsx`
- `frontend/src/pages/porteiro/Chaves.tsx`
- `frontend/src/pages/porteiro/Encomendas.tsx`
- `frontend/src/pages/porteiro/Portaria.tsx`
- `frontend/src/pages/sindico/Areas.tsx`

---

## 5. Validação
1. Validação do fluxo de primeiro acesso com senha de 6 caracteres e toggle persistente de visualização de senha.
2. Validação da listagem familiar a partir de conta de dependente.
3. Validação dos modais com busca por morador na portaria (encomendas e chaves).
4. Validação da separação de manutenções futuras e histórico na gestão de áreas comuns pelo síndico.
5. Validação da exclusão em tempo real de reservas passadas no painel da portaria ("Agora no Condomínio").
6. Containers Docker de backend e frontend reconstruídos e testados via Docker Compose.
