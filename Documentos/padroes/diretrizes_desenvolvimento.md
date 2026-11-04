# Diretrizes de Engenharia e Padrões de Desenvolvimento — Sistema OASIS

Este documento consolida as diretrizes técnicas, arquiteturais e de qualidade de código adotadas no desenvolvimento do **OASIS**.

---

## 1. Princípios Arquiteturais

O OASIS foi concebido seguindo a arquitetura clássica em três camadas desacopladas, executadas em contêineres Docker isolados:

```
[ Frontend: React + Vite + Tailwind (Nginx) ]
                       |  (HTTP/REST - JSON)
                       v
[ Backend: NestJS + TypeScript (API REST)   ]
                       |  (pg / TCP Pool)
                       v
[ Banco de Dados: PostgreSQL 16 Alpine      ]
```

### Regras por Camada:
1. **Banco de Dados (PostgreSQL 16)**:
   - **Autoridade Máxima**: As regras de negócio críticas (RN01 a RN17) residem nos gatilhos (`triggers`) e restrições (`constraints`) do PostgreSQL.
   - Qualquer violação de integridade ou regra condominial é recusada diretamente pelo banco, garantindo que nenhum acesso indevido ocorra mesmo via chamadas diretas.
   - Todo identificador no banco segue snake_case (ex.: `id_pessoa`, `tipo_vinculo`, `data_hora_inicio`).

2. **Backend (NestJS + TypeScript)**:
   - Atua como orquestrador, validador de contratos e mediador entre o frontend e o banco.
   - Traduz exceções e erros de gatilho do banco para respostas HTTP semânticas (400, 401, 403, 404, 500).
   - Segurança baseada em JWT com Guards (`AuthGuard`, `PerfisGuard`).
   - Módulos organizados por domínio funcional (`cadastros`, `portaria`, `reservas`, `avisos`, `areas`, `relatorios`, `superadmin`).

3. **Frontend (React + Vite + Tailwind)**:
   - Consome a API REST via serviço centralizado `api.ts`.
   - Gerencia a reatividade, validação preventiva no cliente, estados de loading, dark mode e feedback ao usuário.
   - Toda tela deve seguir rigorosamente as diretrizes descritas em [`padrao_ux_ui.md`](padrao_ux_ui.md).

---

## 2. Padrões de Código e Nomenclatura

- **Linguagem**: Todas as mensagens ao usuário, nomes de tabelas, entidades, comentários e documentação devem estar em **Português do Brasil**.
- **Componentes React**: PascalCase (ex.: `ModalPerfilUsuario.tsx`, `EstruturaFisica.tsx`).
- **Funções e Variáveis**: camelCase (ex.: `carregarPessoas`, `abrirModalEdicao`).
- **Interfaces e Tipos**: PascalCase (ex.: `Pessoa`, `MoradorVinculado`, `EstruturaResponse`).
- **Tom de Comunicação**: Profissional, técnico, objetivo e conciso, sem gírias ou emojis avulsos na interface.

---

## 3. Gestão de Commits e Relatórios

Conforme estipulado no projeto:
1. Todo commit deve possuir mensagem semântica no padrão Conventional Commits:
   - `feat(...)`: nova funcionalidade
   - `fix(...)`: correção de bug ou vulnerabilidade
   - `refactor(...)`: refatoração sem alteração de comportamento
   - `docs(...)`: atualização de documentação
   - `chore(...)`: tarefas de manutenção ou infraestrutura
2. Sempre que for realizado um `git push` para o repositório remoto, deve ser mantido um relatório de commit detalhado na pasta `Documentos/relatorios_commits/` seguindo a nomenclatura `commit_<hash>_<data>.md`.
3. Informações de segredo, chaves e tokens nunca devem ser commitados no repositório (uso restrito de `.env.exemplo` e `.env.demonstracao`).
