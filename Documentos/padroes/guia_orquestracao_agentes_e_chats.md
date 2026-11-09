# Guia Operacional de Orquestração: Chats Especializados e Subagentes de IA

Este guia orienta como estruturar o desenvolvimento do projeto **OASIS** utilizando múltiplos chats (Frontend/UX vs. Backend/Infraestrutura) ou subagentes autônomos (`/teamwork`), garantindo **máxima assertividade nos prompts, preservação do contexto do código e ausência de retrabalho**.

---

## 🗺️ 1. Estratégia de Segregação de Branches e Chats

Para garantir que a **VPS de Produção** nunca receba código quebrado ou incompleto, o fluxo de branches do OASIS segue o modelo de integração segura:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRANCH `main` (PRODUÇÃO)                        │
│          Roda na VPS Oracle (oasiscondo.com.br) - Apenas código        │
│                100% testado, validado e com build verde                │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ (Merge final após tudo pronto)
┌───────────────────────────────────┴────────────────────────────────────┐
│                  BRANCH `dev` (OU `feat/<sua-branch>`)                 │
│         Sincronização contínua entre os chats em desenvolvimento       │
└─────────▲────────────────────────────────────────────────────▲─────────┘
          │                                                    │
          │ git pull / push origin dev                         │ git pull / push origin dev
          │                                                    │
┌─────────┴────────────────────────┐         ┌─────────────────┴─────────┐
│              CHAT 1              │         │           CHAT 2          │
│         Frontend & UX/UI         │         │  Backend & Infraestrutura │
├──────────────────────────────────┤         ├───────────────────────────┤
│ • Telas React & Vite             │         │ • APIs & Controllers      │
│ • Tailwind CSS & Layout          │         │ • NestJS & DTOs           │
│ • Modais, Tabelas, UX            │         │ • PostgreSQL & SQL        │
│ • Feedback visual, Guia          │         │ • Docker, Nginx, SSL      │
│ • Consumo de rotas criadas       │         │ • VPS Oracle & Deploy     │
└──────────────────────────────────┘         └───────────────────────────┘
```

> [!IMPORTANT]
> **Regra Fundamental de Branches:**
> - **`dev` (ou `feat/<nome>`):** É a branch onde os chats trocam código durante o desenvolvimento no localhost. A sincronização entre chats acontece sempre aqui.
> - **`main`:** É a branch de produção. Ela **só recebe código** quando o backend E o frontend terminarem e forem validados. É desta branch que a VPS puxa as atualizações.

---

## 📋 2. Como Executar um Plano de Implementação em 2 Chats

Ao criar uma nova funcionalidade que afeta tanto o backend quanto o frontend, utilize o fluxo **"Plano Único, Execução em Etapas na Branch Ativa"**:

### Passo 1: Elaborar o Plano Compartilhado
Peça a elaboração do plano no chat de sua preferência. Ele deve ser salvo em arquivo markdown:
> **Caminho:** `Documentos/planos_pendentes/plano_<nome_da_feature>.md`

O plano deve conter claramente a divisão em 3 Fases:
- **Fase 1:** Modelagem de Dados (Tabelas, índices, enums e migrações SQL).
- **Fase 2:** Backend NestJS (Módulos, Services, Controllers, Guards e DTOs tipados).
- **Fase 3:** Frontend React (Telas, Componentes de UI, Modais, Hooks e Integração).

---

### Passo 2: Executar Fases 1 e 2 no Chat de Backend & Infraestrutura
No chat de Backend, certifique-se de estar na branch de trabalho (`dev` ou `feat/<nome>`) e envie o prompt:

```text
[AÇÃO]: Puxe as novidades com `git pull origin <sua-branch>` (ex: dev).
[OBJETIVO]: Leia o plano em `Documentos/planos_pendentes/plano_<nome_da_feature>.md` e execute EXCLUSIVAMENTE a Fase 1 (Banco de Dados) e a Fase 2 (Backend NestJS).
[REQUISITO]: Ao finalizar, crie/atualize os contratos de tipagem em `frontend/src/types/`, teste o build com `npm run build`, dê commit e faça o push para a branch `<sua-branch>` (ex: dev).
```

---

### Passo 3: Executar Fase 3 no Chat de Frontend & UX/UI
Após o backend ter enviado as rotas para a branch de trabalho, venha para este chat de Frontend e envie:

```text
[AÇÃO]: Puxe as novidades com `git pull origin <sua-branch>` (ex: dev).
[OBJETIVO]: Leia o plano em `Documentos/planos_pendentes/plano_<nome_da_feature>.md` e execute a Fase 3 (Frontend & UX/UI).
[REQUISITO]:
1. Consuma as rotas e tipos que o backend acabou de criar.
2. Siga rigorosamente o padrão visual de `Documentos/padroes/padrao_ux_ui.md` (tabelas paginadas a 20 itens, filtros, modais de confirmação, micro-interações).
3. Teste o build do frontend, dê commit e envie para a branch `<sua-branch>` (ex: dev).
```

---

### Passo 4: Merge para a `main` e Deploy na VPS
Com as 3 fases concluídas e testadas no localhost:
1. Faça o merge da sua branch de desenvolvimento para a **`main`**:
   ```bash
   git checkout main
   git merge dev   # ou git merge feat/<sua-branch>
   git push origin main
   ```
2. Na VPS via Termius, puxe a versão pronta da `main`:
   ```bash
   git pull origin main
   sudo docker compose up -d --build
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

1. **Git é a Ponte:** Nunca inicie uma tarefa em um chat sem rodar `git pull origin <sua-branch>` (ex: `dev` ou a branch da feature) antes, e nunca saia de um chat sem comitar e dar `git push`. A `main` só recebe merge quando a feature estiver 100% pronta para ir para a VPS.
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

