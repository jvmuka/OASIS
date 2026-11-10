# 📡 Contrato de API: Painel Geral (Estilo Lettly) & Relatórios PDF/CSV

Este documento descreve os novos contratos de dados, endpoints e formatos disponíveis no **Backend** (branch `feat/painel-geral-relatorios-pdf`), desenvolvidos para alimentar o novo Painel Geral e a suíte de relatórios para o Frontend.

---

## 1. Endpoints Disponíveis

| Método | Rota | Descrição | Formato Retornado |
| :--- | :--- | :--- | :--- |
| `GET` | `/relatorios/painel?mes=YYYY-MM` | Indicadores consolidados, dados financeiros, chamados, projeção futura e rankings | `application/json` |
| `GET` | `/relatorios/pdf/geral?mes=YYYY-MM` | Relatório Mensal Geral Consolidado (Painel Executivo) | `application/pdf` |
| `GET` | `/relatorios/pdf/cobranca-areas?mes=YYYY-MM` | Demonstrativo de Cobrança de Áreas Comuns (para envio à Administradora / Boleto) | `application/pdf` |
| `GET` | `/relatorios/csv/cobranca-areas?mes=YYYY-MM` | Exportação do espelho de cobrança de taxas em CSV formatado (separador `;` e UTF-8 com BOM) | `text/csv; charset=utf-8` |

> 🔒 **Autenticação:** Todas as rotas exigem `Bearer Token` nos cabeçalhos (`Authorization: Bearer <token>`). O perfil do usuário deve ser `SINDICO`, `ADMINISTRADOR` ou `SUPERADMIN`. No caso do `SUPERADMIN`, pode ser enviado o header `x-condominio-id` para alternar o condomínio.

---

## 2. Tipagem TypeScript Completa para o Frontend

