# Plano de Implementação: Regras de Segurança para Exclusão e Edição de Moradores (Administração)

**Data:** 09/10/2026  
**Contexto:** OASIS - Módulo do Síndico / Administrador (`/sindico/pessoas`)  
**Objetivo:** Implementar travas de segurança e integridade cadastral no painel de administração, impedindo a edição de dados sensíveis de moradores (Nome, CPF, Data de Nascimento e E-mail de Login) e bloqueando a exclusão definitiva de moradores ou pessoas que possuam qualquer histórico registrado no condomínio (reservas, encomendas, portaria, etc.), permitindo a exclusão exclusivamente para perfis criados por engano sem nenhum registro vinculado.

---

## 1. Diagnóstico do Cenário Atual

1. **Edição de Dados Sensíveis:**
   - Atualmente, no modal de edição (`modalEdicaoAberto` em `Pessoas.tsx`), um administrador pode alterar livremente o **Nome**, **CPF**, **Data de Nascimento** e **E-mail de Login** de qualquer morador cadastrado.
   - **Risco:** Falha de conformidade jurídica e segurança condominial (troca indevida de titularidade, alteração fraudulenta de CPF, perda de rastreabilidade de acessos e assinaturas de termos).

2. **Exclusão de Moradores e Pessoas:**
   - O backend já possui checagens que barram a exclusão no banco se houver chaves estrangeiras ativas ou registros de reservas/encomendas, mas na interface o botão "Excluir Definitivamente" é sempre exibido para todos os usuários (ativos ou inativos, com ou sem histórico).
   - O administrador tenta excluir, gerando um erro apenas após submeter a confirmação, gerando atrito e dúvidas sobre por que a opção está disponível se não deve ser permitida.
   - Não há distinção visual explícita entre:
     - **Perfil criado por engano** (recém-cadastrado, sem histórico de nada $\rightarrow$ exclusão permitida para correção rápida).
     - **Morador com histórico** (reservas, encomendas, chaves, portaria $\rightarrow$ exclusão bloqueada por segurança; ação permitida apenas de **Inativação**).

---

## 2. Requisitos e Regras de Negócio

### R1. Bloqueio de Edição de Dados Sensíveis de Moradores
- Para qualquer pessoa que possua o perfil de **Morador** (`MORADOR`):
  - Os seguintes campos cadastrais tornam-se **somente leitura / desabilitados** (`disabled` / `readOnly`):
    1. **Nome Completo**
    2. **CPF**
    3. **Data de Nascimento**
    4. **E-mail de Login**
  - **Interface:** 
    - Estilo visual de campo bloqueado (`cursor-not-allowed`, fundo suave, borda atenuada).
    - Ícone de cadeado (`🔒 Bloqueado por segurança`) ao lado dos rótulos dos campos.
    - Banner informativo no topo do modal de edição:
      > *"🛡️ Por questão de segurança e integridade cadastral, Nome, CPF, Data de Nascimento e E-mail de login de moradores não podem ser alterados após a criação. Para ajustar outros dados, edite o telefone, unidade ou permissões abaixo."*
  - **Campos que permanecem editáveis para Moradores:**
    - Telefone celular
    - Unidade vinculada (bloco / apartamento)
    - Tipo de vínculo (Proprietário, Inquilino, Dependente)
    - Responsável / Grau de parentesco
    - Reside no apartamento (Sim / Não)
  - **Backend (`PUT /cadastros/pessoas/:id`):**
    - Se a pessoa possuir perfil ativo de `MORADOR`, o backend preserva e não sobrescreve os valores originais de `nome`, `cpf`, `data_nascimento` e `email`, garantindo a proteção mesmo contra requisições diretas de API.

---

### R2. Regra de Segurança para Exclusão Definitiva
- **Critério de Elegibilidade para Exclusão:**
  Uma pessoa só pode ser excluída definitivamente se possuir **zero registros** no condomínio:
  - $\times$ Nenhuma reserva de área comum (como autor ou participante);
  - $\times$ Nenhuma encomenda registrada (como destinatário, recebedor ou entregador);
  - $\times$ Nenhum empréstimo de chaves na portaria (como solicitante, retirante ou recebedor);
  - $\times$ Nenhum comunicado/aviso publicado no mural;
  - $\times$ Nenhum dependente vinculado como titular responsável;
  - $\times$ Nenhuma penalidade ou bloqueio disciplinar ativo ou histórico.
  - $\times$ Não ser o próprio usuário logado nem o único administrador ativo do sistema.

