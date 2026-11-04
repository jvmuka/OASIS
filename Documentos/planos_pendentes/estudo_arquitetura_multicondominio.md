# Estudo Arquitetural Minucioso: Estratégias de Multi-Tenancy no OASIS

**Data:** 04/11/2026  
**Contexto:** Preparação da arquitetura do OASIS para atender múltiplos condomínios simultâneos (*Multi-Tenancy / SaaS*) em servidor de produção (Cloud/VPS).  
**Objetivo:** Realizar um estudo técnico comparativo aprofundado sobre as 4 abordagens levantadas (Multi-Tenancy por Linha/RLS, Divisão por Contêiner, PostgreSQL Tablespaces e Particionamento Declarativo de Tabelas), fornecendo a matriz de decisão, o veredito técnico e o roteiro detalhado de implementação para o OASIS.

---

## 1. Visão Geral do Desafio

Ao expandir o OASIS de um sistema monocondomínio para uma plataforma multi-condomínio (SaaS), o principal desafio de engenharia é:

> **Como hospedar múltiplos condomínios com segurança total de dados, alta performance e facilidade de manutenção, mantendo os custos operacionais viáveis (inclusive em infraestruturas enxutas como a VPS gratuita da Oracle Cloud)?**

Abaixo, analisamos minuciosamente as 4 opções conceituais discutidas com o orientador.

---

## 2. Análise Minuciosa das 4 Abordagens

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                VISÃO GERAL DAS 4 ABORDAGENS                                     │
├─────────────────────────┬─────────────────────────┬─────────────────────────┬───────────────────┤
│ Abordagem 1             │ Abordagem 2             │ Abordagem 3             │ Abordagem 4       │
│ Multi-Tenancy Lógico    │ Divisão por Contêiner   │ PostgreSQL Tablespaces  │ Particionamento   │
│ (Row-Level Tenancy/RLS) │ (Container-per-Tenant)  │ (Armazenamento Físico)  │ Declarativo       │
├─────────────────────────┼─────────────────────────┼─────────────────────────┼───────────────────┤
│ 1 Banco, 1 Schema       │ N Bancos / N Stacks     │ 1 Banco, N Diretórios   │ 1 Banco, Tabelas  │
│ Coluna `id_condominio`  │ Contêineres Docker      │ de Disco (Filesystem)   │ Particionadas por │
│ em tabelas principais   │ isolados por condomínio │ sem isolamento lógico   │ `id_condominio`   │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴───────────────────┘
```

---

### Abordagem 1: Multi-Tenancy Lógico / Compartilhado (Row-Level Tenancy + RLS)

#### Como Funciona:
Todas as tabelas do banco de dados residem no mesmo esquema (`public`), e as tabelas centrais (`bloco`, `area_comum`, `aviso`, `encomenda`) recebem uma coluna identificadora `id_condominio INTEGER NOT NULL REFERENCES condominio(id_condominio)`.

O isolamento pode ser garantido de duas formas complementares:
1. **Na aplicação (NestJS):** Todo SQL executado pelo backend inclui obrigatoriamente `WHERE id_condominio = req.condominioId`.
2. **No banco (PostgreSQL Row-Level Security - RLS):** O próprio PostgreSQL barra nativamente qualquer linha que não pertença ao condomínio da sessão corrente, via políticas automáticas (`CREATE POLICY`).

#### Diagrama de Arquitetura:
```
       [ Usuários Condomínio 1 ]       [ Usuários Condomínio 2 ]
                   │                               │
                   ▼                               ▼
       ┌───────────────────────────────────────────────────────┐
       │             Backend NestJS (Pool Único)               │
       └──────────────────────────┬────────────────────────────┘
                                  │
                                  ▼
       ┌───────────────────────────────────────────────────────┐
       │           PostgreSQL (Banco Compartilhado)            │
       │  ┌─────────────────────────────────────────────────┐  │
       │  │ Tabela `reserva`                                │  │
       │  │ id_reserva │ id_condominio │ data       │ status│  │
       │  │ 101        │ 1 (Solar)     │ 2026-11-10 │ ATIVA │  │
       │  │ 102        │ 2 (Jardins)   │ 2026-11-10 │ ATIVA │  │
       │  └─────────────────────────────────────────────────┘  │
       └───────────────────────────────────────────────────────┘
