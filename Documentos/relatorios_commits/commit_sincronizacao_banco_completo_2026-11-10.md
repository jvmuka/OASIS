# Relatório de Commit: Correção de Máscaras em Colunas Fixas e Sincronização Completa dos Scripts SQL do Banco

**Data:** 10/11/2026  
**Branch:** `main`  
**Autor:** Antigravity AI  
**Mensagem do Commit (sugerida):** `fix(banco): corrigir mascaras e sincronizar oasis_banco_completo.sql e scripts numerados`

---

## 1. Contexto e Erro Corrigido (Tarefa 1)

O arquivo `banco/oasis_banco_completo.sql` é montado em `/docker-entrypoint-initdb.d/01_init.sql` pelo `docker-compose.yml` para inicializar o banco PostgreSQL 16 do zero, sem depender da pasta `banco/migracoes/` nem da migração automática do backend (`backend/src/db/db.service.ts`, método `onModuleInit`).

### 1.1. Erro Fatal na Inicialização (`CHAR(8)`)
Ao executar `banco/oasis_banco_completo.sql` em um PostgreSQL 16 vazio, a execução era interrompida no bloco final de carga do condomínio de demonstração ("Residencial Solar das Palmeiras") com o erro:

```text
ERROR: value too long for type character(8)
```

- **Causa:** o `INSERT INTO condominio` gravava o CEP com máscara `'80000-000'` (9 caracteres) na coluna `cep CHAR(8)`.
- **Correção:** alterado para `'80000000'` (8 dígitos numéricos, sem hífen) em `banco/oasis_banco_completo.sql`, `banco/04_gatilhos.sql` e `banco/migracoes/20261107_dados_condominio_solar.sql`.

### 1.2. Varredura de Outros Valores com Máscara em Colunas de Tamanho Fixo
Na varredura de todos os arquivos `.sql` de `banco/`, foi identificado também o telefone celular e o telefone de contato de emergência de **Mariana Santos** (`uid_firebase = 'solar_sindica_mariana'`) gravados com máscara `'(41) 99888-1122'` (15 caracteres) nas colunas `celular` e `telefone_contato_emergencia` da tabela `pessoa`, enquanto o padrão do schema é armazenar apenas dígitos (`'41998881122'`, 11 caracteres).
- **Correção:** alterado para `'41998881122'` em `banco/oasis_banco_completo.sql`, `banco/04_gatilhos.sql` e `banco/migracoes/20261107_dados_condominio_solar.sql`. O arquivo `banco/seed_simulacao_condominio_real.sql` foi mantido inalterado por não fazer parte da criação do banco do zero.

---

## 2. Diferenças Encontradas na Auditoria (Tarefa 2)

A comparação entre `banco/oasis_banco_completo.sql`, os scripts numerados (`01_banco_e_tipos.sql`, `02_tabelas.sql`, `03_indices_e_carga.sql`, `04_gatilhos.sql`), as migrações de `banco/migracoes/` e o método `onModuleInit` de `backend/src/db/db.service.ts` identificou as seguintes divergências, agrupadas por tabela/objeto:

1. **Tipos Enumerados (`TYPE ENUM`)**:
   - `categoria_chamado_enum` e `status_chamado_enum` estavam sendo criados com `DO $$ ... EXCEPTION WHEN duplicate_object $$` no meio da criação de tabelas do `oasis_banco_completo.sql`, em vez de estarem declarados na Parte 1 junto aos demais 18 tipos enumerados.
2. **Tabela `condominio` (Ordem de Criação e Carga Inicial)**:
   - `condominio` era criada no final da Parte 2 (após `bloco`, `area_comum`, `aviso`, `chave`, `codigo_primeiro_acesso`, `perfil` e `chamado`), o que impedia a declaração direta das chaves estrangeiras `REFERENCES condominio(id_condominio)` na criação dessas tabelas.
   - Faltava o `INSERT` explícito do Condomínio 1 (`id_condominio = 1`, `nome = 'Condomínio Residencial OASIS'`, `slug = 'oasis-central'`) no início da Parte 3 (antes da carga de `bloco`, `area_comum`, `aviso`, `chave`, `codigo_primeiro_acesso` e `perfil`, que usam `id_condominio = 1`).
