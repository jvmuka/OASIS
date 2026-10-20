# Estudo Arquitetural: Suporte a Múltiplos Condomínios (Multi-Tenancy) no OASIS

**Data:** 15/10/2026  
**Contexto:** Preparação da arquitetura do OASIS para implantação em servidor de produção (Cloud/VPS) com capacidade para gerenciar múltiplos condomínios simultâneos.  
**Objetivo:** Apresentar a análise técnica, prós e contras, modelagem de banco de dados, estratégias de segurança e o roteiro de migração para que o sistema atenda diversos condomínios em uma única instalação, eliminando a necessidade de duplicação de código ou de servidores.

---

## 1. O Problema da Duplicação de Código / Instâncias

Quando um sistema de gestão condominial passa a atender mais de um condomínio, a tentação inicial pode ser clonar o repositório ou subir um novo container/servidor para cada condomínio contratante (ex: `oasis-condo-solar`, `oasis-condo-jardins`).

### Por que a duplicação NÃO é recomendada:
1. **Sobrecarga de Manutenção (Débito Técnico):** Qualquer correção de bug, atualização de segurança ou nova funcionalidade precisa ser aplicada, testada e comitada $N$ vezes em repositórios ou branches separados.
2. **Custo Exponencial de Infraestrutura:** Cada instância exigiria processos Node.js separados, instâncias Postgres separadas, certificados SSL independentes e monitoramento individual. Com 20 condomínios, os custos de servidor seriam multiplicados por 20.
3. **Impossibilidade de Visão Global (SaaS):** O dono da plataforma não consegue ter um painel administrativo único para visualizar métricas globais, faturamento, total de moradores na plataforma ou logs unificados.

---

## 2. Modelos de Arquitetura Multi-Tenant para o OASIS

No ecossistema de software em nuvem (SaaS), existem três modelos consagrados para múltiplos clientes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MODELOS DE MULTI-TENANCY                              │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│ Modelo 1 (Recomendado)│ Modelo 2                    │ Modelo 3              │
│ Banco Compartilhado   │ Esquema Compartilhado       │ Banco Separado        │
│ (Row-Level Tenancy)   │ (Schema-per-Tenant)         │ (Database-per-Tenant) │
├───────────────────────┼─────────────────────────────┼───────────────────────┤
│ • 1 Banco de Dados    │ • 1 Banco de Dados          │ • N Bancos de Dados   │
│ • Todas as tabelas têm│ • 1 Schema Postgres por     │ • 1 Banco isolado por │
│   coluna id_condominio│   condomínio (search_path)  │   condomínio          │
│ • Menor custo         │ • Isolamento intermediário  │ • Maior isolamento    │
│ • Manutenção unificada│ • Migrações complexas       │ • Maior custo/DevOps  │
└───────────────────────┴─────────────────────────────┴───────────────────────┘
```

### Análise Comparativa Detalhada:

| Critério | Modelo 1: Linha (`id_condominio`) ⭐ | Modelo 2: Schema (`condo_x`) | Modelo 3: Banco Isolado |
| :--- | :--- | :--- | :--- |
| **Custo de Hospedagem** | **Mínimo** (roda em 1 VPS básica de $10-20/mês) | Baixo / Médio | Alto (exige clusters ou banco gigante) |
| **Facilidade de Migrações (DDL)** | **Instantânea** (1 comando atualiza todos) | Lenta (precisa rodar em cada schema) | Muito Lenta (rodar em cada banco) |
| **Complexidade no Backend** | Baixa a Média (filtros automáticos) | Alta (troca dinâmica de conexões) | Alta (pool de conexões dinâmico) |
| **Backup de um Condomínio Específico** | Via script de exportação (`SELECT WHERE`) | Via `pg_dump -n schema_nome` | Nativo (`pg_dump db_nome`) |
| **Escalabilidade Inicial (1 a 200 condomínios)** | **Excelente** | Razoável (degrada acima de 100 schemas)| Pesada |

### Conclusão e Recomendação para o OASIS:
O **Modelo 1 (Banco Compartilhado com Row-Level Tenancy via `id_condominio`)** é a arquitetura padrão adotada pelos maiores sistemas de gestão condominial do mercado (ex: TownSq, Superlógica, Winker). 
Ele permite subir **uma única aplicação no servidor**, pagar uma única hospedagem, e receber centenas de condomínios com total flexibilidade e controle.

---

## 3. Como o Modelo 1 se Aplica ao OASIS

### 3.1. Nova Tabela Central: `condominio`

```sql
CREATE TABLE condominio (
    id_condominio       SERIAL          PRIMARY KEY,
    nome                VARCHAR(120)    NOT NULL,
    cnpj                CHAR(14)        UNIQUE,
    slug                VARCHAR(50)     NOT NULL UNIQUE, -- ex: 'oasis-central', 'residencial-bosque'
    endereco_completo   VARCHAR(255),
    cidade              VARCHAR(80)     NOT NULL DEFAULT 'Ponta Grossa',
    uf                  CHAR(2)         NOT NULL DEFAULT 'PR',
    cep                 CHAR(8),
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    data_cadastro       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    plano               VARCHAR(30)     NOT NULL DEFAULT 'PADRAO'
);
```

### 3.2. Associação das Tabelas Existentes

As tabelas do OASIS são divididas em 3 grupos estruturais:

#### Grupo A: Tabelas Raiz do Condomínio (Recebem `id_condominio`)
Estas tabelas definem o perímetro do condomínio:
- `bloco`: Adiciona `id_condominio INTEGER NOT NULL REFERENCES condominio(id_condominio)`
- `area_comum`: Adiciona `id_condominio INTEGER NOT NULL REFERENCES condominio(id_condominio)`
- `aviso`: Adiciona `id_condominio INTEGER NOT NULL REFERENCES condominio(id_condominio)`
- `codigo_acesso`: Adiciona `id_condominio INTEGER NOT NULL REFERENCES condominio(id_condominio)`

#### Grupo B: Tabelas Filhas (Herança Natural via Relacionamento)
Estas tabelas **não precisam** obrigatoriamente de `id_condominio` direto, pois já pertencem a entidades que possuem o ID:
- `unidade` $\rightarrow$ pertence a `bloco` (que já tem `id_condominio`).
- `vaga_garagem` $\rightarrow$ pertence a `unidade` $\rightarrow$ `bloco`.
- `reserva` $\rightarrow$ pertence a `area_comum` $\rightarrow$ `condominio`.
- `encomenda` $\rightarrow$ pertence a `unidade` $\rightarrow$ `bloco`.
- `item_reserva`, `historico_reserva`, `bloqueio_area` $\rightarrow$ vinculados à área comum.

*(Opcional de performance: Adicionar `id_condominio` desnormalizado em `reserva` e `encomenda` para acelerar queries da portaria).*

#### Grupo C: Pessoas e Usuários (Como tratar moradores e síndicos?)
Existem dois cenários importantes no mundo real:
1. **Um morador mora no Condomínio A e não tem nada a ver com o Condomínio B.**
2. **Um Síndico Profissional administra o Condomínio A e o Condomínio B.**
3. **Um proprietário tem 1 apartamento no Condomínio A e 1 apartamento no Condomínio B.**

Para suportar isso com elegância:
- A tabela `pessoa` representa o **indivíduo** (CPF, Nome, E-mail, Senha, Login).
- A tabela `pessoa_unidade` ou uma tabela associativa `pessoa_condominio` define **em qual condomínio e com qual papel** aquela pessoa atua.
- No momento do login, se a pessoa tiver vínculo com apenas 1 condomínio, ela entra direto. Se tiver vínculo com mais de um (ex: Síndico de 2 condomínios), o sistema exibe uma tela inicial simples: *"Qual condomínio você deseja gerenciar agora?"*.

---

## 4. Como Garantir que um Condomínio Nunca Veja Dados de Outro (Segurança no Backend)

No backend NestJS, a garantia de isolamento de dados é feita em camadas:

```
Requisição HTTP (com Bearer Token)
         │
         ▼
