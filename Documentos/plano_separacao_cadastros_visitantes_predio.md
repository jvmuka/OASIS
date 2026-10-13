# Plano de Implementação: Separação de Cadastros (Usuários vs. Visitantes/Prestadores), Campos Opcionais e Vínculo com o Prédio

**Data:** 13/10/2026  
**Contexto:** OASIS - Sistema de Gestão de Condomínio e Portaria  
**Módulos Impactados:**
- Frontend: Módulo do Síndico / Administração (`/sindico/pessoas`) e Painel da Portaria (`/porteiro/portaria`)
- Backend: Módulo de Cadastros (`backend/src/cadastros/cadastros.module.ts`) e Conexão/Migrações do Banco (`backend/src/db/db.service.ts`)
- Banco de Dados: Tabelas `pessoa`, `pessoa_unidade`, `bloco` e `unidade` (`banco/02_tabelas.sql` e migração automática)

---

## 1. Diagnóstico e Objetivos

### 1.1 Cenário Atual
1. **Mistura de Cadastros:**
   - Na tela de Pessoas (`/sindico/pessoas`), existe um único botão *"Cadastrar Pessoa"* que abre um formulário genérico com uma grade com todos os papéis juntos: *Morador*, *Porteiro*, *Administrador*, *Visitante* e *Prestador de Serviço*.
   - Usuários do sistema (moradores, porteiros e administradores) necessitam de credenciais de acesso, e-mail de login, data de nascimento obrigatória e recebem código de ativação.
   - Pessoas de circulação temporária ou operacional (visitantes e prestadores de serviço) **não** utilizam o sistema web/mobile, sendo cadastradas exclusivamente para controle de entrada, rondas, crachás ou empréstimo de chaves.
   - Ter um fluxo unificado gera confusão operacional para a administração e para a portaria.

2. **Campos Obrigatórios Excessivos para Visitantes e Prestadores:**
   - A tabela `pessoa` impõe restrições `NOT NULL` nas colunas `data_nascimento` e `email`.
   - Como consequência, o backend gerava e-mails sintéticos arbitrários (`visitante_<cpf>@oasis.local`) e exigia a data de nascimento para qualquer pessoa.
   - Na portaria e na administração, isso cria uma barreira desnecessária, já que visitantes e prestadores muitas vezes apresentam apenas CPF/documento de identificação e número de telefone celular, sem informar e-mail ou data de nascimento imediata.

3. **Vínculo Restrito Exclusivamente a Apartamentos:**
   - A seleção de "Unidade Relacionada" permite vincular apenas apartamentos residenciais (ex.: Bloco A - Ap 51).
   - Prestadores de serviço de manutenção geral (técnicos de elevador, piscineiros, jardineiros, empresas de limpeza, portões automáticos, gerador, bombeiros civis) ou visitantes institucionais prestam serviços ao **Prédio / Condomínio** como um todo, e não a um morador específico.
   - Atualmente, ou eles ficam sem nenhuma unidade vinculada ou são atrelados incorretamente a um apartamento particular.

---

## 2. Requisitos e Solução Proposta

### Requisito 1: Separação Completa dos Cadastros
Separar o cadastro em dois fluxos bem delimitados tanto visualmente quanto logicamente:

1. **Fluxo A: Cadastro de Usuário do Sistema (Morador / Porteiro / Administrador)**
   - **Público-alvo:** Pessoas que interagem com o sistema OASIS.
   - **Papéis disponíveis:** Morador (Proprietário, Inquilino, Dependente), Porteiro, Administrador (Síndico) ou combinações válidas (ex.: Morador + Administrador).
   - **Campos obrigatórios:**
     - Nome Completo
     - CPF (11 dígitos)
     - Data de Nascimento (obrigatória)
     - E-mail de Login (obrigatório, único)
     - Celular (obrigatório)
     - Unidade vinculada (obrigatória caso o papel seja Morador)
   - **Resultado:** Cria registro de pessoa, gera perfis internos e emite o **código de primeiro acesso** para login.

2. **Fluxo B: Cadastro de Visitante e Prestador de Serviço**
   - **Público-alvo:** Pessoas externas e prestadores que frequentam o condomínio para controle de portaria e chaves.
   - **Papéis disponíveis:** Visitante ou Prestador de Serviço.
   - **Regra do Prestador:** Se Prestador de Serviço for selecionado, o campo *"Descrição do Tipo de Serviço / Especialidade"* é obrigatório (ex.: Eletricista, Encanador, Pintor, Técnico de Internet, etc.).
   - **Campos:**
     - Nome Completo (obrigatório)
     - CPF (obrigatório, 11 dígitos)
     - Celular (opcional)
     - **Data de Nascimento: OPCIONAL**
     - **E-mail: OPCIONAL**
     - **Unidade Relacionada:** Seleção flexível (Nenhuma, Apartamento específico ou Prédio/Condomínio).
   - **Resultado:** Conta criada imediatamente com status `ATIVO`, sem criação de perfil de login e sem emissão de código de primeiro acesso.

