# Guia Operacional de Orquestração: Chats Especializados e Subagentes de IA

Este guia orienta como estruturar o desenvolvimento do projeto **OASIS** utilizando múltiplos chats (Frontend/UX vs. Backend/Infraestrutura) ou subagentes autônomos (`/teamwork`), garantindo **máxima assertividade nos prompts, preservação do contexto do código e ausência de retrabalho**.

---

## 🗺️ 1. Estratégia de Segregação de Chats

Para evitar que a janela de contexto fique saturada com informações irrelevantes de outra camada (o que causa lentidão e perda de contexto), o desenvolvimento é dividido em dois ambientes focados:

```
┌───────────────────────────────────────────────────┐
│               REPOSITÓRIO GIT (MAIN)              │
│       (Ponto único de verdade e sincronia)        │
└─────────▲───────────────────────────────▲─────────┘
          │                               │
          │ git pull / commit             │ git pull / commit
          │                               │
┌─────────┴───────────────┐     ┌─────────┴───────────────┐
│         CHAT 1          │     │         CHAT 2          │
│     Frontend & UX/UI    │     │  Backend & Infraestrutura│
├─────────────────────────┤     ├─────────────────────────┤
│ • Telas React & Vite    │     │ • APIs & Controllers    │
│ • Tailwind CSS & Layout │     │ • NestJS & DTOs         │
│ • Modais, Tabelas, UX   │     │ • PostgreSQL & SQL      │
│ • Feedback visual, Guia │     │ • Docker, Nginx, SSL    │
│ • Consumo de rotas      │     │ • VPS Oracle & Deploy   │
└─────────────────────────┘     └─────────────────────────┘
```

---

## 📋 2. Como Executar um Plano de Implementação em 2 Chats

Ao criar uma nova funcionalidade que afeta tanto o backend quanto o frontend, utilize o fluxo **"Plano Único, Execução em Etapas"**:

### Passo 1: Elaborar o Plano Compartilhado
Peça a elaboração do plano no chat de sua preferência. Ele deve ser salvo em arquivo markdown:
> **Caminho:** `Documentos/planos_pendentes/plano_<nome_da_feature>.md`

O plano deve conter claramente a divisão em 3 Fases:
- **Fase 1:** Modelagem de Dados (Tabelas, índices, enums e migrações SQL).
- **Fase 2:** Backend NestJS (Módulos, Services, Controllers, Guards e DTOs tipados).
- **Fase 3:** Frontend React (Telas, Componentes de UI, Modais, Hooks e Integração).

---

### Passo 2: Executar Fases 1 e 2 no Chat de Backend & Infraestrutura
No chat de Backend, envie o seguinte prompt:

```text
[AÇÃO]: Puxe as novidades com `git pull origin main`.
[OBJETIVO]: Leia o plano em `Documentos/planos_pendentes/plano_<nome_da_feature>.md` e execute EXCLUSIVAMENTE a Fase 1 (Banco de Dados) e a Fase 2 (Backend NestJS).
[REQUISITO]: Ao finalizar, crie/atualize os contratos de tipagem em `frontend/src/types/`, teste o build com `npm run build`, dê commit e faça o push para a branch `main`.
```

---

### Passo 3: Executar Fase 3 no Chat de Frontend & UX/UI
Após o backend ter enviado as rotas para a `main`, venha para este chat de Frontend e envie:

```text
[AÇÃO]: Puxe as novidades com `git pull origin main`.
[OBJETIVO]: Leia o plano em `Documentos/planos_pendentes/plano_<nome_da_feature>.md` e execute a Fase 3 (Frontend & UX/UI).
[REQUISITO]:
1. Consuma as rotas e tipos que o backend acabou de criar.
2. Siga rigorosamente o padrão visual de `Documentos/padroes/padrao_ux_ui.md` (tabelas paginadas a 20 itens, filtros, modais de confirmação, micro-interações).
3. Teste o build do frontend, dê commit e envie para a branch `main`.
```

> [!TIP]
> **Por que essa sequência é a mais segura?**  
> Porque o Frontend nunca trabalhará com suposições de rotas. Quando o agente de Frontend for programar, a API real já estará documentada e tipada pelo Backend.

---

## 🤖 3. Alternativa com Chat Único: Modo Teamwork (`/teamwork`)

Se você preferir resolver uma funcionalidade completa **dentro do mesmo chat** sem alternar de janela, utilize a equipe de subagentes do Antigravity.

### Como acionar:
Digite no chat:
```text
/teamwork Crie e implemente o plano para a funcionalidade <nome_da_feature>, coordenando subagentes especializados para Backend e Frontend.
```

### Como o Antigravity opera nesse modo:
1. O agente principal assume o papel de **Tech Lead (Orquestrador)**.
2. Ele dispara em segundo plano um **Subagente de Backend** (que cuida do SQL e das APIs NestJS).
3. Em seguida, aciona um **Subagente de Frontend** (que constrói as telas e conecta os endpoints).
4. O Tech Lead consolida o resultado final, compila o projeto e apresenta o relatório completo para você.

---

## 🛡️ 4. As 4 Regras de Ouro para Blindar o Projeto

1. **Git é a Ponte:** Nunca inicie uma tarefa em um chat sem rodar `git pull origin main` antes, e nunca saia de um chat sem comitar e dar `git push`.
2. **Contratos Tipados (TypeScript):** O backend deve sempre definir interfaces claras em `frontend/src/types/` ao entregar uma rota nova.
3. **Consulte os Padrões Oficiais:**
   - Para telas, tabelas e modais: [`Documentos/padroes/padrao_ux_ui.md`](file:///c:/Users/Usuario/.gemini/antigravity-ide/scratch/oasis/Documentos/padroes/padrao_ux_ui.md).
   - Para regras de arquitetura: [`Documentos/padroes/diretrizes_desenvolvimento.md`](file:///c:/Users/Usuario/.gemini/antigravity-ide/scratch/oasis/Documentos/padroes/diretrizes_desenvolvimento.md).
   - Para rotinas de agentes: [`Documentos/AGENTS.md`](file:///c:/Users/Usuario/.gemini/antigravity-ide/scratch/oasis/Documentos/AGENTS.md).
4. **Relatórios de Commit:** A cada entrega importante, o agente gera um relatório em `Documentos/relatorios_commits/commit_*.md`. Isso permite que o outro chat leia o resumo do que foi entregue sem precisar analisar milhares de linhas de diff.

---

## 🎯 5. Fórmula do Prompt Assertivo (Template Prático)

Para obter respostas diretas e sem alucinações, monte seus prompts sempre neste formato:

```markdown
[OBJETIVO]: O que deve ser feito (ex: Nova tela de relatórios de consumo).
[CAMADA]: Frontend & UX/UI (ou Backend & Banco).
[REFERÊNCIAS]: 
- Plano: Documentos/planos_pendentes/plano_relatorios.md
- Guia visual: Documentos/padroes/padrao_ux_ui.md
[CRITÉRIO DE SUCESSO]: A tela deve abrir em /relatorios, exibir tabela com paginação de 20 registros e compilar com 0 erros no build.
```