```

* **Vantagens:**
  * **Custo Mínimo de Hardware:** Roda perfeitamente em VPS básica de 1 GB de RAM (como a Oracle Free Tier), atendendo dezenas de condomínios.
  * **Pool de Conexões Otimizado:** O NestJS mantém apenas 1 pool de 20 conexões compartilhado dinamicamente.
  * **Manutenção e Migrações Instantâneas:** 1 único comando SQL (`ALTER TABLE`) atualiza o sistema inteiro para todos os clientes em menos de 1 segundo.
  * **Visão Global para Superadmin:** Facilidade para relatórios consolidados, métricas de adesão e faturamento global.
* **Desvantagens:**
  * Requer rigor no backend ou ativação de RLS para evitar esquecimento de cláusula `WHERE`.
  * Backup individual de 1 condomínio específico exige script de exportação filtrado (`pg_dump` com `WHERE id_condominio = X`).

---

### Abordagem 2: Divisão por Contêiner (Container-per-Tenant)

#### Como Funciona:
Para cada novo condomínio que contrata o OASIS, a equipe sobe um novo contêiner de banco de dados PostgreSQL (e frequentemente um contêiner de backend NestJS dedicado), isolando os processos e arquivos.

#### Diagrama de Arquitetura:
```
 [ Condomínio Solar ]                     [ Condomínio Jardins ]
          │                                         │
          ▼                                         ▼
┌──────────────────┐                      ┌──────────────────┐
│ Container NestJS │                      │ Container NestJS │
│   (150 MB RAM)   │                      │   (150 MB RAM)   │
└─────────┬────────┘                      └─────────┬────────┘
          │                                         │
          ▼                                         ▼
┌──────────────────┐                      ┌──────────────────┐
│ Container Postgres│                     │ Container Postgres│
│   (150 MB RAM)   │                      │   (150 MB RAM)   │
└──────────────────┘                      └──────────────────┘
```

* **Vantagens:**
  * **Isolamento Absoluto:** Impossibilidade matemática de vazamento de dados entre clientes; falha de um contêiner não afeta o outro.
  * **Backup e Restauração Independentes:** `pg_dump` direto no contêiner do cliente.
* **Desvantagens Críticas:**
  * > [!CAUTION]
    > **Inviável para Servidores Enxutos / Free Tier:** Cada instância de PostgreSQL consome cerca de 150 MB de RAM ocioso, e cada NestJS cerca de 150 MB.  
    > • 1 Condomínio: 300 MB RAM (Ok)  
    > • 3 Condomínios: 900 MB RAM (No limite do servidor de 1 GB)  
    > • 10 Condomínios: 3 GB RAM (**Servidor trava por OOM Killer**)  
  * **Pesadelo Operacional de Manutenção (DevOps):** Qualquer atualização de código ou migração de banco precisa ser replicada e monitorada em $N$ contêineres diferentes.

---

### Abordagem 3: Tablespaces no PostgreSQL

#### O que é um Tablespace no PostgreSQL:
No PostgreSQL, um `TABLESPACE` é um recurso de infraestrutura física que permite ao administrador definir **em qual pasta ou disco rígido do sistema operacional** os arquivos de dados de um banco, tabela ou índice serão gravados no disco:

```sql
CREATE TABLESPACE disco_ssd_rapido LOCATION '/mnt/ssd_nvme/pg_dados';
CREATE TABLESPACE disco_hd_lento   LOCATION '/mnt/storage_sata/historico';
```

#### Análise Técnica da Aplicação para Multi-Tenancy:
* > [!WARNING]
  > **Tablespaces NÃO fornecem isolamento lógico nem segurança de dados!**
  * Um usuário que se conecta ao banco de dados pode consultar livremente tabelas que estejam em `TABLESPACE A` ou `TABLESPACE B`, desde que tenha permissão de `SELECT`. O Tablespace não restringe quem pode ver os dados.
  * O propósito do Tablespace é **gerenciamento de hardware e I/O de disco** (por exemplo: colocar tabelas pesadas de auditoria em um HD barato e tabelas transacionais rápidas em um SSD NVMe).
  * Em uma VPS com um único disco virtual (ex: volume de 46.6 GB da Oracle Cloud), criar múltiplos tablespaces aponta para o mesmo disco físico subjacente, trazendo complexidade administrativa sem nenhum ganho de segurança ou desempenho.

---

### Abordagem 4: Particionamento Declarativo de Tabelas (Table Partitioning / Partition by List)

#### Como Funciona:
O banco de dados continua sendo um só, mas as tabelas com maior volume de dados (ex: `reserva`, `encomenda`, `aviso`, `registro_acesso`) são declaradas como **tabelas particionadas por lista de condomínio**:

```sql
-- Tabela Mãe Particionada
CREATE TABLE reserva (
    id_reserva          BIGSERIAL,
    id_condominio       INTEGER NOT NULL,
    id_area_comum       INTEGER NOT NULL,
    data_reserva        DATE NOT NULL,
    status              VARCHAR(20) NOT NULL,
    PRIMARY KEY (id_condominio, id_reserva)
) PARTITION BY LIST (id_condominio);

