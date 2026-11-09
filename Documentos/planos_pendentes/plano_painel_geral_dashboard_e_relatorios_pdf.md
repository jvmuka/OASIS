# 📊 Plano Mestre: Reformulação do Painel Geral (Estilo Lettly) & Relatórios PDF de Gestão e Cobrança

Este plano estabelece a reformulação completa do **Painel Geral Administrativo** do OASIS, elevando-o a um painel executivo e financeiro inspirado no padrão **Lettly** (cards com métricas ricas, gráficos de barras multi-mês, donut de categorias, projeção de uso futuro e ranking de unidades), acompanhado de uma suíte completa de **relatórios em PDF para prestação de contas e cobrança de taxas de áreas comuns**.

---

## 🏗️ Divisão de Responsabilidades entre os Chats

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ESTRATÉGIA MULTI-AGENTE                              │
├────────────────────────────────────────┬───────────────────────────────────────┤
│  🔧 CHAT BACKEND & INFRAESTRUTURA      │  🎨 CHAT "Conversa Oasis 2 Frontend":  │
├────────────────────────────────────────┼───────────────────────────────────────┤
│ • Modelagem de agregação financeira    │ • Telas e componentes React + Tailwind│
│ • Endpoints de dados analíticos        │ • Gráficos SVG (Barras, Linhas, Donut)│
│ • Motor de geração de PDF (PDFKit)     │ • Modal de filtros e exportação PDF   │
│ • Endpoints de streaming de PDF        │ • Estilização Lettly (Light/Dark mode) │
│ • Exportação CSV para administradoras  │ • Feedback visual e loading states    │
└────────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 📑 Suíte de Relatórios PDF: Possibilidades e Recursos

### 1. Relatório Mensal Geral Consolidado (Painel Executivo)
* **Objetivo:** Visão 360° da saúde operacional do condomínio no mês para o Síndico e Conselho Consultivo.
* **Conteúdo:**
  - Cabeçalho institucional com Logo do OASIS, nome do condomínio, período e dados do emissor.
  - **Super Cards de Resumo Executivo:** Arrecadação total de taxas, total de reservas realizadas, novos moradores, encomendas recebidas/entregues e chamados abertos x resolvidos.
  - **Desempenho das Áreas Comuns:** Tabela comparando capacidade, total de agendamentos no mês, horas de uso e receita auferida por espaço.
  - **Quadro de Chamados e Manutenções:** Índice de resolutividade, tempo médio de atendimento e ranking de tipos de manutenção (elétrica, hidráulica, civil, etc.).
  - **Parecer da Gestão e Assinaturas:** Campo para despacho do Síndico e membros do Conselho Fiscal.

### 2. Relatório de Cobrança de Áreas Comuns (Para Boleto & Administradora) ⭐ *(Solicitado)*
* **Objetivo:** Fornecer à Administradora de Condomínio o espelho oficial e auditável com todos os valores a serem lançados no boleto da cota condominial de cada unidade.
* **Conteúdo:**
  - Tabela zebrada com ordenação por **Bloco > Apartamento > Data**:
    - **Unidade:** Bloco e Apartamento.
    - **Morador Responsável:** Nome completo e CPF mascarado (`***.456.789-**`).
    - **Espaço Utilizado:** Churrasqueira, Salão de Festas, etc.
    - **Data e Horário:** Data do evento e intervalo reservado.
    - **Status da Reserva:** Concluída ou Ativa (apenas reservas válidas).
    - **Taxa Aplicada:** Valor monetário formatado (`R$ 60,00`, `R$ 150,00`).
  - **Subtotais agrupados por Bloco** e **Total Geral Consolidado** a ser repassado ao condomínio.
  - Campos oficiais para validação e protocolo contábil.

### 3. Outras Possibilidades de Alto Valor Agregado
* **Extrato Individual de Cobrança por Morador:** Espelho pontual para enviar via e-mail ou WhatsApp direto ao morador comprovando a data e horário em que utilizou o espaço antes da cobrança.
* **Relatório Operacional de Portaria & Acesso:** Balanço de encomendas recebidas e não retiradas há mais de 7 dias, além do controle de devolução de chaves de áreas técnicas.
* **Dossiê de Manutenções & Vistoria Predial (Chamados):** Relatório analítico para Assembleia Geral Ordinária (AGO), detalhando intervenções preventivas e corretivas no patrimônio comum.
* **Exportação CSV/Excel Estruturada:** Endpoint `/relatorios/cobranca-areas/csv` para que a administradora importe diretamente no software contábil (Superlógica, Condlink, TownSq, etc.) sem digitação manual.

