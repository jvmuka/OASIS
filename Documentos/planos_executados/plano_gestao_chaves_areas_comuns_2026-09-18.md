# Plano de Implementação: Controle e Gestão de Chaves de Áreas Comuns (Síndico & Portaria)

Este plano descreve as alterações para corrigir e aprimorar o fluxo de controle de chaves das áreas comuns no OASIS, permitindo configurar no cadastro e edição de áreas se o espaço exige chave física, disponibilizando automaticamente as chaves para a portaria e concedendo ao síndico/administrador visibilidade total e permissão para gerenciar os empréstimos e devoluções.

---

## 1. Visão Geral do Problema e Solução

### Problema Atual:
1. **Cadastro e Edição Incompletos**: No formulário de cadastro e edição de áreas comuns (`/sindico/areas`), não existe campo para o síndico definir se a área necessita de chave física (`exige_chave`). Além disso, o endpoint `PUT /areas/:id` não atualizava o campo `exige_chave` no banco.
2. **Desconexão com o Claviculário**: Ao cadastrar uma área que necessitava de chave, nenhum registro correspondente era gerado na tabela `chave`, fazendo com que a área nunca aparecesse no quadro de chaves da portaria.
3. **Restrição Indevida ao Síndico**: 
   - A tela `/portaria/chaves` estava protegida apenas para o perfil `PORTEIRO` no frontend (`App.tsx`) e não constava no menu do Síndico (`Layout.tsx`).
   - Os endpoints de empréstimo (`POST /portaria/chaves/:id/emprestimo`) e devolução (`PATCH /portaria/chaves/emprestimos/:id/devolucao`) exigiam estritamente `@Perfis('PORTEIRO')`. Se o síndico tentasse operar chaves, recebia erro `403 Forbidden` (`Usuario sem o perfil necessario`).

### Solução Proposta:
1. **Configuração de Chave no Cadastro e Edição (`Areas.tsx` e `areas.module.ts`)**:
   - Adicionar opção clara no formulário: **"Controle de Chaves: Este espaço necessita de chave física?"** (Sim / Não).
   - Se marcado como **Sim**:
     - Campo opcional para personalizar o código da chave (ex.: `CH-SALAO-01`). Se não informado, o sistema gera automaticamente uma sigla padronizada com base no nome do espaço (ex.: `CH-FESTAS-01`).
     - O backend garante a criação do registro na tabela `chave` vinculado à área.
   - Se desmarcado para **Não**:
     - Validação de segurança: impede desmarcar caso a chave esteja atualmente emprestada com algum morador (exige devolução prévia).
     - Remove ou oculta a chave do claviculário ativo.
2. **Quadro de Chaves da Portaria (`portaria.module.ts` e `Chaves.tsx`)**:
   - A listagem de chaves da portaria exibirá todas as áreas ativas onde `exige_chave = true`.
   - Exibição enriquecida do morador responsável pelo empréstimo: nome, bloco, apartamento e telefone de contato.
3. **Gestão Completa pelo Síndico/Administrador**:
   - Rota `/portaria/chaves` liberada para `['PORTEIRO', 'SINDICO']`.
   - Item **"Controle de Chaves"** adicionado ao menu de Administração no `Layout.tsx`.
   - Endpoints de empréstimo e devolução ajustados no backend para aceitar tanto `PORTEIRO` quanto `SINDICO`.
   - Na tela de Áreas Comuns (`/sindico/areas`), o síndico visualiza na própria listagem das áreas se o espaço exige chave e seu status atual em tempo real (*"Chave Disponível"* ou *"Emprestada para: Carlos Silva - Apto 101"*).

---

## 2. Regras de Negócio e Validações

- **Criação Automática de Chave:** Quando o síndico cadastrar ou editar uma área marcando que ela necessita de chave física, o sistema criará automaticamente a chave principal (ex.: `CH-FESTAS-01`) caso ainda não exista nenhuma chave cadastrada para aquele espaço.
- **Vias Adicionais:** Caso o condomínio possua mais de uma via ou cópia da mesma chave (ex.: `CH-SALAO-01` e `CH-SALAO-02`), o síndico também poderá cadastrar vias adicionais.
- **Trava de Segurança:** Se uma área comum tiver uma chave atualmente emprestada para um morador, o síndico não poderá alterar a opção para "Não necessita de chave" antes que a chave seja devolvida no sistema.

---

## 3. Detalhamento Técnico das Alterações

### Backend (NestJS & PostgreSQL)
- **`backend/src/areas/areas.module.ts`**:
  - `GET /areas`: agrega as chaves de cada área com status e dados do responsável atual.
  - `POST /areas`: persiste `exige_chave` e gera a chave inicial se marcado como verdadeiro.
  - `PUT /areas/:id`: atualiza `exige_chave`, cria a chave caso ainda não exista ou valida se há chave emprestada antes de desmarcar.
- **`backend/src/portaria/portaria.module.ts`**:
  - `GET /portaria/chaves`: filtra apenas áreas com `exige_chave = true` e inclui unidade/apartamento do morador.
  - `POST /portaria/chaves/:id/emprestimo`: liberado para `@Perfis('PORTEIRO', 'SINDICO')`.
  - `PATCH /portaria/chaves/emprestimos/:id/devolucao`: liberado para `@Perfis('PORTEIRO', 'SINDICO')`.
  - `POST /portaria/chaves` e `DELETE /portaria/chaves/:id`: endpoints para o síndico adicionar ou remover cópias extras.

### Frontend (React & TypeScript)
- **`frontend/src/pages/sindico/Areas.tsx`**:
  - Exibe se o espaço requer chave e com quem está na listagem de áreas.
  - Opção no Modal de Criação e no Modal de Edição para marcar `Necessita de Chave Física?`.
- **`frontend/src/pages/porteiro/Chaves.tsx`**:
  - Exibe os dados completos do morador (Nome, Apto, Bloco, Telefone).
  - Permite tanto ao porteiro quanto ao síndico realizar o empréstimo e a devolução.
  - Filtros rápidos (*Todas*, *Disponíveis*, *Emprestadas*).
- **`frontend/src/components/Layout.tsx`**:
  - Adiciona o link "Controle de Chaves" no menu de Administração para o Síndico.
- **`frontend/src/App.tsx`**:
  - Permite acesso à rota `/portaria/chaves` para os perfis `['PORTEIRO', 'SINDICO']`.