[ JwtAuthGuard ] ──> Extrai payload: { id_pessoa, id_condominio, perfis }
         │
         ▼
[ CondominioContextInterceptor ] ──> Injeta id_condominio na requisição (req.condominioId)
         │
         ▼
[ Service / Controller SQL ] ──> WHERE id_condominio = req.condominioId
```

### 1. No Token JWT:
Ao fazer login, o token de autenticação conterá as informações do condomínio atual:
```json
{
  "sub": 14,
  "nome": "Carlos Silva",
  "email": "carlos@oasis.com",
  "id_condominio": 1,
  "perfis": ["SINDICO", "MORADOR"]
}
```

### 2. No Acesso às Rotas:
- Se uma requisição de reserva for feita, o backend busca apenas as áreas onde `id_condominio = user.id_condominio`.
- Se um usuário mal-intencionado tentar passar `GET /unidades/999` pertencente a outro prédio, o backend valida:
  ```sql
  SELECT u.* FROM unidade u 
    JOIN bloco b ON b.id_bloco = u.id_bloco 
   WHERE u.id_unidade = $1 AND b.id_condominio = $2
  ```
  Se não pertencer ao mesmo condomínio do token, retorna `404 Not Found` ou `403 Forbidden`.

### 3. Identificação no Frontend:
O frontend pode identificar o condomínio de duas formas simples:
- **Via Subdomínio / URL:** `edificio-sol.oasisapp.com.br` ou `oasisapp.com.br/c/edificio-sol`.
- **Via Seleção no Login:** O usuário digita seu e-mail e senha, e o sistema descobre os condomínios aos quais ele tem acesso.

---

## 5. Estratégia de Transição Suave (Zero Perda de Dados)

Quando formos implementar o multi-condomínio no banco, faremos uma migração que não interrompe e não perde nenhum dado do condomínio atual:

1. **Passo 1:** Criar a tabela `condominio`.
2. **Passo 2:** Inserir o primeiro condomínio como registro oficial:
   ```sql
   INSERT INTO condominio (id_condominio, nome, cnpj, slug, cidade, uf)
   VALUES (1, 'Condomínio Residencial OASIS', '12345678000199', 'oasis-principal', 'Ponta Grossa', 'PR');
   ```
3. **Passo 3:** Adicionar as colunas `id_condominio` nas tabelas principais com valor padrão `1`:
   ```sql
   ALTER TABLE bloco ADD COLUMN id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
   ALTER TABLE area_comum ADD COLUMN id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
   ALTER TABLE aviso ADD COLUMN id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);
   ```
4. **Resultado:** 100% dos dados atuais continuam funcionando perfeitamente sem quebrar nenhuma tela existente. A partir desse ponto, o sistema está pronto para receber o condomínio `2`, `3`, etc.

---

## 6. Próximos Passos
Este documento serve como referência de estudo. Quando você decidir avançar com a expansão para múltiplos condomínios no servidor, seguiremos exatamente este roteiro estruturado.