- **Comportamento na Interface (`/sindico/pessoas`):**
  - O endpoint de listagem/detalhes fornece a flag `pode_excluir` (booleano) e o contador ou resumo de registros.
  - **Se `pode_excluir = false` (possui histórico):**
    - A opção "Excluir Definitivamente" é **bloqueada** no menu de ações, no modal de detalhes e no modal de edição.
    - A ação recomendada e destacada é **"Inativar Usuário"**, que revoga todos os acessos sem violar o histórico de auditoria.
    - É exibido aviso contextual: *"Exclusão não permitida: morador possui histórico no condomínio (reservas, encomendas ou portaria). Utilize a opção Inativar."*
  - **Se `pode_excluir = true` (perfil sem histórico criado por engano):**
    - A opção "Excluir Definitivamente" fica habilitada com alerta de confirmação:
      *"Este perfil não possui nenhuma movimentação registrada no condomínio e será removido definitivamente (correção de cadastro incorreto)."*

---

## 3. Arquitetura e Arquivos Impactados

| Camada | Arquivo | Alterações Previstas |
|---|---|---|
| **Backend** | `backend/src/cadastros/cadastros.module.ts` | 1. Em `GET /cadastros/pessoas`, calcular e retornar a flag `pode_excluir` e `total_registros_historico`.<br>2. Em `PUT /cadastros/pessoas/:id`, blindar os campos `nome`, `cpf`, `data_nascimento` e `email` quando o cadastro for de um morador.<br>3. Em `DELETE /cadastros/pessoas/:id`, garantir que a mensagem de recusa oriente expressamente o uso da Inativação por segurança. |
| **Frontend** | `frontend/src/pages/sindico/Pessoas.tsx` | 1. Atualizar o tipo `Pessoa` com `pode_excluir?: boolean`.<br>2. No Modal de Edição, desabilitar `nome`, `cpf`, `data_nascimento` e `email` se a pessoa for Morador, adicionando banner explicativo e ícones de cadeado.<br>3. No menu de ações da tabela, modal de perfil e modal de edição, bloquear a ação de exclusão para quem tiver histórico (`pode_excluir === false`), exibindo tooltip/aviso informativo e direcionando para Inativação. |
| **Deploy/Runtime** | Docker Compose | Executar `docker compose up -d --build` para validar a compilação e disponibilizar as mudanças no ambiente ativo. |

---

## 4. Plano de Execução Passo a Passo

### Passo 1: Backend (`cadastros.module.ts`)
1. **Adicionar cálculo de histórico no `GET /cadastros/pessoas`:**
   Adicionar no `SELECT` a contagem consolidada de histórico:
   - Reservas (`reserva`)
   - Encomendas (`encomenda`)
   - Chaves (`entrega_chave`)
   - Avisos publicados (`aviso`)
   - Dependentes subordinados (`pessoa_unidade.id_responsavel`)
   - Penalidades (`bloqueio_perfil` / `bloqueio_area`)
   - Retornar `pode_excluir: boolean` (verdadeiro apenas se a soma for 0 e não for o único admin).
2. **Blindar edição no `PUT /cadastros/pessoas/:id`:**
   Verificar se a pessoa possui perfil `MORADOR`. Em caso positivo, manter os valores atuais de `nome`, `cpf`, `data_nascimento` e `email`, impedindo alterações não autorizadas.
3. **Refinar `DELETE /cadastros/pessoas/:id`:**
   Garantir resposta amigável e consistente.

### Passo 2: Frontend (`Pessoas.tsx`)
1. **Tipagem:** Atualizar `type Pessoa` com `pode_excluir?: boolean; total_historico?: number`.
2. **Modal de Edição (`modalEdicaoAberto`):**
   - Identificar se o usuário editado é morador (`formEdicao.perfis.includes('MORADOR') || pessoaEditando.perfis.some(p => p.tipo === 'MORADOR')`).
   - Aplicar `disabled` / `readOnly` em Nome, CPF, Data de Nascimento e E-mail de Login.
   - Adicionar badge `🔒 Bloqueado por segurança` e banner informativo no início do formulário.
   - No rodapé do modal, ocultar ou desabilitar o botão "Excluir Usuário" se `pode_excluir === false`.
3. **Menu de Ações da Tabela e Modal de Detalhes:**
   - Desabilitar ou ocultar o botão "Excluir Definitivamente" para moradores com histórico, exibindo tooltip ou badge explicativo sobre a necessidade de usar "Inativar Usuário".
   - Permitir a exclusão apenas para cadastros com `pode_excluir === true`.

### Passo 3: Build, Testes e Docker
1. Compilar backend (`nest build`) e frontend (`vite build`).
2. Executar `docker compose up -d --build`.
3. Validar no navegador (`localhost:5173/sindico/pessoas`):
   - Edição de morador: campos bloqueados com banner explicativo.
   - Morador com histórico: exclusão bloqueada, apenas inativação permitida.
   - Morador criado por engano sem registros: exclusão permitida com sucesso.