```typescript
export interface PainelGeralResposta {
  condominio: {
    id_condominio: number;
    nome: string;
    cnpj?: string | null;
    endereco_completo?: string | null;
    cidade?: string | null;
    uf?: string | null;
    telefone_contato?: string | null;
    email_contato?: string | null;
  };
  mes_selecionado: string; // Ex: "2026-11"
  mes_rotulo: string;      // Ex: "Novembro/2026"
  periodo_apuracao: string;// Ex: "Período apurado: 01/11/2026 até 09/11/2026 (eventos realizados até a data presente)"
  meses_disponiveis: { valor: string; rotulo: string }[];
  
  // Super Cards Operacionais
  totais: {
    reservas_mes: number;
    encomendas_pendentes: number;
    moradores_ativos: number;
    chaves_emprestadas: number;
    chaves_atrasadas: number;
    total_unidades: number;
  };

  // Bloco Financeiro das Áreas Comuns (Estilo Lettly)
  financeiro: {
    receita_mes_atual: number;       // Receita faturável até a data de corte (R$)
    receita_faturavel: number;       // Total já apto para cobrança em boleto (eventos já ocorridos)
    receita_prevista_futura: number; // Reservas futuras confirmadas para o restante do mês
    receita_total_mes: number;       // Soma integral do mês (faturável + futura)
    receita_mes_anterior: number;    // Soma do mês anterior para comparação (R$)
    variacao_receita_pct: number;    // Variação percentual (ex: 15.5 ou -5.2)
    receita_concluida: number;       // Taxas de eventos já realizados
    receita_pendente: number;        // Taxas de eventos futuros
    total_unidades_taxadas: number;  // Quantidade de apartamentos distintos no espelho de cobrança
  };
    receita_mes_anterior: number;   // Soma do mês anterior para comparação (R$)
    variacao_receita_pct: number;   // Variação percentual (ex: 15.5 ou -5.2)
    receita_concluida: number;      // Taxas de eventos já realizados no mês (R$)
    receita_pendente: number;       // Taxas de eventos futuros confirmados no mês (R$)
    total_unidades_taxadas: number; // Quantidade de apartamentos distintos a cobrar
  };

  // Bloco de Ocorrências e Manutenções (Chamados)
  chamados: {
    total_mes: number;
    resolvidos: number;
    pendentes: number;
    em_andamento: number;
    em_analise: number;
    taxa_resolucao_pct: number;          // Ex: 85.5
    tempo_medio_resolucao_horas: number; // Média em horas (ex: 24.5)
    categorias: {
      categoria: string; // Ex: 'LIMPEZA', 'AVARIA_QUEBRADO', 'MANUTENCAO', 'CONVIVENCIA_BARULHO'
      rotulo: string;    // Ex: 'Avarias & Reparos'
      total: number;
      pct: number;       // Percentual (ex: 35.0)
    }[];
  };

  // Bloco de Ocupação dos Espaços
  ocupacao: {
    horas_totais_reservadas: number;
    dias_com_reserva: number;
  };

  // Histórico Multi-Mês (Para gráficos comparativos de Barras e Linhas)
  evolucao_mensal: {
    mes_chave: string;       // "2026-11"
    mes_rotulo: string;      // "Nov"
    ano: string;             // "2026"
    total_reservas: number;  // Volume de agendamentos
    receita_total: number;   // Faturamento em R$
    chamados_abertos: number;// Volume de manutenções abertas
  }[];

  // Projeção Futura (Cash Flow & Usage Forecast dos próximos 3 meses)
  projecao_futura: {
    mes_chave: string;
    mes_rotulo: string;         // Ex: "Dez/2026"
    reservas_agendadas: number; // Reservas já confirmadas no banco
    receita_prevista: number;   // Taxas garantidas para os próximos meses
  }[];

  // Ranking das Unidades com Maior Arrecadação / Uso
  top_unidades: {
    bloco: string;
    apartamento: string;
    morador: string;
    morador_cpf: string; // Mascarado, ex: "***.222.333-**"
    total_reservas: number;
    total_taxas: number; // R$ total
  }[];

  // Espelho de Cobrança Detalhado (Todas as reservas tarifadas do mês)
  cobranca_detalhada: {
    id_reserva: number;
    bloco: string;
    apartamento: string;
    morador_nome: string;
    morador_cpf: string;
    area_nome: string;
    data_evento: string;    // "DD/MM/AAAA"
    horario_inicio: string; // "HH:MM"
    horario_fim: string;    // "HH:MM"
    status: 'CONCLUIDA' | 'ATIVA';
    valor_taxa: number;
  }[];

  // Áreas mais utilizadas no período
  areas_mais_usadas: {
    id_area_comum: number;
    nome: string;
    capacidade: number;
    reservas: number;
    horas_totais: number;
    valor_unitario: number;
    receita_total: number;
  }[];

  // Status das Reservas no Mês
  status_reservas: {
    status: 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';
    total: number;
  }[];

  // Lista dos últimos agendamentos do mês
  reservas_recentes: {
    id_reserva: number;
    nome: string;
    area: string;
    taxa?: number;
    data_hora_inicio: string;
    data_hora_fim?: string;
    status: string;
    unidade?: string | null;
  }[];
}
```

---

## 3. Como Baixar ou Pré-Visualizar os PDFs no Frontend

Como os endpoints de PDF exigem autenticação JWT, a melhor abordagem no frontend é buscar o arquivo via `fetch` ou `api.get(url, { responseType: 'blob' })` e abrir via `URL.createObjectURL`:

```typescript
async function abrirPdf(tipo: 'geral' | 'cobranca', mes: string) {
  const rota = tipo === 'geral' ? '/relatorios/pdf/geral' : '/relatorios/pdf/cobranca-areas';
  const token = localStorage.getItem('oasis_token');
  
  const resposta = await fetch(`${API_URL}${rota}?mes=${mes}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resposta.ok) throw new Error('Falha ao gerar o documento PDF');

  const blob = await resposta.blob();
  const urlBlob = window.URL.createObjectURL(blob);
  window.open(urlBlob, '_blank');
}

async function baixarCsvCobranca(mes: string) {
  const token = localStorage.getItem('oasis_token');
  const resposta = await fetch(`${API_URL}/relatorios/csv/cobranca-areas?mes=${mes}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resposta.ok) throw new Error('Falha ao exportar CSV');

  const blob = await resposta.blob();
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `cobranca-taxas-areas-${mes}.csv`;
  link.click();
}
```