3. **Tabelas `modulo_sistema` e `condominio_modulo`**:
   - Faltava a carga inicial dos 7 módulos funcionais em `modulo_sistema` (`RESERVAS_AREAS`, `AREAS_LIVRES`, `ENCOMENDAS_PACOTES`, `CONTROLE_CHAVES`, `MURAL_AVISOS`, `CHAMADOS_OCORRENCIAS`, `DEPENDENTES_FAMILIA`).
   - Faltava a ativação inicial dos 7 módulos em `condominio_modulo` para o Condomínio 1 e para o Condomínio 2 ("Residencial Solar das Palmeiras").
4. **Tabela `bloco`**:
   - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER NOT NULL DEFAULT 1`, `fk_bloco_condominio` e o índice `idx_bloco_condominio`.
   - Em ambos (`02_tabelas.sql` e `oasis_banco_completo.sql`), a restrição de unicidade era global (`CONSTRAINT uk_bloco_nome UNIQUE (nome)`) em vez de composta por condomínio (`CONSTRAINT uk_bloco_condominio_nome UNIQUE (id_condominio, nome)`).
5. **Tabela `unidade`**:
   - Faltava a coluna `andar INTEGER NOT NULL DEFAULT 1` e a restrição `CONSTRAINT ck_unidade_andar CHECK (andar >= 0)`.
   - No loop de carga inicial das 80 unidades do Condomínio 1 (`03_indices_e_carga.sql` e `oasis_banco_completo.sql`), faltava preencher explicitamente a coluna `andar` com o valor do andar (`f`).
6. **Tabela `vaga_garagem`**:
   - Faltava a coluna `metragem_m2 NUMERIC(6,2)` e a restrição `CONSTRAINT ck_vaga_metragem_positiva CHECK (metragem_m2 IS NULL OR metragem_m2 > 0)`.
7. **Tabela `pessoa`**:
   - Faltava o registro inicial do usuário SuperAdmin (`id_pessoa = 7`, `uid_firebase = 'superadmin_oasis_master'`, `email = 'superadmin@oasis.com'`, `papel_controle = 'SUPERADMIN'`). A coluna `uid_firebase` foi integralmente preservada.
8. **Tabela `perfil`**:
   - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER`, `fk_perfil_condominio` e `idx_perfil_condominio`.
   - Na carga inicial (`03_indices_e_carga.sql` e `oasis_banco_completo.sql`), os perfis 1 a 7 não informavam `id_condominio = 1` explicitamente e faltava o perfil 8 (`SUPERADMIN`, com `id_condominio = NULL`) vinculado à pessoa 7.
9. **Tabela `area_comum`**:
   - A coluna `descricao` estava definida como `VARCHAR(255)` em vez de `TEXT`.
   - A restrição de unicidade era global (`CONSTRAINT uk_area_nome UNIQUE (nome)`) em vez de composta por condomínio (`CONSTRAINT uk_area_condominio_nome UNIQUE (id_condominio, nome)`).
   - Em `02_tabelas.sql`, faltavam `id_condominio`, `fk_area_condominio` e `idx_area_condominio`.
10. **Tabela `reserva`**:
    - Faltava o índice `CREATE INDEX idx_reserva_unidade ON reserva (id_unidade);` na Parte 3 (`03_indices_e_carga.sql` e `oasis_banco_completo.sql`).
11. **Tabela `chave`**:
    - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER NOT NULL DEFAULT 1`, `fk_chave_condominio` e `idx_chave_condominio`.
12. **Tabela `aviso`**:
    - Faltavam as colunas `arquivado BOOLEAN NOT NULL DEFAULT FALSE` e `data_hora_arquivamento TIMESTAMP WITH TIME ZONE`.
    - Faltava o índice composto `CREATE INDEX idx_aviso_arquivado ON aviso (id_condominio, arquivado);`.
    - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER NOT NULL DEFAULT 1`, `fk_aviso_condominio` e `idx_aviso_condominio`.