---

## 🎯 Status de Execução e Etapas

### 🚀 ETAPAS DE BACKEND (Concluídas na Branch `feat/painel-geral-relatorios-pdf` ✅)

- [x] **Etapa B1: Extensão do Motor de Agregação de Indicadores (`relatorios.module.ts`)**
  - Rota `GET /relatorios/painel?mes=YYYY-MM` retornando:
    - `financeiro`: receita atual, receita anterior, variação %, receita concluída, receita pendente e total de unidades taxadas.
    - `chamados`: total do mês, resolvidos, pendentes, taxa de resolução, tempo médio e distribuição por categorias.
    - `ocupacao`: horas totais reservadas e dias com reservas.
    - `evolucao_mensal`: histórico multi-mês com reservas, receita e chamados.
    - `projecao_futura`: reservas e faturamento previsto para os próximos 3 meses.
    - `top_unidades`: ranking de unidades com maior uso e taxas.
    - `cobranca_detalhada`: lista completa de todas as reservas com taxa > 0.
- [x] **Etapa B2: Instalação e Configuração do Motor de PDF (`pdfkit`)**
  - `pdfkit` e `@types/pdfkit` adicionados.
  - Serviço `RelatoriosPdfService` criado com layout vetorial A4 institucional e logo do OASIS.
- [x] **Etapa B3: Implementação dos Endpoints de Relatórios PDF e CSV**
  - `GET /relatorios/pdf/geral?mes=YYYY-MM` (PDF Executivo Geral).
  - `GET /relatorios/pdf/cobranca-areas?mes=YYYY-MM` (PDF de Cobrança para Boleto).
  - `GET /relatorios/csv/cobranca-areas?mes=YYYY-MM` (Planilha CSV compatível com Excel e ERPs).
- [x] **Etapa B4: Testes, Seed Demonstrativo e Validação**
  - Geração de PDFs e CSV testada com dados reais e mock do mês 11/2026.
  - Documentação do Contrato de API criada em `Documentos/referencias_do_Projeto/contrato_api_painel_e_relatorios_pdf.md`.

---

### 🎨 ETAPAS DE FRONTEND (Para o Chat "Conversa Oasis 2 Frontend")

#### Etapa F1: Contrato de Dados & Tipagem TypeScript
* Atualização dos tipos em `Painel.tsx` importando ou definindo a interface conforme documentado em:
  `Documentos/referencias_do_Projeto/contrato_api_painel_e_relatorios_pdf.md`.

#### Etapa F2: Layout e Super Cards do Painel (Estilo Lettly)
* **Cabeçalho:** Título, Seletor de Período (Mês / Trimestre / Ano) e Botão **"Exportar"** com menu suspenso:
  - 📄 *Exportar Relatório Geral (PDF)*
  - 🧾 *Exportar Cobrança de Áreas (PDF)*
  - 📊 *Exportar Planilha (CSV)*
* **4 Cards de Topo (Lettly Style):**
  1. *Arrecadação de Áreas Comuns* (Valor R$, badge de % vs mês anterior).
  2. *Chamados & Manutenções* (Total, taxa de resolução, tempo médio).
  3. *Taxa de Ocupação dos Espaços* (% de uso, horas totais).
  4. *Valores a Faturar na Cota* (Total a cobrar de taxas, total de apartamentos).

#### Etapa F3: Gráficos e Seções Centrais
* **Gráfico de Barras Multi-Mês:** Histórico comparativo (Receita R$ vs Volume de Reservas e Chamados).
* **Gráfico de Donut:** Distribuição de uso por Área Comum e Chamados por Categoria.
* **Gráfico de Linha / Tendência:** Projeção de demanda e receita para os próximos 30-90 dias.
* **Tabela Ranking:** Top unidades com maior utilização de áreas comuns.

#### Etapa F4: Ações de Download e Pré-visualização
* Conectar o clique dos botões de exportação aos novos endpoints do backend (`/relatorios/pdf/geral`, `/relatorios/pdf/cobranca-areas` e `/relatorios/csv/cobranca-areas`) usando `fetch` com `Authorization: Bearer <token>` e gerando o Blob/download no navegador.
