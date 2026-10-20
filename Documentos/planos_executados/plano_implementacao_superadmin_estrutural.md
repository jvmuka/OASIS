# Plano de Implementação: Perfil Superadmin, Gestão Estrutural (Blocos, Andares, Apartamentos, Vagas com Metragem) e Gestão de Pessoas

**Data:** 15/10/2026  
**Contexto:** OASIS - Sistema de Gestão Condominial  
**Status:** Planejado para Implementação  
**Objetivo:** Implementar o perfil `SUPERADMIN` (Administrador da Plataforma/Sistema) com módulo exclusivo de gestão estrutural física (Blocos, Apartamentos com lógica de andares e apartamentos por andar, Vagas de garagem com metragem em m² por apartamento) e gerência avançada e irrestrita de pessoas.

---

## 1. Visão Geral e Arquitetura de Permissões

### 1.1. Separação de Responsabilidades
Para garantir a integridade dos dados e evitar que síndicos ou usuários comuns alterem a estrutura física do prédio, o sistema adota a seguinte hierarquia:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HIERARQUIA DE ACESSO                            │
├─────────────────┬──────────────────────────────────────────────────────┤
│ Perfil          │ Responsabilidade e Escopo                            │
├─────────────────┼──────────────────────────────────────────────────────┤
│ SUPERADMIN      │ • Configuração estrutural física (Blocos, Apts, Vagas)│
│ (Você / Sistema)│ • Geração em lote de andares e unidades              │
│                 │ • Definição de metragens e vagas de garagem          │
│                 │ • Nomeação e troca de Síndicos                       │
│                 │ • Gestão global de pessoas e recuperação de acessos  │
├─────────────────┼──────────────────────────────────────────────────────┤
│ SINDICO         │ • Gestão da rotina do condomínio                     │
│ (Admin Local)   │ • Aprovação de moradores e prestadores               │
│                 │ • Avisos no mural e regras de áreas comuns           │
│                 │ • Relatórios operacionais e reservas                 │
│                 │ ⛔ SEM acesso para criar/deletar blocos e aptos      │
├─────────────────┼──────────────────────────────────────────────────────┤
│ PORTEIRO        │ • Registro de encomendas, chaves e visitantes        │
├─────────────────┼──────────────────────────────────────────────────────┤
│ MORADOR         │ • Suas reservas, encomendas, dependentes e veículos  │
└─────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. Alterações no Banco de Dados (PostgreSQL 16)

### 2.1. Novo Perfil `SUPERADMIN`
O tipo enumerado `tipo_perfil_enum` já possui `ADMINISTRADOR`, `SINDICO`, `MORADOR`, `PORTEIRO`.
Iremos adicionar o valor `'SUPERADMIN'` ao enum `tipo_perfil_enum`:

```sql
ALTER TYPE tipo_perfil_enum ADD VALUE IF NOT EXISTS 'SUPERADMIN';
```

### 2.2. Metragem da Vaga de Garagem na Tabela `vaga_garagem`
Atualmente, a tabela `vaga_garagem` possui identificação, pavimento, tipo de vaga e cobertura, mas não armazena a metragem. Adicionaremos a coluna `metragem_m2`:

```sql
ALTER TABLE vaga_garagem 
  ADD COLUMN IF NOT EXISTS metragem_m2 NUMERIC(6,2) NOT NULL DEFAULT 12.00;

ALTER TABLE vaga_garagem
  ADD CONSTRAINT ck_vaga_metragem_positiva CHECK (metragem_m2 > 0);

COMMENT ON COLUMN vaga_garagem.metragem_m2 IS 'Área útil da vaga de garagem em metros quadrados (m²)';
```

### 2.3. Andar na Tabela `unidade` (Otimização e Agrupamento)
Para facilitar a lógica de "quantos apartamentos por andar" e a visualização no mapa estrutural:

```sql
ALTER TABLE unidade
  ADD COLUMN IF NOT EXISTS andar INTEGER NOT NULL DEFAULT 1;

ALTER TABLE unidade
  ADD CONSTRAINT ck_unidade_andar CHECK (andar >= 0);
```

### 2.4. Script de Migração Consolidado
Criaremos o arquivo:
`banco/migracoes/20261015_superadmin_estrutural_vagas.sql` contendo os comandos DDL acima de forma idempotente e segura.

---

## 3. Especificação do Módulo de Gestão Estrutural

O Superadmin terá ferramentas visuais para gerenciar a planta física do condomínio.

### 3.1. Gerador Estrutural em Lote (Bloco + Andares + Apartamentos + Vagas)
Em vez de cadastrar 80 apartamentos e 80 vagas um por um, o Superadmin poderá usar o **Assistente de Geração em Lote**:

#### Formulário do Assistente:
- **Identificação do Bloco:** Nome (ex: "Bloco A", "Torre Sul") e Descrição.
- **Configuração de Andares:**
  - Quantidade de andares tipo (ex: 10 andares).
  - Inclui térreo residencial? (Sim / Não).
  - Apartamentos por andar (ex: 4 apartamentos por andar).
  - Padrão de numeração:
    - `101, 102, 103, 104` (1º andar)
    - `201, 202, 203, 204` (2º andar)
    - etc.
- **Configuração Padrão das Vagas:**
  - Vagas vinculadas por apartamento (ex: 1 vaga ou 2 vagas por apartamento).
  - Pavimento padrão das vagas (Térreo, Subsolo 1 ou Subsolo 2).
  - Cobertura padrão (Coberta / Descoberta).
  - **Metragem padrão por vaga em m²** (ex: `12.50 m²` para carro de passeio, `15.00 m²` para vagas estendidas/duplas).
  - Máscara de identificação da vaga: ex: `G-{apto}` ou sequencial `V-01, V-02...`.

#### Processamento Transacional Atômico no Backend:
Uma única chamada com `BEGIN ... COMMIT` gera:
1. O registro em `bloco`.
2. As $N$ unidades em `unidade` com `id_bloco`, `andar`, `numero_apartamento`, `numero_vagas`.
3. As $M$ vagas em `vaga_garagem` com `id_unidade`, `identificacao`, `pavimento`, `tipo_vaga`, `coberta`, `metragem_m2`.
Se houver qualquer erro de duplicidade, faz `ROLLBACK` total.

---

### 3.2. Edição e Adição Individual de Unidades e Vagas
Além do gerador em lote, o Superadmin pode:
- **Adicionar Unidade Avulsa:** Ex: Cobertura `1101` com 3 vagas de `18.00 m²`.
- **Editar Apartamento:** Alterar número do apartamento, andar e total de vagas.
- **Gerenciar Vagas da Unidade:**
  - Adicionar nova vaga ao apartamento informando: Identificação, Pavimento, Tipo (Simples/Dupla), Coberta (Sim/Não) e **Metragem ($m^2$)**.
  - Editar metragem e dados de uma vaga existente.
  - Remover vaga desvinculada.

### 3.3. Travas de Segurança Estrutural (Integridade Referencial)
- **Exclusão de Unidade:** 
  - O sistema impede a exclusão de um apartamento se houver pessoas ativas em `pessoa_unidade`, reservas históricas ou encomendas vinculadas.
  - Se estiver vazia e sem histórico, a exclusão é permitida (removendo em cascata as vagas daquela unidade).
- **Exclusão de Bloco:**
  - Só é permitida se o bloco não contiver nenhuma unidade cadastrada.

---

## 4. Especificação da Gerência Global de Pessoas (Superadmin)

O módulo de Pessoas do Superadmin (`/superadmin/pessoas`) supera as limitações da tela do síndico, com foco em governança:

1. **Visão Global Unificada:**
   - Listagem com filtros por Bloco, Apartamento, Papel (`SUPERADMIN`, `SINDICO`, `ADMINISTRADOR`, `MORADOR`, `PORTEIRO`) e Status (`ATIVO`, `BLOQUEADO`, `AGUARDANDO_PRIMEIRO_ACESSO`).
2. **Definição e Troca de Síndico:**
   - Botão para promover qualquer usuário a `SINDICO` ou revogar o mandato, definindo data de início e fim da gestão.
3. **Desbloqueio e Recuperação de Contas:**
   - Desbloqueio imediato de contas bloqueadas por tentativas de senha ou suspensão.
   - Forçar reset de senha ou reenvio de convite de acesso.
4. **Vínculo Unidade-Vaga:**
   - Na ficha da pessoa, visualização direta da unidade em que reside e de todas as vagas de garagem correspondentes (com suas metragens).
5. **Edição Estrutural Segura:**
   - Como Superadmin, permite retificar e-mail ou dados cadastrais em caso de erro material formal comprovado pelo morador.

---

## 5. Arquitetura de Software e Código

### 5.1. Backend (NestJS)

#### A. Atualização do `PerfilGuard` (`backend/src/auth/guards.ts`)
O `SUPERADMIN` terá privilégio supremo:
```typescript
// O Superadmin tem passe livre em rotas administrativas
if (meus.includes('SUPERADMIN')) return true;
```

#### B. Novos Endpoints no Backend
Criaremos o controlador e serviço dedicados em `backend/src/superadmin/`:

1. **Estrutura Física (`superadmin-estrutural.controller.ts`):**
   - `GET /superadmin/estrutura` $\rightarrow$ Retorna árvore completa: Blocos com suas Unidades agrupadas por Andar e respectivas Vagas (com metragem).
   - `POST /superadmin/blocos/lote` $\rightarrow$ Executa a geração em lote com transação.
   - `POST /superadmin/blocos` $\rightarrow$ Cria bloco avulso.
   - `PUT /superadmin/blocos/:id` $\rightarrow$ Edita nome/descrição.
   - `DELETE /superadmin/blocos/:id` $\rightarrow$ Exclui bloco vazio.
   - `POST /superadmin/unidades` $\rightarrow$ Cria unidade avulsa com vagas.
   - `PUT /superadmin/unidades/:id` $\rightarrow$ Edita número, andar.
   - `DELETE /superadmin/unidades/:id` $\rightarrow$ Exclusão protegida.
   - `POST /superadmin/vagas` $\rightarrow$ Adiciona vaga a uma unidade (com `metragem_m2`).
   - `PUT /superadmin/vagas/:id` $\rightarrow$ Altera vaga (metragem, pavimento, cobertura).
   - `DELETE /superadmin/vagas/:id` $\rightarrow$ Remove vaga.