---

### Requisito 2: Data de Nascimento e E-mail Opcionais para Visitantes e Prestadores
1. **Banco de Dados (`pessoa`):**
   - Remover a restrição `NOT NULL` de `data_nascimento` e `email`.
   - Ajustar as restrições CHECK:
     ```sql
     ALTER TABLE pessoa ALTER COLUMN data_nascimento DROP NOT NULL;
     ALTER TABLE pessoa DROP CONSTRAINT IF EXISTS ck_pessoa_nascimento;
     ALTER TABLE pessoa ADD CONSTRAINT ck_pessoa_nascimento CHECK (data_nascimento IS NULL OR data_nascimento < CURRENT_DATE);

     ALTER TABLE pessoa ALTER COLUMN email DROP NOT NULL;
     ALTER TABLE pessoa DROP CONSTRAINT IF EXISTS ck_pessoa_email;
     ALTER TABLE pessoa ADD CONSTRAINT ck_pessoa_email CHECK (email IS NULL OR email LIKE '%_@_%._%');
     ```
   - No PostgreSQL, a chave única `pessoa_email_key` permite múltiplos valores `NULL`, de modo que emails nulos não colidem entre si, mas qualquer e-mail preenchido continua sendo estritamente único.

2. **Backend (`POST /cadastros/pessoas`):**
   - Para cadastros que contenham apenas `VISITANTE` ou `PRESTADOR_SERVICO`:
     - Se `email` não for informado ou for vazio: gravar `null` (eliminar a criação de e-mails fictícios `@oasis.local`). Se informado, validar formato e unicidade.
     - Se `data_nascimento` não for informada: gravar `null`. Se informada, validar se é data válida anterior à data atual.
   - Para cadastros com `MORADOR`, `PORTEIRO` ou `SINDICO`:
     - `email` e `data_nascimento` continuam rigorosamente obrigatórios.

3. **Frontend:**
   - Nos formulários de Visitante/Prestador (`Pessoas.tsx` e `Portaria.tsx`), os campos de Data de Nascimento e E-mail recebem o rótulo `(opcional)` e não bloqueiam o envio do formulário.

---

### Requisito 3: Opção de Vínculo com o "Prédio / Condomínio (Áreas Comuns)"
1. **Estrutura de Unidade Institucional:**
   - Criar e garantir no banco uma unidade representativa para o condomínio:
     - Bloco: `Prédio` (ou `Condomínio`)
     - Número da Unidade / Apartamento: `Geral` (ou `Áreas Comuns`)
   - Migração automática via SQL no `db.service.ts`:
     ```sql
     INSERT INTO bloco (nome, descricao)
     VALUES ('Prédio', 'Instalações Gerais e Áreas Comuns do Condomínio')
     ON CONFLICT (nome) DO NOTHING;

     INSERT INTO unidade (id_bloco, numero_apartamento, numero_vagas)
     SELECT b.id_bloco, 'Geral', 0
       FROM bloco b
      WHERE b.nome = 'Prédio'
        AND NOT EXISTS (
          SELECT 1 FROM unidade u WHERE u.id_bloco = b.id_bloco AND u.numero_apartamento = 'Geral'
        );
     ```
   - Ajustar a constraint de regras de dependente em `pessoa_unidade`:
     ```sql
     ALTER TABLE pessoa_unidade DROP CONSTRAINT IF EXISTS ck_pu_dependente_regra;
     ALTER TABLE pessoa_unidade ADD CONSTRAINT ck_pu_dependente_regra CHECK (
         (tipo_vinculo = 'DEPENDENTE' AND id_responsavel IS NOT NULL AND id_responsavel <> id_pessoa)
         OR
         (tipo_vinculo IN ('PROPRIETARIO', 'INQUILINO', 'VISITANTE', 'PRESTADOR_SERVICO') AND id_responsavel IS NULL)
     );
     ```

2. **Seleção na Interface:**
   - No campo *"Unidade Relacionada"*, o select apresentará as seguintes opções categorizadas:
     - `Nenhuma unidade vinculada` (opcional)
     - `🏢 Prédio / Condomínio (Áreas Comuns)` (vincula ao ID da unidade institucional)
     - `Bloco A - Apto 51`, `Bloco A - Apto 52`, ... (apartamentos residenciais)

