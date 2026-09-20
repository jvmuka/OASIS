# Plano de Implementação: Edição e Exclusão de Chaves de Áreas Comuns (Síndico/Admin)
**Data:** 20/09/2026  
**Status:** Proposto  
**Branch:** `correcoes-e-melhorias-gerais`

Permitir que o **Síndico / Administrador** edite o código/nome e observações das chaves físicas e realize a exclusão de chaves (tanto no modal de edição da área comum quanto no claviculário digital), mantendo o **Porteiro** com permissão exclusiva para realizar empréstimos e devoluções.

---

## 1. Diagnóstico do Problema Atual

1. **Falta de interface de edição e exclusão no modal de área comum (`Areas.tsx`)**:
   - Conforme a captura de tela enviada pelo usuário, a seção *CHAVES REGISTRADAS* em "Editar — Salão Pizza" exibe as chaves apenas como texto estático (`CH-CHURRAS-01`, `CH-CHURRAS-02`) sem botões de ação para editar ou excluir.
2. **Falta de botões de edição e exclusão no claviculário (`Chaves.tsx`)**:
   - No claviculário `/portaria/chaves`, o síndico podia apenas criar uma nova chave e ver o status, sem opção de renomear ou excluir chaves existentes.
3. **Falta de endpoint de edição e bloqueio rígido de exclusão no backend (`portaria.module.ts`)**:
   - Não havia endpoint `PUT/PATCH /portaria/chaves/:id` para atualizar o código ou observação de uma chave.
   - O endpoint `DELETE /portaria/chaves/:id` impedia a exclusão de qualquer chave que tivesse qualquer registro em `entrega_chave`, impedindo o síndico de excluir chaves que já haviam sido devolvidas.

---

## 2. Mudanças Propostas

### Backend (NestJS & PostgreSQL)

#### `backend/src/portaria/portaria.module.ts`
- **Novo endpoint `PUT /portaria/chaves/:id` (`@Perfis('SINDICO')`)**:
  - Permite alterar o código da chave (`codigo`) e a observação (`observacao`).
  - Valida se o código não está vazio e se não conflita com outra chave existente.
- **Aprimoramento do `DELETE /portaria/chaves/:id` (`@Perfis('SINDICO')`)**:
  - Verifica se a chave está com `status = 'EMPRESTADA'`. Se estiver emprestada com morador, bloqueia com mensagem amigável: *"A chave está emprestada no momento e não pode ser excluída. Registre a devolução antes."*
  - Se a chave estiver `DISPONIVEL`, remove eventuais históricos antigos de empréstimo devolvidos em `entrega_chave` e exclui a chave com sucesso.
- **Constraint no banco de dados (`02_tabelas.sql`)**:
  - Garantir `ON DELETE CASCADE` na foreign key `fk_ec_chave` entre `entrega_chave` e `chave`.

---

### Frontend (React & Tailwind CSS)

#### `frontend/src/pages/sindico/Areas.tsx`
- No modal de edição de área comum (`Editar — {nome}`):
  - Na lista de **Chaves Registradas**:
    - Cada chave exibirá botões de ação:
      - ✏️ **Editar Chave**: Abre modal/caixa para alterar o código da chave (ex.: renomear `CH-CHURRAS-01` para `CH-PIZZA-01`) e observações.
      - 🗑️ **Excluir Chave**: Abre modal de confirmação para exclusão da chave (desabilitado se a chave estiver emprestada).
    - Botão **+ Adicionar Chave / Via**: Permite ao síndico cadastrar uma nova via/cópia da chave diretamente dentro da edição da área, sem precisar sair da página.
  - Atualização em tempo real: ao editar, adicionar ou excluir uma chave, os dados da área são recarregados imediatamente.

#### `frontend/src/pages/porteiro/Chaves.tsx`
- No claviculário digital `/portaria/chaves`:
  - Se o usuário for **Síndico** (`ehSindico === true`):
    - Exibir botão de **Editar** (ícone lápis) no card de cada chave para alterar código e observação.
    - Exibir botão de **Excluir** (ícone lixeira) no card de cada chave disponível com modal de confirmação.
  - Se o usuário for **Porteiro** (`ehSindico === false`):
    - **Ocultar completamente** botões de edição, exclusão e criação de novas chaves.
    - O porteiro permanece com acesso estritamente operacional para **Emprestar** e **Devolver** chaves aos moradores.

---

## 3. Plano de Verificação

### Testes Automatizados
- Executar script de teste automatizado ponta a ponta:
  1. Login como Síndico e Porteiro.
  2. Criar chave para uma área.
  3. Editar o código da chave (ex.: `CH-CHURRAS-01` -> `CH-PIZZA-01`) via Síndico -> verificar sucesso.
  4. Tentar editar a chave com usuário Porteiro -> verificar bloqueio `403 Forbidden`.
  5. Tentar excluir chave emprestada -> verificar erro `400 Bad Request` informativo.
  6. Devolver chave e excluir via Síndico -> verificar sucesso.
  7. Tentar excluir chave com usuário Porteiro -> verificar bloqueio `403 Forbidden`.

### Verificação Manual
- Acessar `http://localhost:5173` como Síndico:
  - Ir em *Áreas Comuns* -> *Editar Salão Pizza* -> renomear `CH-CHURRAS-01` para `CH-PIZZA-01`.
  - Excluir uma chave e adicionar uma nova cópia.
  - Ir em *Controle de Chaves* e verificar botões de edição/exclusão.
- Acessar como Porteiro:
  - Verificar que o porteiro não vê botões de edição/exclusão, apenas empréstimo e devolução.