13. **Tabela `codigo_primeiro_acesso`**:
    - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER NOT NULL DEFAULT 1`, `fk_cpa_condominio` e `idx_cpa_condominio` (as colunas `tipo`, `criado_em` e `usado_em` já estavam presentes).
14. **Tabelas `chamado` e `chamado_mensagem`**:
    - As chaves estrangeiras `fk_chamado_unidade`, `fk_chamado_pessoa`, `fk_chamado_perfil` (em `chamado`) e `fk_chamadomsg_pessoa`, `fk_chamadomsg_perfil` (em `chamado_mensagem`) estavam sem `ON DELETE RESTRICT` explícito, divergindo de `banco/migracoes/20261105_chamados_ocorrencias.sql`.
    - Em `02_tabelas.sql`, faltavam `id_condominio INTEGER NOT NULL DEFAULT 1`, `fk_chamado_condominio` e `idx_chamado_condominio`.

---

## 3. Alterações Realizadas por Arquivo

- **`banco/02_tabelas.sql`**:
  - Movida a criação da tabela `condominio` e de seus índices (`idx_condominio_slug`, `idx_condominio_ativo`) para o início do arquivo, antes de `bloco`.
  - Adicionados `id_condominio`, chaves estrangeiras para `condominio(id_condominio)` e índices de multi-tenancy em `bloco`, `perfil`, `area_comum`, `chave`, `aviso`, `codigo_primeiro_acesso` e `chamado`.
  - Substituídas `uk_bloco_nome` e `uk_area_nome` por `uk_bloco_condominio_nome UNIQUE (id_condominio, nome)` e `uk_area_condominio_nome UNIQUE (id_condominio, nome)`.
  - Adicionadas a coluna `andar INTEGER NOT NULL DEFAULT 1` e `ck_unidade_andar CHECK (andar >= 0)` em `unidade`.
  - Adicionadas a coluna `metragem_m2 NUMERIC(6,2)` e `ck_vaga_metragem_positiva CHECK (metragem_m2 IS NULL OR metragem_m2 > 0)` em `vaga_garagem`.
  - Alterado `area_comum.descricao` de `VARCHAR(255)` para `TEXT`.
  - Adicionadas as colunas `arquivado` e `data_hora_arquivamento` e o índice `idx_aviso_arquivado` em `aviso`.
  - Adicionado `ON DELETE RESTRICT` explícito nas FKs de `chamado` e `chamado_mensagem`.
- **`banco/03_indices_e_carga.sql`**:
  - Adicionado o índice `idx_reserva_unidade ON reserva (id_unidade)`.
  - Adicionada, no início da seção de dados iniciais (antes de `bloco`), a inserção do Condomínio 1 (`Condomínio Residencial OASIS`, `slug = 'oasis-central'`), dos 7 registros de `modulo_sistema` e da ativação dos 7 módulos em `condominio_modulo` para o Condomínio 1.
  - Atualizado o bloco `DO $$` de unidades para preencher a coluna `andar` com `f`.
  - Adicionada a pessoa 7 (`superadmin_oasis_master`, `superadmin@oasis.com`), o perfil 8 (`SUPERADMIN`, `id_condominio = NULL`) e o vínculo `id_condominio = 1` nos perfis 1 a 7.
- **`banco/04_gatilhos.sql`**:
  - Adicionado ao final do arquivo o bloco `DO $$` de criação e carga do Condomínio 2 ("Residencial Solar das Palmeiras") com CEP `'80000000'`, telefone `'41998881122'` para Mariana Santos e ativação dos 7 módulos em `condominio_modulo`.
- **`banco/oasis_banco_completo.sql`**:
  - Regenerado de forma totalmente sincronizada com `01_banco_e_tipos.sql` (todos os 20 ENUMs na Parte 1, sem `DROP/CREATE DATABASE` e `\c`), `02_tabelas.sql`, `03_indices_e_carga.sql` e `04_gatilhos.sql`.
- **`banco/migracoes/20261107_dados_condominio_solar.sql`**:
  - Corrigido o CEP do condomínio de `'80000-000'` para `'80000000'`.
  - Corrigidos o celular e o telefone de emergência de Mariana Santos de `'(41) 99888-1122'` para `'41998881122'`.
  - Adicionada a ativação dos 7 módulos em `condominio_modulo` para `v_id_condo_solar`.

---

## 4. Resultados das Verificações (Tarefa 3 e Teste Adicional)

1. **Recriação limpa dos contêineres e volumes (`docker compose down -v` e `docker compose up -d --build`)**:
   - Executado com sucesso; volume `oasis_pgdata` recriado do zero e imagens subidas com status `Healthy` (`oasis-banco`) e `Started` (`oasis-backend`, `oasis-frontend`).
2. **Log de inicialização do banco (`docker compose logs banco`)**:
   - O script `/docker-entrypoint-initdb.d/01_init.sql` (`banco/oasis_banco_completo.sql`) executou integralmente do início ao fim com **zero** linhas `ERROR`.
3. **Verificação via `psql` no banco `oasis`**:
   - Tabelas no schema `public`: **23 tabelas** (`total_tabelas = 23`).
   - Linhas na tabela `condominio`: **2 linhas** (`1 | Condomínio Residencial OASIS | oasis-central` e `2 | Residencial Solar das Palmeiras | solar-palmeiras | 80000000`).
   - Linhas na tabela `modulo_sistema`: **7 linhas** (`total_modulos = 7`) e 14 vínculos ativos em `condominio_modulo` (7 por condomínio).
4. **Log de inicialização do backend (`docker compose logs backend`)**:
   - O NestJS iniciou sem nenhum erro ou aviso de migração (`Nest application successfully started`, `OASIS API rodando em http://localhost:3000/api`).