-- Partição física individual do Condomínio 1
CREATE TABLE reserva_condo_1 PARTITION OF reserva
    FOR VALUES IN (1);

-- Partição física individual do Condomínio 2
CREATE TABLE reserva_condo_2 PARTITION OF reserva
    FOR VALUES IN (2);
```

#### Mecanismo de Partition Pruning:
Quando o backend faz uma consulta:
```sql
SELECT * FROM reserva WHERE id_condominio = 1 AND data_reserva = '2026-11-10';
```
O otimizador do PostgreSQL ativa o **Partition Pruning**: ele ignora completamente os arquivos das partições dos outros condomínios e lê **apenas** o bloco de disco exclusivo da partição `reserva_condo_1`.

* **Vantagens:**
  * **Performance Excepcional em Grande Volume:** Índices menores e buscas diretas sem escanear dados de outros prédios.
  * **Exclusão Instantânea de Dados (Offboarding):** Se um condomínio rescindir o contrato, em vez de um `DELETE` demorado que gera *bloat* no banco, basta executar `DROP TABLE reserva_condo_X` ou `ALTER TABLE ... DETACH PARTITION` (leva 10 milissegundos).
  * **Isolamento de Disco no Mesmo Banco:** Unifica a facilidade do código com a separação física no filesystem.
* **Desvantagens:**
  * Para tabelas pequenas (ex: tabela com 5 áreas comuns por prédio), criar partições gera overhead desnecessário de catálogos do Postgres.
  * Todas as chaves primárias e estrangeiras particionadas devem obrigatoriamente incluir a chave de partição (`id_condominio`).

---

## 3. Matriz Comparativa Técnica

A tabela a seguir compara as 4 abordagens sob critérios rigorosos de engenharia de software e custos:

| Critério de Comparação | Abordagem 1: Multi-Tenancy Lógico (RLS) ⭐ | Abordagem 2: Divisão por Contêiner ❌ | Abordagem 3: Tablespace Postgres ⚠️ | Abordagem 4: Particionamento Declarativo 🚀 |
| :--- | :---: | :---: | :---: | :---: |
| **Viabilidade na VPS Oracle (1 GB RAM)** | **100% Viável** (consome ~300 MB total) | **Inviável** (máximo 2 a 3 condomínios) | **Viável** (mas inútil para o problema) | **100% Viável** (mesmo consumo da Opção 1) |
| **Consumo de Memória RAM** | Mínimo e compartilhado | Multiplica por cada condomínio ($N \times 300\text{MB}$) | Idêntico ao banco padrão | Mínimo e compartilhado |
| **Custo de Hospedagem (10 clientes)** | **R$ 0,00** (cabe no Free Tier) | ~R$ 150 a R$ 300/mês (VPS de 4-8 GB) | R$ 0,00 | **R$ 0,00** |
| **Isolamento de Segurança** | Lógico (via código e políticas RLS) | Físico de Processo | Não fornece isolamento | Lógico com separação física de arquivo |
| **Complexidade de Deploy e Migração DDL** | **Mínima** (1 comando atualiza todos) | **Crítica** (script para rodar em $N$ instâncias) | Média | Baixa a Média (tabela mãe propaga DDL) |
| **Performance em Grandes Volumes** | Boa (depende de índices com `id_condominio`) | Boa (dados separados) | Neutra (sem ganho) | **Excelente** (*Partition Pruning* nativo) |
| **Backup de um Condomínio Específico** | Script de extração com filtro | Nativo (`pg_dump`) | Não diferencia | Nativo na tabela da partição |
| **Visão Global / Painel Superadmin** | **Nativa e Imediata** | Complexa (requer consultas federadas) | Nativa | **Nativa e Imediata** |

---

## 4. Veredito Técnico e Recomendação para o OASIS

### Por que descartar a Abordagem 2 (Contêineres) agora?
Porque ela transformaria o OASIS em um sistema de alto custo e alta manutenção. Para suportar 15 condomínios, seriam necessários mais de 4 GB de memória RAM só para processos ociosos, impossibilitando o uso de servidores econômicos ou gratuitos.

### Por que descartar a Abordagem 3 (Tablespaces)?
Porque Tablespaces foram projetados para direcionar I/O físico entre tipos de discos rígidos, e **não para segurança multi-tenant**. Usar tablespace para separar condomínios é um desvio de finalidade técnica (*anti-pattern*) que não impede que consultas acessem dados cruzados.

---

### A Arquitetura Campeã: Modelo Híbrido em 2 Fases ⭐

A recomendação definitiva para o OASIS é a **Arquitetura Híbrida Inteligente**:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   ARQUITETURA HÍBRIDA RECOMENDADA OASIS                          │
├────────────────────────────────────────┬─────────────────────────────────────────┤
│ FASE 1: Até 50 Condomínios (Hoje)      │ FASE 2: Acima de 50 Condomínios         │
│ Multi-Tenancy Lógico com RLS           │ Particionamento Declarativo por Lista   │
├────────────────────────────────────────┼─────────────────────────────────────────┤
│ • Coluna `id_condominio` nas tabelas   │ • Tabelas de alto volume (reservas,     │
│ • Validação automática no NestJS       │   encomendas) particionadas com         │
│ • RLS nativo no PostgreSQL             │   `PARTITION BY LIST (id_condominio)`   │
│ • Custo R$ 0,00 na VPS Oracle          │ • Sem reescrever nenhuma linha de código│
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

**Por que essa estratégia é perfeita:**
1. **Hoje:** Permite hospedar dezenas de condomínios na sua VPS Oracle gratuita de 1 GB com estabilidade e isolamento lógico absoluto.
2. **Amanhã:** Quando a base atingir centenas de condomínios e milhões de reservas/encomendas, o particionamento declarativo do PostgreSQL é ativado nas tabelas pesadas **sem alterar o código do NestJS**, pois para a aplicação o comando SQL continuará sendo idêntico!

---

## 5. Plano de Implementação Detalhado (Passo a Passo)

### Fase 1: Modelagem da Entidade `condominio`

```sql
-- 1. Criação da tabela de condomínios (Tenants)
CREATE TABLE IF NOT EXISTS condominio (
    id_condominio       SERIAL          PRIMARY KEY,
    nome                VARCHAR(120)    NOT NULL,
    cnpj                CHAR(14)        UNIQUE,
    slug                VARCHAR(60)     NOT NULL UNIQUE, -- ex: 'residencial-oasis', 'edificio-solar'
    endereco_completo   VARCHAR(255),
    cidade              VARCHAR(80)     NOT NULL DEFAULT 'Ponta Grossa',
    uf                  CHAR(2)         NOT NULL DEFAULT 'PR',
    cep                 CHAR(8),
    ativo               BOOLEAN         NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserção do condomínio atual como Tenant 1 oficial (Garante zero quebra)
INSERT INTO condominio (id_condominio, nome, cnpj, slug, cidade, uf)
VALUES (1, 'Condomínio Residencial OASIS', '00000000000100', 'oasis-central', 'Ponta Grossa', 'PR')
ON CONFLICT (id_condominio) DO NOTHING;
```

---

### Fase 2: Vinculação Suave das Tabelas Principais

As tabelas mestras recebem a chave estrangeira com valor padrão `1`, preservando 100% dos dados já cadastrados:

```sql
-- Blocos e Estrutura Física
ALTER TABLE bloco ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);