3. **Apresentação Visual:**
   - Quando uma pessoa possuir vínculo com a unidade do Prédio, as tabelas, crachás e detalhes de perfil exibirão um badge destacado:
     - `🏢 Prédio / Áreas Comuns`
     - Evita exibir o texto genérico "Ap Geral".

---

## 3. Detalhamento Técnico das Modificações

### 3.1 Banco de Dados & Migração
- **Arquivo:** `backend/src/db/db.service.ts`
  - Inclusão das cláusulas DDL seguras no `onModuleInit()`:
    1. Alteração das colunas `data_nascimento` e `email` para nullable e atualização de suas constraints.
    2. Inserção idempotente do bloco `'Prédio'` e unidade `'Geral'`.
    3. Atualização da constraint `ck_pu_dependente_regra` para aceitar `VISITANTE` e `PRESTADOR_SERVICO`.
- **Arquivos SQL:**
  - `banco/02_tabelas.sql` e `banco/oasis_banco_completo.sql` devidamente sincronizados com as definições finais.

### 3.2 Backend NestJS
- **Arquivo:** `backend/src/cadastros/cadastros.module.ts`
  - No método `criarPessoa`:
    - Tratamento de `b.data_nascimento`: opcional se `ehApenasExterno`, obrigatório se interno.
    - Tratamento de `b.email`: opcional se `ehApenasExterno`, gravando `null` se não enviado; obrigatório se interno.
    - Suporte a `id_unidade` referenciando a unidade institucional do Prédio.
  - No método `atualizarPessoa`:
    - Respeitar a mesma flexibilidade para visitantes e prestadores ao editar cadastros.

### 3.3 Frontend
- **Arquivo:** `frontend/src/pages/sindico/Pessoas.tsx`
  - Na barra superior de ações (Header):
    - **Botão Primário:** `+ Cadastrar Usuário / Morador` (abre modal de moradores/funcionários com login).
    - **Botão Secundário:** `+ Cadastrar Visitante / Prestador` (abre modal dedicado de visitantes/prestadores).
  - No modal de Visitante/Prestador:
    - Alternância rápida entre Visitante e Prestador de Serviço.
    - Campo de tipo de serviço obrigatório para Prestadores.
    - Data de nascimento e E-mail marcados como opcionais.
    - Seletor de Unidade com a opção *"🏢 Prédio / Condomínio (Áreas Comuns)"*.
  - No modal de Edição:
    - Ajustar validações para que visitantes e prestadores possam ter e-mail e data de nascimento vazios.
  - Na Tabela e Card de Detalhes:
    - Renderizar o badge `🏢 Prédio / Áreas Comuns` quando vinculado ao condomínio.

- **Arquivo:** `frontend/src/pages/porteiro/Portaria.tsx`
  - No modal de cadastro da portaria (`modalVisitanteAberto`):
    - Tornar `data_nascimento` opcional (remover `required` e validação impeditiva).
    - Adicionar campo de `email` opcional.
    - Adicionar opção *"🏢 Prédio / Condomínio (Áreas Comuns)"* no select de Unidade Relacionada.

---

## 4. Plano de Validação e Testes

1. **Validação de Banco de Dados:**
   - Verificar se as colunas `email` e `data_nascimento` aceitam `NULL` sem violar constraints.
   - Verificar se múltiplos registros com `email = NULL` coexistem sem erro de unicidade.
   - Verificar se a unidade do Prédio foi inserida corretamente.

2. **Validação do Cadastro de Usuários (Morador/Porteiro/Admin):**
   - Tentar cadastrar morador sem e-mail ou data de nascimento $\rightarrow$ deve recusar com mensagem clara.
   - Cadastrar morador completo $\rightarrow$ deve salvar e gerar código de primeiro acesso normalmente.

3. **Validação do Cadastro de Visitantes e Prestadores:**
   - Cadastrar visitante sem e-mail e sem data de nascimento $\rightarrow$ deve salvar com sucesso.
   - Cadastrar prestador de serviço vinculado ao *"🏢 Prédio / Condomínio"* $\rightarrow$ deve salvar com sucesso e exibir o badge correto na lista.
   - Testar o cadastro de visitante através da Portaria (`/porteiro/portaria`) sem data de nascimento.

4. **Compilação e Docker:**
   - Executar `npm run build` no backend e no frontend.
   - Reiniciar os contêineres Docker e validar o funcionamento integrado.