5. **Teste de Login via API (`POST http://localhost:5173/api/auth/login`)**:
   - Autenticação com `carlos.silva@teste.com` e a senha de demonstração do `.env` (`Teste@2026`) retornou **HTTP 200 OK** com token JWT válido, dados do condomínio 1, os 7 módulos ativos, perfil `MORADOR` e unidade `Bloco A - Apto 51`.
6. **Teste Adicional de Equivalência dos Scripts Numerados (`teste_numerados`)**:
   - Criado o banco temporário `teste_numerados` dentro do contêiner `oasis-banco` e executados em sequência `01_banco_e_tipos.sql` (sem `DROP/CREATE DATABASE` e `\c`), `02_tabelas.sql`, `03_indices_e_carga.sql` e `04_gatilhos.sql` com `psql -v ON_ERROR_STOP=1`.
   - Todos os 4 scripts executaram sem nenhum erro.
   - Comparação estrutural e de carga entre `oasis` (criado por `oasis_banco_completo.sql`) e `teste_numerados` (criado pelos scripts `01` a `04`):

| Métrica | Banco `oasis` (`oasis_banco_completo.sql`) | Banco `teste_numerados` (`01` a `04`) |
| :--- | :---: | :---: |
| Tabelas (`BASE TABLE` em `public`) | 23 | 23 |
| Colunas (`information_schema.columns`) | 223 | 223 |
| Chaves Estrangeiras (`FOREIGN KEY`) | 47 | 47 |
| Gatilhos Distintos (`trigger_name`) | 12 (14 eventos) | 12 (14 eventos) |
| Condomínios (`condominio`) | 2 | 2 |
| Módulos do Sistema (`modulo_sistema`) | 7 | 7 |
| Módulos por Condomínio (`condominio_modulo`) | 14 | 14 |

   - O banco temporário `teste_numerados` foi removido (`DROP DATABASE teste_numerados;`) ao final da verificação.

