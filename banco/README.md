# Banco de dados — PostgreSQL 16

Scripts de criação do banco do OASIS, divididos em quatro partes que devem ser executadas **na ordem**:

| Ordem | Arquivo | O que faz |
|------|---------|-----------|
| 1 | `01_banco_e_tipos.sql` | Recria o banco `oasis` (`DROP DATABASE IF EXISTS`) e cria os 18 tipos ENUM (domínios fechados) |
| 2 | `02_tabelas.sql` | Cria as 18 tabelas com PK, FK, UNIQUE, CHECK e DEFAULT |
| 3 | `03_indices_e_carga.sql` | Índices de apoio e carga inicial (bloco, unidades, pessoas, perfis, áreas, horários, chaves e códigos de primeiro acesso) |
| 4 | `04_gatilhos.sql` | 12 gatilhos PL/pgSQL que implementam as regras RN01 a RN17 e a carga inicial dos avisos do mural |

```bash
psql -U postgres -f 01_banco_e_tipos.sql
psql -U postgres -d oasis -f 02_tabelas.sql
psql -U postgres -d oasis -f 03_indices_e_carga.sql
psql -U postgres -d oasis -f 04_gatilhos.sql
```

`oasis_banco_completo.sql` reúne as quatro partes em um único arquivo, **sem** o `DROP/CREATE DATABASE` da parte 1: ele deve ser executado conectado a um banco `oasis` já existente e vazio. É esse o arquivo usado pelo Docker, que cria o banco `oasis` e executa o script na primeira inicialização do volume.

```bash
createdb -U postgres oasis
psql -U postgres -d oasis -f oasis_banco_completo.sql
```

Qualquer alteração de esquema ou de regra deve ser feita nos arquivos numerados **e** replicada em `oasis_banco_completo.sql`.

## Regras de negócio

As regras de negócio ficam **aqui**, não na aplicação: qualquer INSERT/UPDATE que viole uma regra dispara `RAISE EXCEPTION 'RNxx: ...'`, e essa mensagem sobe até a interface. Assim a integridade vale mesmo que os dados sejam manipulados por fora da API. A numeração segue o Quadro 42 do documento do projeto.

| ID | Regra | Tabela / evento |
|----|-------|-----------------|
| RN01 | Conflito de horário: a mesma unidade não pode ter reservas sobrepostas na área, e o número de unidades simultâneas é limitado | `reserva` (BEFORE INSERT OR UPDATE) |
| RN02 | Impedir reserva em área bloqueada | `reserva` |
| RN03 | Impedir reserva de morador com penalidade vigente | `reserva` |
| RN04 | Validar a capacidade de pessoas no horário | `reserva` |
| RN05 | Validar a janela de funcionamento do dia da semana | `reserva` |
| RN06 | Impedir reserva no passado e validar antecedência mínima (o maior valor entre horas e dias configurados) e máxima | `reserva` |
| RN07 | Limitar reservas por unidade no período (diário, semanal ou mensal) | `reserva` |
| RN08 | Controlar cancelamento: prazo, reserva concluída e registro da data | `reserva` (BEFORE UPDATE) |
| RN09 | Controlar empréstimo de chave | `entrega_chave` (BEFORE e AFTER INSERT) |
| RN10 | Controlar devolução de chave | `entrega_chave` (BEFORE e AFTER UPDATE) |
| RN11 | Avisar o morador da chegada de encomenda | `encomenda` (AFTER INSERT) |
| RN12 | Controlar retirada de encomenda | `encomenda` (BEFORE UPDATE) |
| RN13 | Distribuir os avisos do mural aos perfis ativos | `aviso` (AFTER INSERT) |
| RN14 | Registrar a data e a hora de leitura do aviso | `aviso_perfil` (BEFORE UPDATE) |
| RN15 | Validar vínculo de dependente com titular ativo da mesma unidade | `pessoa_unidade` (BEFORE INSERT OR UPDATE) |
| RN16 | Validar a idade mínima exigida pela área | `reserva` (BEFORE INSERT OR UPDATE) |
| RN17 | Aplicar penalidade: cancelar as reservas ativas atingidas | `bloqueio_perfil` (AFTER INSERT) |