2. **Gestão de Pessoas (`superadmin-pessoas.controller.ts`):**
   - `GET /superadmin/pessoas` $\rightarrow$ Listagem completa com metadados e vagas.
   - `POST /superadmin/pessoas/sindico/:id` $\rightarrow$ Promove usuário a Síndico.
   - `DELETE /superadmin/pessoas/sindico/:id` $\rightarrow$ Revoga perfil de Síndico.
   - `PUT /superadmin/pessoas/:id/status` $\rightarrow$ Altera status da conta (ATIVO / BLOQUEADO).

---

### 5.2. Frontend (React + Vite)

#### A. Roteamento e Proteção (`frontend/src/routes.tsx` ou `App.tsx`)
Criar rotas exclusivas sob o prefixo `/superadmin/*`:
- `/superadmin/estrutura` $\rightarrow$ Gestão de Blocos, Andares, Apartamentos e Vagas de Garagem.
- `/superadmin/pessoas` $\rightarrow$ Governança Global de Usuários e Síndicos.

#### B. Componentes e Telas
1. **Página `EstruturaFisica.tsx`:**
   - **Header:** Botões de ação rápida: `+ Novo Bloco`, `⚡ Gerador Estrutural em Lote`, `+ Nova Unidade`.
   - **Filtro de Blocos:** Abas ou seleção por Bloco.
   - **Visualização por Andares:** Acordeão ou grid mostrando Andar 1, Andar 2...
   - **Card de Apartamento:**
     - Número do Apto (ex: "101")
     - Moradores vinculados
     - Lista de Vagas: Tags estilizadas (ex: `🚗 Vaga G-101 | 12.50 m² | Coberta (Subsolo 1)`).
     - Botões de Ação: Editar Apto, Gerenciar Vagas, Excluir.
2. **Modal `ModalGeradorLote.tsx`:**
   - Campos guiados com validação instantânea e prévia do que será criado.
3. **Modal `ModalVagaGaragem.tsx`:**
   - Cadastro/edição de vaga com campo numérico formatado para Metragem ($m^2$).
4. **Página `PessoasSuperadmin.tsx`:**
   - Tabela rica com filtros, indicativo de perfil (badge especial para Síndico e Superadmin), visualização do apartamento e vagas de garagem de cada residente.

---

## 6. Roteiro Passo a Passo de Execução

| Passo | Atividade | Arquivos Envolvidos |
| :---: | :--- | :--- |
| **1** | Criar script SQL de migração com `metragem_m2`, `andar` e perfil `'SUPERADMIN'` | `banco/migracoes/...sql` |
| **2** | Executar migração no banco de desenvolvimento e atualizar carga de dados | PostgreSQL 16 |
| **3** | Ajustar `guards.ts` e decorators de autenticação no backend | `backend/src/auth/guards.ts` |
| **4** | Criar módulo backend `superadmin` com controllers e services de estrutura e pessoas | `backend/src/superadmin/*` |
| **5** | Implementar gerador em lote e endpoints de vagas com metragem | `superadmin.service.ts` |
| **6** | Criar serviço de API no frontend (`superadmin.ts`) | `frontend/src/services/api.ts` |
| **7** | Desenvolver tela de Gestão Estrutural (Blocos, Andares, Aptos, Vagas com Metragem) | `frontend/src/pages/superadmin/EstruturaFisica.tsx` |
| **8** | Desenvolver tela de Gestão Global de Pessoas e Síndicos | `frontend/src/pages/superadmin/PessoasSuperadmin.tsx` |
| **9** | Adicionar menu e rotas protegidas no layout principal | `frontend/src/App.tsx`, `Sidebar.tsx` |
| **10**| Testes completos de validação, integridade de exclusão e geração em lote | Testes integrados |

---

## 7. Critérios de Aceite
1. Usuários sem perfil `SUPERADMIN` recebem `403 Forbidden` ao tentar acessar qualquer rota de estrutura física.
2. É possível gerar um bloco inteiro com andares, apartamentos e vagas com metragem calculada em um único clique.
3. Cada vaga de garagem exibe e armazena com precisão sua metragem em metros quadrados ($m^2$).
4. A exclusão de unidades com histórico ou moradores é bloqueada com aviso claro.
5. O Superadmin pode gerenciar qualquer pessoa e atribuir/remover síndicos com facilidade.
