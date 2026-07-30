# Banco de dados — PostgreSQL 16

Scripts de criação do banco do OASIS. Execute **na ordem**:

| Ordem | Arquivo | O que faz |
|------|---------|-----------|
| 1 | `01_banco_e_tipos.sql` | Cria o banco `oasis` e os 15 tipos ENUM (domínios fechados) |
| 2 | `02_tabelas.sql` | Cria as 17 tabelas com PK, FK, UNIQUE, CHECK e DEFAULT |
| 3 | `03_indices_e_carga.sql` | Índices de apoio + carga inicial (blocos, pessoas, áreas, chaves) |
| 4 | `04_gatilhos.sql` | 10 gatilhos PL/pgSQL que implementam as regras RN01 a RN14 |

```bash
psql -U postgres -f 01_banco_e_tipos.sql
psql -U postgres -d oasis -f 02_tabelas.sql
psql -U postgres -d oasis -f 03_indices_e_carga.sql
psql -U postgres -d oasis -f 04_gatilhos.sql
```

> `oasis_banco_completo.sql` reúne os quatro em um só arquivo.
> O script 1 começa com `DROP DATABASE IF EXISTS oasis` — recria do zero.

As regras de negócio ficam **aqui**, não na aplicação: qualquer INSERT/UPDATE
que viole uma regra dispara `RAISE EXCEPTION 'RNxx: ...'`, e essa mensagem
sobe até a interface. Assim a integridade vale mesmo que os dados sejam
manipulados por fora da API.