-- Áreas Comuns
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);

-- Avisos e Comunicados
ALTER TABLE aviso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);

-- Chaves de Áreas
ALTER TABLE chave ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);

-- Códigos de 1º Acesso
ALTER TABLE codigo_primeiro_acesso ADD COLUMN IF NOT EXISTS id_condominio INTEGER NOT NULL DEFAULT 1 REFERENCES condominio(id_condominio);

-- Índices compostos de alta performance
CREATE INDEX IF NOT EXISTS idx_bloco_condominio ON bloco(id_condominio);
CREATE INDEX IF NOT EXISTS idx_area_condominio ON area_comum(id_condominio);
CREATE INDEX IF NOT EXISTS idx_aviso_condominio ON aviso(id_condominio);
```

---

### Fase 3: Isolamento Ativo no Backend (NestJS)

#### 1. Inclusão do `id_condominio` no Token JWT:
No login, o payload do JWT passa a carregar o condomínio ativo da sessão:
```typescript
const payload = {
  sub: pessoa.id_pessoa,
  nome: pessoa.nome,
  email: pessoa.email,
  id_condominio: condominioAtivo.id_condominio,
  slug_condominio: condominioAtivo.slug,
  perfis: perfisPessoa
};
```

#### 2. Interceptor de Contexto Multi-Tenant:
O NestJS extrai o condomínio da requisição e garante que nenhuma consulta cruze fronteiras:
```typescript
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (user && user.id_condominio) {
      req.tenantId = user.id_condominio;
    }
    return next.handle();
  }
}
```

#### 3. Regra de Ouro no Acesso ao Banco:
```typescript
// Exemplo no serviço de avisos ou áreas comuns:
async listarAreas(req: any) {
  return this.db.query(
    'SELECT * FROM area_comum WHERE id_condominio = $1 AND ativo = TRUE',
    [req.tenantId]
  );
}
```

---

### Fase 4: Proteção Suprema com PostgreSQL RLS (Opcional para Defesa em Profundidade)

Para que mesmo um erro de digitação no backend nunca vaze dados entre condomínios, ativamos o **Row Level Security**:

```sql
-- Ativa segurança em nível de linha na tabela
ALTER TABLE area_comum ENABLE ROW LEVEL SECURITY;

