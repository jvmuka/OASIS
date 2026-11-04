# Relatório de Commit: Deploy em Produção na VPS Oracle Cloud, Domínio Próprio e Segregação de Ambientes

**Data:** 04/11/2026  
**Identificadores de Commit:** `b8f321c` e `362fc0f`  
**Mensagens:**
* `feat(deploy): preparacao para producao, modo demo por env, atalho superadmin e estudo multi-condominio`
* `fix(banco): incluir SUPERADMIN no enum tipo_perfil_enum em oasis_banco_completo.sql`

---

## 1. Resumo Executivo das Alterações

Este conjunto de alterações estabeleceu a infraestrutura de produção do OASIS no domínio **[https://oasiscondo.com.br](https://oasiscondo.com.br)**, parametrizou a separação limpa entre ambiente de desenvolvimento e ambiente de produção via variáveis de ambiente, garantiu o usuário Superadmin no banco de dados e adicionou a documentação técnica correspondente.

---

## 2. Camadas e Arquivos Impactados

### 2.1. Frontend (`frontend/`)
* **`src/pages/Login.tsx`**:
  * Adicionada a constante `modoDemo` baseada em `import.meta.env.VITE_MODO_DEMO` e `import.meta.env.DEV`.
  * Adicionado o botão de acesso rápido do **Superadmin** (`superadmin@oasis.com`), totalizando 4 perfis de teste rápido no ambiente local.
  * Condicionados os blocos de demonstração e botões de teste de código de primeiro acesso e recuperação para serem exibidos somente quando `modoDemo` for verdadeiro.
* **`src/vite-env.d.ts`**:
  * Criado arquivo de tipagem para estender a interface `ImportMetaEnv` do Vite, tipando `VITE_MODO_DEMO` e `VITE_API_URL`.
* **`Dockerfile`**:
  * Adicionado suporte a argumentos de compilação `ARG VITE_MODO_DEMO=false` e variável `ENV VITE_MODO_DEMO`.

### 2.2. Backend (`backend/`)
* **`src/auth/auth.service.ts`**:
  * `ehSenhaDev`: Restrito para ser ativo somente quando `NODE_ENV !== 'production'` e `DEV_SENHA` estiver definido.
  * `solicitarCodigoRecuperacao`: O campo `codigo_dev` não é mais retornado em payloads JSON no ambiente de produção.
* **`src/db/db.service.ts`**:
  * Inserida rotina no `onModuleInit` para garantir que o usuário `superadmin@oasis.com` exista com o perfil `SUPERADMIN` ativo.

### 2.3. Banco de Dados (`banco/`)
* **`oasis_banco_completo.sql`**:
  * Corrigido o enumerado `tipo_perfil_enum` para incluir o valor `'SUPERADMIN'`.
  * Adicionada a carga inicial do Super Administrador mestre (`superadmin@oasis.com`) com perfil associado.

### 2.4. Infraestrutura e Docker
* **`docker-compose.yml`**:
  * Configurados os argumentos de build para `frontend` (`VITE_MODO_DEMO`) e variáveis de ambiente para `backend` (`NODE_ENV`).
* **`.env.exemplo` e `.env`**:
  * Documentada a flag `VITE_MODO_DEMO` e diretrizes para ambientes local e servidor.

### 2.5. Documentação (`Documentos/`)
* **`infraestrutura/guia_vps_producao_oracle.md`**: Guia técnico completo da VPS, Nginx, Certbot e procedimentos de operação.
* **`planos_executados/plano_deploy_vps_producao_e_ambiente_demo.md`**: Registro formal do plano de deploy concluído.
* **`planos_pendentes/estudo_arquitetura_multicondominio.md`**: Estudo aprofundado comparando as 4 estratégias de multi-tenancy.
* **`README.md`**: Atualizado com os novos artefatos e status de produção.

---

## 3. Validação Executada

* [x] Compilação do Frontend via `npm run build` (TypeScript e Vite): 0 erros.
* [x] Compilação do Backend via `npm run build` (NestJS): 0 erros.
* [x] Teste de subida dos contêineres Docker na VPS Oracle: todos com status `Up (healthy)`.
* [x] Certificado SSL/TLS emitido com sucesso pelo Certbot para `oasiscondo.com.br` e `www.oasiscondo.com.br`.
* [x] Validação da tela de login em produção: atalhos ocultos e acesso via `superadmin@oasis.com`.

