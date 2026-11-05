# Relatório de Commit - Correção de Isolamento Multicondomínio e Bateria de Testes

**Data:** 05/11/2026  
**Branch:** `feat/arquitetura-multicondominio`  
**Objetivo:** Eliminar vazamento de dados entre condomínios na troca de contexto, implementar envio e resolução de headers de condomínio com validação de permissões, semear dados segregados de exemplo para o condomínio secundário e rodar bateria abrangente de testes automatizados de leitura, escrita e segurança.

---

## 1. Contexto e Problema Identificado

Ao alternar entre condomínios como Superadmin no seletor de topo do layout, as telas continuavam exibindo as mesmas informações do Condomínio 1.
Foram identificadas quatro causas principais:
1. **Frontend (`api.ts`):** Nem `req<T>()` nem `upload<T>()` enviavam o cabeçalho HTTP `x-condominio-id` com o ID do condomínio ativo na sessão.
2. **Backend Controllers:** Consultas SQL nos módulos `areas`, `avisos`, `chamados`, `cadastros`, `portaria`, `relatorios` e `reservas` não filtravam os registros por `id_condominio = $1` nem persistiam a chave estrangeira em operações de escrita.
3. **Guards e CORS:** O cabeçalho `x-condominio-id` não estava na lista de `allowedHeaders` do CORS no `main.ts`, e não havia proteção impedindo moradores convencionais de forçarem acesso a outros condomínios via cabeçalho.
4. **Base de Dados:** O Condomínio 2 (*Residencial Solar das Palmeiras*) não possuía áreas, blocos, unidades ou avisos próprios cadastrados para exibição diferenciada.

---

## 2. Implementações Realizadas

### 2.1. Backend
- **`backend/src/main.ts`:**
  - Adicionado `x-condominio-id` e `X-Condominio-Id` em `allowedHeaders` do CORS.
- **`backend/src/auth/guards.ts`:**
  - Implementada função `resolverIdCondominio(req)`.
  - Regra de segurança: Apenas `SUPERADMIN` tem permissão de sobrepor o condomínio ativo via header HTTP. Usuários convencionais (Morador, Síndico, Porteiro) ficam estritamente restritos ao `id_condominio` de seu token JWT e vínculo ativo.
- **`backend/src/auth/auth.service.ts`:**
  - Na geração de sessão (`gerarSessaoParaPessoa`), as unidades vinculadas ao usuário agora são filtradas exclusivamente pelo condomínio selecionado, evitando exibir número de apartamento de condomínios alheios.
- **`backend/src/areas/areas.module.ts`:**
  - Listagem de áreas e bloqueios filtrada por `a.id_condominio = $1`.
  - Criação de nova área persiste `id_condominio`.
- **`backend/src/avisos/avisos.module.ts`:**
  - `listarTodos` e `meus` filtram por `a.id_condominio = $1`.
  - `publicar` persiste e retorna `id_condominio`.
- **`backend/src/chamados/chamados.module.ts`:**
  - `estatisticas` e `listarTodos` filtram por `c.id_condominio = $1`.
  - `abrirChamado` persiste `id_condominio` e o retorna no payload.
- **`backend/src/cadastros/cadastros.module.ts`:**
  - `@Get('blocos')`, `@Post('blocos')`, `@Get('unidades')` e `@Get('pessoas')` filtram estritamente pelo condomínio ativo.
- **`backend/src/portaria/portaria.module.ts`:**
  - `encomendas`, `chaves`, `ocupacaoAgora`, `agenda` e `buscarPessoas` filtram por `id_condominio`.
- **`backend/src/relatorios/relatorios.module.ts`:**
  - Subconsultas do painel (reservas, encomendas, moradores ativos, chaves, unidades, evolução mensal e áreas mais usadas) filtram pelo condomínio.
- **`backend/src/reservas/reservas.module.ts`:**
  - Consulta `minhas` filtra por `a.id_condominio = $2`.

### 2.2. Frontend
- **`frontend/src/api.ts`:**
  - Atualizadas as funções `req<T>` e `upload<T>` para incluir automaticamente `'x-condominio-id': String(idCondominio)` lido de `sessaoAtual()?.condominio?.id_condominio`.

### 2.3. Banco de Dados
- **`banco/migracoes/20261107_dados_condominio_solar.sql`:**
  - Criado Bloco A e 4 unidades (101, 102, 201, 202) para o Condomínio 2.
  - Cadastrada Síndica/Moradora Mariana Santos (`mariana.santos@solar.com`, Apto 101).
  - Cadastradas 4 áreas específicas para o Solar: *Piscina Tropical*, *Espaço Gourmet Solar*, *Salão Nobre Solar*, *Quadra de Beach Tennis*.
  - Cadastrados horários de funcionamento, chaves e aviso inicial de boas-vindas.
  - Sincronizado com `banco/oasis_banco_completo.sql`.

---

## 3. Resultados dos Testes Automatizados

Foram executadas duas baterias de testes com 100% de sucesso:

### Bateria 1: Leitura e Isolamento Multicondomínio (`test_multicondominio_suite.js`)
- [x] Login Superadmin autenticado e lista de condomínios disponíveis retornada.
- [x] Áreas de Condomínio 1 retornam 6 espaços (Academia, Salão de Festas, etc.) e 0 do Solar.
- [x] Áreas de Condomínio 2 retornam 4 espaços (Piscina Tropical, Espaço Gourmet, etc.) e 0 do Oasis.
- [x] Avisos segregados (Mural do Oasis e Mural do Solar sem cruzamento).
- [x] Chamados segregados por condomínio.
- [x] Blocos e Unidades segregados (Bloco Oasis vs Bloco A).
- [x] Superadmin altera condomínio via `POST /auth/alternar-condominio/2` com nova sessão emitida.
- [x] Morador comum (Carlos Silva) recebe `403 Forbidden` ao tentar alternar de condomínio.
- [x] Tentativa de forjar `x-condominio-id` por usuário comum é bloqueada e mantida no condomínio dele.
- [x] Síndica do Solar (Mariana Santos) tem escopo restrito exclusivamente ao Solar.
- [x] Relatórios e Painel Administrativo totalmente isolados (76 unidades no Oasis vs 4 no Solar).

### Bateria 2: Operações de Escrita e Módulos (`test_multicondominio_writes.js`)
- [x] Criação de chamado no Condomínio 2 persiste `id_condominio = 2` e não vaza para Condomínio 1.
- [x] Criação de aviso no Condomínio 2 persiste `id_condominio = 2` e não vaza para Condomínio 1.
- [x] Encomendas na portaria isoladas por condomínio.
- [x] Desativação de módulo (`CHAMADOS_OCORRENCIAS`) no Condomínio 2 mantém módulo ativo no Condomínio 1.

---

## 4. Status Final
- Build do backend TypeScript: **0 erros**
- Build do frontend Vite / TypeScript: **0 erros**
- Containers Docker `oasis-backend`, `oasis-frontend` e `oasis-banco`: **Saudáveis e ativos**