-- Política: só visualiza linhas onde id_condominio bate com a variável de sessão
CREATE POLICY isolamento_condominio_area ON area_comum
    USING (id_condominio = NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER);
```

---

## 6. Roteiro de Respostas Prontas para o seu Orientador

Ao discutir este plano com seu orientador, você pode apresentar os seguintes argumentos técnicos consolidados:

1. **Sobre Divisão por Contêiner:**  
   *"Avaliamos a divisão por contêineres e concluímos que, embora ofereça isolamento de processo, ela inviabiliza nosso modelo de negócio inicial, pois cada contêiner Postgres + NestJS consome cerca de 300 MB de RAM. Em servidores enxutos como nossa VPS gratuita da Oracle de 1 GB, não conseguiríamos hospedar mais do que 2 a 3 condomínios. O custo de infraestrutura cresceria de forma linear e desnecessária."*

2. **Sobre Tablespaces:**  
   *"Estudamos a fundo a documentação do PostgreSQL sobre Tablespaces e verificamos que eles servem exclusivamente para roteamento de I/O em discos físicos diferentes (HD vs SSD), não fornecendo isolamento lógico ou de segurança entre clientes. Em uma VPS com um único disco virtual, múltiplos tablespaces não agregam benefício ao multi-tenancy."*

3. **Sobre Particionamento Declarativo (`Creation Partition`):**  
   *"Adotamos o conceito de particionamento declarativo como a Fase 2 da nossa arquitetura. Iniciamos com Multi-Tenancy Lógico via coluna `id_condominio` e RLS, e para tabelas com alto crescimento temporal (como reservas e encomendas), particionaremos por lista (`PARTITION BY LIST (id_condominio)`). Dessa forma, mantemos o menor consumo de RAM possível sem abrir mão da performance de particionamento físico."*

---

## 7. Status do Documento
* **Situação:** Documento atualizado e aprovado tecnicamente para orientar o plano arquitetural.
* **Próxima Ação:** Após validação acadêmica com o orientador, aplicar a Fase 1 da migração de banco via script versionado em `banco/migracoes/`.
