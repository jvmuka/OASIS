# Relatório de Alterações de Commit

## 1. Identificação
- **Branch**: `fix/banco-completo-desatualizado`
- **Autor**: `jvmuka`
- **Data**: 2026-09-23 (UTC-3)
- **Mensagem do Commit (sugerida)**: `fix: sincronizar oasis_banco_completo.sql com os scripts numerados do banco`

---

## 2. Objetivo
Corrigir a divergência entre `banco/oasis_banco_completo.sql` e os scripts numerados `banco/01` a `banco/04`. O script completo é o que o Docker executa na criação do banco (`docker-entrypoint-initdb.d/01_init.sql`). Por estar desatualizado, um banco recriado do zero (`docker compose down -v`) ficava sem colunas e valores de enum que o backend já utiliza, gerando os erros:

- `column ec.id_pessoa_solicitante does not exist` (SQLSTATE 42703)
- `column p.papel_controle does not exist` (SQLSTATE 42703)

---

## 3. Resumo das Alterações

### Camadas impactadas
- **Banco**: sim (`banco/04_gatilhos.sql`, `banco/oasis_banco_completo.sql`).
- **Backend**: não alterado.
- **Frontend**: não alterado.

### A. Regeneração do `oasis_banco_completo.sql`
- O arquivo foi regenerado pela concatenação de `01_banco_e_tipos.sql`, `02_tabelas.sql`, `03_indices_e_carga.sql` e `04_gatilhos.sql`, com uma linha em branco entre as partes e terminação de linha CRLF, como nos demais arquivos.
- O cabeçalho de 4 linhas do completo anterior foi mantido.
- Ficaram de fora as linhas `DROP DATABASE`, `CREATE DATABASE`, `COMMENT ON DATABASE` e `\c oasis` do arquivo 01. No Docker, o banco é criado pela variável `POSTGRES_DB` e o script de inicialização já roda conectado a ele.
- A coluna `uid_firebase` continua no script, porque o backend ainda a utiliza. A versão de `Documentos/diagramas/sql_consolidado/` não foi usada, já que ela remove essa coluna.

### B. Diferenças de estrutura incorporadas ao completo
```diff
-CREATE TYPE tipo_vinculo_enum AS ENUM ('PROPRIETARIO','INQUILINO','DEPENDENTE');
+CREATE TYPE tipo_vinculo_enum AS ENUM ('PROPRIETARIO','INQUILINO','DEPENDENTE','VISITANTE','PRESTADOR_SERVICO');

 CREATE TABLE pessoa (
     status_conta     VARCHAR(30)   NOT NULL DEFAULT 'ATIVO',
+    papel_controle   VARCHAR(50)   NOT NULL DEFAULT 'MORADOR',

 CREATE TABLE entrega_chave (
-    id_perfil_solicitante  INTEGER    NOT NULL,
+    id_perfil_solicitante  INTEGER,
+    id_pessoa_solicitante  INTEGER,
 ...
+    CONSTRAINT fk_ec_pessoa    FOREIGN KEY (id_pessoa_solicitante) REFERENCES pessoa (id_pessoa),
```
Afora essas mudanças, o completo só perdeu duas linhas em branco no final do arquivo.

### C. Carga inicial de avisos do mural levada para `04_gatilhos.sql`
- O completo anterior tinha um `INSERT` de 3 avisos de mural que não existia nos scripts numerados. Ele foi preservado no completo e também acrescentado ao final de `04_gatilhos.sql`, o que deixa os dois arquivos em sincronia.
- O bloco fica depois da criação dos gatilhos porque depende do gatilho da RN13 (distribuição automática dos avisos do mural para os perfis).

---

## 4. Arquivos Modificados e Novos
- `banco/04_gatilhos.sql`: acréscimo da carga inicial de 3 avisos do mural.
- `banco/oasis_banco_completo.sql`: regenerado a partir dos scripts numerados.
- `Documentos/relatorios_commits/commit_banco_completo_sincronizado_2026-09-23.md` (novo): este relatório.

---

## 5. Validação
1. Banco recriado do zero com `docker compose down -v && docker compose up -d --build`.
2. O script de inicialização rodou sem erros. A única mensagem nos logs foi o NOTICE esperado de `DROP TRIGGER IF EXISTS tg_bloqueio_perfil_cancela_reservas`, que aparece porque o gatilho ainda não existe num banco novo.
3. Contagens após a carga: `pessoa` = 6, `area_comum` = 5, `chave` = 3, `aviso` = 3 e `aviso_perfil` = 18. Esses 18 registros foram criados pela distribuição da RN13.
4. O enum `tipo_vinculo_enum` contém `VISITANTE` e `PRESTADOR_SERVICO`, e as colunas `pessoa.papel_controle`, `entrega_chave.id_perfil_solicitante` e `entrega_chave.id_pessoa_solicitante` existem.
5. Todas as rotas abaixo retornaram HTTP 200, acessadas com os usuários síndica, porteiro e morador:
   - `GET /api/areas`, `/api/areas/bloqueios`, `/api/areas/1`
   - `GET /api/portaria/chaves`, `/api/portaria/minhas-chaves`
   - `GET /api/cadastros/pessoas`, `/api/cadastros/pessoas/1/detalhes`
   - `GET /api/portaria/pessoas/busca`, `/api/portaria/pessoas/1/atividade`
6. Os logs do backend não têm nenhuma ocorrência de `42703` nem de `does not exist`.
7. Testes visuais no frontend confirmados pelo usuário.
