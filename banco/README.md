# Banco de Dados — PostgreSQL 16 (OASIS Multi-Condomínio)

Para o dicionário completo de tabelas, colunas, tipos, índices e diagrama Entidade-Relacionamento, consulte o [Manual Técnico e Dicionário de Dados do Banco de Dados](../Documentos/banco_de_dados/manual_banco_de_dados.md).

Os scripts de criação do banco do OASIS estão divididos em quatro partes modulares que devem ser executadas **na ordem**:

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `01_banco_e_tipos.sql` | Recria o banco `oasis` (`DROP DATABASE IF EXISTS`) e cria os 20 tipos ENUM (domínios fechados) |
| 2 | `02_tabelas.sql` | Cria as 21 tabelas com PK, FK, UNIQUE, CHECK, DEFAULT e suporte Multi-Tenancy (`condominio`) |
| 3 | `03_indices_e_carga.sql` | Índices de apoio e carga inicial (condomínio matriz OASIS, blocos, unidades, garagens, pessoas, perfis, áreas, horários, chaves e códigos) |
| 4 | `04_gatilhos.sql` | Gatilhos PL/pgSQL que implementam as regras de integridade e negócio (RN01 a RN17) e carga inicial dos avisos do mural |

### Execução via psql:

```bash
psql -U postgres -f 01_banco_e_tipos.sql
psql -U postgres -d oasis -f 02_tabelas.sql
psql -U postgres -d oasis -f 03_indices_e_carga.sql
psql -U postgres -d oasis -f 04_gatilhos.sql
```

### Script Consolidado (Docker):

`oasis_banco_completo.sql` reúne as quatro partes em um único arquivo, **sem** o `DROP/CREATE DATABASE` da parte 1: ele deve ser executado conectado a um banco `oasis` já existente e vazio. É esse o arquivo usado pelo Docker (`docker-compose.yml`), que cria o banco `oasis` e executa o script na primeira inicialização do volume via `/docker-entrypoint-initdb.d/`.

```bash
createdb -U postgres oasis
psql -U postgres -d oasis -f oasis_banco_completo.sql
```

> **Atenção:** Qualquer alteração de esquema ou de regra deve ser feita nos arquivos numerados **e** replicada em `oasis_banco_completo.sql` e no script de migração correspondente em `banco/migracoes/`.

---

## Regras de Negócio e Integridade no SGBD

As regras de negócio ficam centralizadas **no próprio banco**, não apenas na aplicação: qualquer `INSERT` ou `UPDATE` que viole uma regra dispara `RAISE EXCEPTION 'RNxx: ...'`, e essa mensagem é capturada pela API e repassada de forma amigável ao usuário. A integridade dos dados prevalece mesmo que operações sejam feitas diretamente no banco.

| ID | Regra | Tabela / Evento Disparador |
|---|---|---|
| **RN01** | Conflito de horário: a mesma unidade não pode ter reservas sobrepostas na área, e o número de unidades simultâneas é limitado | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN02** | Impedir reserva em área bloqueada por manutenção/obra | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN03** | Impedir reserva de morador com penalidade vigente | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN04** | Validar a capacidade de pessoas permitida no horário | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN05** | Validar a janela de funcionamento do dia da semana (`area_horario`) | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN06** | Impedir reserva no passado e validar antecedência mínima (horas/dias) e máxima | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN07** | Limitar reservas ativas por unidade no período (diário, semanal ou mensal) | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN08** | Controlar cancelamento: registrar data de cancelamento e exigir motivo | `reserva` (BEFORE UPDATE) |
| **RN09** | Controlar empréstimo de chave: validar disponibilidade e atualizar status | `entrega_chave` (BEFORE e AFTER INSERT) |
| **RN10** | Controlar devolução de chave: registrar recebedor e liberar status da chave | `entrega_chave` (BEFORE e AFTER UPDATE) |
| **RN11** | Avisar o morador da chegada de encomenda na portaria | `encomenda` (AFTER INSERT) |
| **RN12** | Controlar retirada de encomenda e identificar recebedor/terceiro | `encomenda` (BEFORE UPDATE) |
| **RN13** | Distribuir os avisos do mural automaticamente a todos os perfis ativos | `aviso` (AFTER INSERT) |
| **RN14** | Registrar a data e a hora exata da leitura individual do aviso | `aviso_perfil` (BEFORE UPDATE) |
| **RN15** | Validar vínculo de dependente com titular ativo da mesma unidade residencial | `pessoa_unidade` (BEFORE INSERT OR UPDATE) |
| **RN16** | Validar a idade mínima exigida pela área comum a partir da data de nascimento | `reserva` (BEFORE INSERT OR UPDATE) |
| **RN17** | Aplicar penalidade: cancelar automaticamente todas as reservas ativas futuras do morador | `bloqueio_perfil` (AFTER INSERT) |
