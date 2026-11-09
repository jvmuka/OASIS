import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, sessaoAtual } from '../../api';
import { Cartao, Titulo, Icone, Badge, EmptyState, Botao, Paginacao, Mensagem } from '../../components/ui';
import {
  GraficoEvolucaoMensal,
  GraficoDonutStatus,
  GraficoBarrasAreas,
  PontoEvolucao,
  ItemStatusReserva,
  ItemAreaRanking,
} from '../../components/Graficos';

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
  mes_selecionado: string;
  mes_rotulo: string;
  meses_disponiveis: { valor: string; rotulo: string }[];
  totais: {
    reservas_mes: number;
    encomendas_pendentes: number;
    moradores_ativos: number;
    chaves_emprestadas: number;
    chaves_atrasadas: number;
    total_unidades: number;
  };
  financeiro: {
    receita_mes_atual: number;
    receita_mes_anterior: number;
    variacao_receita_pct: number;
    receita_concluida: number;
    receita_pendente: number;
    total_unidades_taxadas: number;
  };
  chamados: {
    total_mes: number;
    resolvidos: number;
    pendentes: number;
    em_andamento: number;
    em_analise: number;
    taxa_resolucao_pct: number;
    tempo_medio_resolucao_horas: number;
    categorias: {
      categoria: string;
      rotulo: string;
      total: number;
      pct: number;
    }[];
  };
  ocupacao: {
    horas_totais_reservadas: number;
    dias_com_reserva: number;
  };
  evolucao_mensal: {
    mes_chave: string;
    mes_rotulo: string;
    ano?: string;
    total_reservas: number;
    receita_total: number;
    chamados_abertos: number;
  }[];
  projecao_futura: {
    mes_chave: string;
    mes_rotulo: string;
    reservas_agendadas: number;
    receita_prevista: number;
  }[];
  top_unidades: {
    bloco: string;
    apartamento: string;
    morador: string;
    morador_cpf: string;
    total_reservas: number;
    total_taxas: number;
  }[];
  cobranca_detalhada: {
    id_reserva: number;
    bloco: string;
    apartamento: string;
    morador_nome: string;
    morador_cpf: string;
    area_nome: string;
    data_evento: string;
    horario_inicio: string;
    horario_fim: string;
    status: 'CONCLUIDA' | 'ATIVA';
    valor_taxa: number;
  }[];
  areas_mais_usadas: {
    id_area_comum: number;
    nome: string;
    capacidade: number;
    reservas: number;
    horas_totais: number;
    valor_unitario: number;
    receita_total: number;
  }[];
  status_reservas: {
    status: 'ATIVA' | 'CONCLUIDA' | 'CANCELADA';
    total: number;
  }[];
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

/** Formata valores monetários em formato padrão BRL (R$ 1.250,00) */
function formatarMoeda(valor: number | undefined | null): string {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Painel Administrativo Geral do Síndico / Gestor (Padrão Lettly SaaS)
 * Apresenta indicadores consolidados, motor analítico com dados financeiros de áreas comuns,
 * taxas a cobrar em boleto, gráficos de desempenho e relatórios executivos em PDF e CSV.
 */
export default function PainelAdmin() {
  const [d, setD] = useState<PainelGeralResposta | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ texto: string; tipo: 'ok' | 'erro' }>({ texto: '', tipo: 'ok' });

  // Menu suspenso de exportação
  const [menuExportarAberto, setMenuExportarAberto] = useState(false);
  const [exportando, setExportando] = useState<'geral' | 'cobranca' | 'csv' | null>(null);
  const menuExportarRef = useRef<HTMLDivElement>(null);

  // Abas da seção de tabelas analíticas inferiores
  const [abaTabela, setAbaTabela] = useState<'cobranca' | 'ranking' | 'agendamentos'>('cobranca');

  // Filtros de agendamentos recentes
  const [buscaAgendamento, setBuscaAgendamento] = useState('');
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [todasAreas, setTodasAreas] = useState<string[]>([]);

  // Paginação independente para cada tabela
  const [paginaCobranca, setPaginaCobranca] = useState(1);
  const [paginaRanking, setPaginaRanking] = useState(1);
  const [paginaAgendamentos, setPaginaAgendamentos] = useState(1);
  const ITENS_POR_PAGINA = 8;

  // Fecha o menu de exportação se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuExportarRef.current && !menuExportarRef.current.contains(event.target as Node)) {
        setMenuExportarAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    api.get<{ id_area_comum: number; nome: string; ativo: boolean }[]>('/areas')
      .then(lista => {
        const nomes = lista.filter(a => a.ativo !== false).map(a => a.nome).sort();
        setTodasAreas(nomes);
      })
      .catch(() => {});
  }, []);

  const carregar = (mes?: string) => {
    setCarregando(true);
    setErro(null);
    const query = mes ? `?mes=${mes}` : '';
    api
      .get<PainelGeralResposta>(`/relatorios/painel${query}`)
      .then(res => {
        setD(res);
        setMesSelecionado(res.mes_selecionado);
        setPaginaCobranca(1);
        setPaginaRanking(1);
        setPaginaAgendamentos(1);
      })
      .catch(err => setErro(err.message || 'Erro ao consultar indicadores consolidados.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  // Geração e Download de Relatórios em PDF
  async function abrirRelatorioPdf(tipo: 'geral' | 'cobranca') {
    if (!d) return;
    setExportando(tipo);
    setMenuExportarAberto(false);
    try {
      const rota = tipo === 'geral' ? '/relatorios/pdf/geral' : '/relatorios/pdf/cobranca-areas';
      const token = localStorage.getItem('oasis_token');
      const s = sessaoAtual();
      const idCondominio = s?.condominio?.id_condominio;

      const resposta = await fetch(`/api${rota}?mes=${mesSelecionado}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idCondominio ? { 'x-condominio-id': String(idCondominio) } : {}),
        },
      });

      if (!resposta.ok) {
        const jsonErro = await resposta.json().catch(() => ({}));
        throw new Error(jsonErro.message || 'Falha ao gerar o documento PDF.');
      }

      const blob = await resposta.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      window.open(urlBlob, '_blank');
      setMsg({
        texto: tipo === 'geral'
          ? 'Relatório Mensal Consolidado aberto em nova aba.'
          : 'Demonstrativo de Cobrança aberto em nova aba.',
        tipo: 'ok',
      });
    } catch (e: any) {
      setMsg({ texto: e.message || 'Erro ao gerar o relatório em PDF.', tipo: 'erro' });
    } finally {
      setExportando(null);
    }
  }

  // Exportação e Download de Espelho em CSV
  async function baixarRelatorioCsv() {
    if (!d) return;
    setExportando('csv');
    setMenuExportarAberto(false);
    try {
      const token = localStorage.getItem('oasis_token');
      const s = sessaoAtual();
      const idCondominio = s?.condominio?.id_condominio;

      const resposta = await fetch(`/api/relatorios/csv/cobranca-areas?mes=${mesSelecionado}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idCondominio ? { 'x-condominio-id': String(idCondominio) } : {}),
        },
      });

      if (!resposta.ok) {
        const jsonErro = await resposta.json().catch(() => ({}));
        throw new Error(jsonErro.message || 'Falha ao exportar a planilha CSV.');
      }

      const blob = await resposta.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `cobranca-taxas-areas-${mesSelecionado}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMsg({ texto: 'Download da planilha de cobrança concluído com sucesso.', tipo: 'ok' });
    } catch (e: any) {
      setMsg({ texto: e.message || 'Erro ao baixar planilha CSV.', tipo: 'erro' });
    } finally {
      setExportando(null);
    }
  }

  if (carregando && !d) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <svg className="h-8 w-8 animate-spin text-navy dark:text-sky-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="font-medium">Carregando métricas e dados consolidados do condomínio...</span>
        </div>
      </div>
    );
  }

  if (erro || !d) {
    return (
      <div className="space-y-6">
        <Titulo
          ajudaKey="/sindico/painel"
          sub="Acompanhe os principais indicadores de operação, finanças e ocupação dos espaços coletivos."
          icone={<Icone nome="home" className="h-5 w-5" />}
        >
          Painel Geral do Condomínio
        </Titulo>
        <Cartao>
          <EmptyState
            icone="home"
            titulo="Não foi possível carregar os indicadores"
            descricao={erro || 'Houve uma falha ao obter os dados consolidados.'}
            acao={
              <Botao onClick={() => carregar(mesSelecionado)} variante="primario" tamanho="sm">
                Tentar Novamente
              </Botao>
            }
          />
        </Cartao>
      </div>
    );
  }

  const rotuloMesAtual = d.mes_rotulo || d.mes_selecionado;

  // Preparação dos dados para os componentes de gráficos nativos
  const dadosEvolucaoCompat: PontoEvolucao[] = (d.evolucao_mensal || []).map(e => ({
    mes_chave: e.mes_chave,
    mes_rotulo: e.mes_rotulo,
    total: Number(e.total_reservas || 0),
  }));

  const dadosStatusCompat: ItemStatusReserva[] = (d.status_reservas || []).map(s => ({
    status: s.status,
    total: Number(s.total || 0),
  }));

  const dadosAreasCompat: ItemAreaRanking[] = (d.areas_mais_usadas || []).map(a => ({
    id_area_comum: a.id_area_comum,
    nome: a.nome,
    reservas: Number(a.reservas || 0),
  }));

  const totalEvolucao = dadosEvolucaoCompat.reduce((acc, p) => acc + p.total, 0);

  // Áreas únicas para filtros da listagem de agendamentos
  const areasUnicas = Array.from(
    new Set([
      ...todasAreas,
      ...d.areas_mais_usadas.map(a => a.nome),
      ...d.reservas_recentes.map(r => r.area),
    ])
  ).filter(Boolean).sort();

  // Filtragem dos agendamentos recentes
  const agendamentosFiltrados = (d.reservas_recentes || []).filter(r => {
    const termo = buscaAgendamento.toLowerCase().trim();
    const matchBusca =
      !termo ||
      r.nome.toLowerCase().includes(termo) ||
      (r.unidade && r.unidade.toLowerCase().includes(termo));
    const matchArea = filtroArea === 'TODAS' || r.area === filtroArea;
    const matchStatus = filtroStatus === 'TODOS' || r.status === filtroStatus;
    return matchBusca && matchArea && matchStatus;
  });

  // Paginação dos Agendamentos Recentes
  const totalPaginasAgendamentos = Math.ceil(agendamentosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const agendamentosPaginados = agendamentosFiltrados.slice(
    (paginaAgendamentos - 1) * ITENS_POR_PAGINA,
    paginaAgendamentos * ITENS_POR_PAGINA
  );

  // Paginação do Espelho de Cobrança
  const listaCobranca = d.cobranca_detalhada || [];
  const totalPaginasCobranca = Math.ceil(listaCobranca.length / ITENS_POR_PAGINA) || 1;
  const cobrancaPaginada = listaCobranca.slice(
    (paginaCobranca - 1) * ITENS_POR_PAGINA,
    paginaCobranca * ITENS_POR_PAGINA
  );

  // Paginação do Ranking de Unidades
  const listaRanking = d.top_unidades || [];
  const totalPaginasRanking = Math.ceil(listaRanking.length / ITENS_POR_PAGINA) || 1;
  const rankingPaginado = listaRanking.slice(
    (paginaRanking - 1) * ITENS_POR_PAGINA,
    paginaRanking * ITENS_POR_PAGINA
  );

  const temFiltroAgendamento =
    buscaAgendamento.trim() !== '' || filtroArea !== 'TODAS' || filtroStatus !== 'TODOS';

  return (
    <div className="space-y-7 pb-10">
      {/* ========================================================= */}
      {/* TOPO: TÍTULO, SELETOR DE MÊS E MENU DE EXPORTAÇÃO         */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Titulo
            sub="Visão estratégica consolidada, fluxo financeiro de áreas comuns e relatórios operacionais."
            icone={<Icone nome="home" className="h-6 w-6" />}
            ajudaKey="/sindico/painel"
          >
            Painel Geral do Condomínio
          </Titulo>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor de Mês de Análise */}
          <div className="flex items-center gap-2 rounded-xl border border-[#e2e6ec] bg-white px-3.5 py-2 shadow-2xs dark:border-slate-800 dark:bg-[#0e1525]">
            <Icone nome="calendar" className="h-4 w-4 text-[#525d6e] dark:text-slate-400" />
            <span className="text-[11px] font-bold text-[#525d6e] dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
              Período:
            </span>
            <select
              value={mesSelecionado}
              onChange={e => {
                const novoMes = e.target.value;
                setMesSelecionado(novoMes);
                carregar(novoMes);
              }}
              className="bg-transparent text-xs font-bold text-[#0b1830] focus:outline-hidden dark:text-slate-100 cursor-pointer pr-1"
            >
              {d.meses_disponiveis.map(m => (
                <option key={m.valor} value={m.valor} className="dark:bg-slate-900">
                  {m.rotulo}
                </option>
              ))}
            </select>
          </div>

          {/* BOTÃO DROPDOWN EXPORTAR RELATÓRIOS (PDF / CSV) */}
          <div className="relative" ref={menuExportarRef}>
            <button
              type="button"
              onClick={() => setMenuExportarAberto(prev => !prev)}
              disabled={!!exportando}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy/90 dark:bg-sky-600 dark:hover:bg-sky-500 transition-all cursor-pointer disabled:opacity-60"
            >
              {exportando ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Icone nome="fileText" className="h-4 w-4 text-sky-200" />
                  <span>Exportar Relatórios</span>
                  <Icone
                    nome="chevronDown"
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${menuExportarAberto ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>

            {menuExportarAberto && (
              <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-[#0e1525] z-50 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Relatórios de {rotuloMesAtual}
                  </p>
                  <p className="text-[10px] text-slate-500">Documentos oficiais para prestação de contas</p>
                </div>

                <div className="space-y-1">
                  {/* Opção 1: Relatório Executivo Geral em PDF */}
                  <button
                    type="button"
                    onClick={() => abrirRelatorioPdf('geral')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-100 dark:border-sky-900 group-hover:scale-105 transition-transform">
                      <Icone nome="fileText" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        Relatório Mensal Geral
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300">
                          PDF
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Resumo executivo completo, gráficos, chamados e espaço para assinaturas.
                      </p>
                    </div>
                  </button>

                  {/* Opção 2: Demonstrativo de Cobrança em PDF */}
                  <button
                    type="button"
                    onClick={() => abrirRelatorioPdf('cobranca')}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900 group-hover:scale-105 transition-transform">
                      <Icone nome="building" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        Cobrança de Áreas Comuns
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                          PDF
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Espelho detalhado com moradores, CPF e taxas para envio à Administradora.
                      </p>
                    </div>
                  </button>

                  {/* Opção 3: Planilha CSV */}
                  <button
                    type="button"
                    onClick={baixarRelatorioCsv}
                    className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-100 dark:border-amber-900 group-hover:scale-105 transition-transform">
                      <Icone nome="download" className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        Planilha de Cobrança
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                          CSV
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                        Exportação formatada para importação direta no Excel e ERPs de condomínio.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={() => carregar(mesSelecionado)}
            title="Atualizar dados do painel"
            disabled={carregando}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e6ec] bg-white text-[#525d6e] hover:text-navy hover:bg-[#f6f7f9] dark:border-slate-800 dark:bg-[#0e1525] dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`h-4 w-4 ${carregando ? 'animate-spin text-navy dark:text-sky-400' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SUPER CARDS OPERACIONAIS E FINANCEIROS (LETTLY SAAS)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Faturamento & Taxas de Áreas Comuns */}
        <div className="group relative overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/30 hover:shadow-card dark:border-slate-800 dark:bg-[#0e1525]">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              Financeiro
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Icone nome="building" className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {formatarMoeda(d.financeiro?.receita_mes_atual)}
              </p>
              {d.financeiro?.variacao_receita_pct !== undefined && (
                <span
                  className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    d.financeiro.variacao_receita_pct >= 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400'
                  }`}
                  title={`Comparado com ${formatarMoeda(d.financeiro.receita_mes_anterior)} no mês anterior`}
                >
                  {d.financeiro.variacao_receita_pct >= 0 ? '+' : ''}
                  {d.financeiro.variacao_receita_pct}%
                </span>
              )}
            </div>
            <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
              Taxas de Áreas Comuns
            </h4>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>{d.financeiro?.total_unidades_taxadas || 0} unidades a cobrar</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Pendente: {formatarMoeda(d.financeiro?.receita_pendente)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Agendamentos & Reservas */}
        <Link
          to="/portaria/painel"
          className="group relative overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-card dark:border-slate-800 dark:bg-[#0e1525]"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
              Ocupação
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8edf7] text-[#2548a0] dark:bg-blue-950/60 dark:text-blue-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Icone nome="calendar" className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight text-[#0b1830] dark:text-white">
              {d.totais.reservas_mes}
            </p>
            <h4 className="mt-1 text-sm font-bold text-[#0b1830] dark:text-slate-300">
              Reservas no Período
            </h4>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>{d.ocupacao?.horas_totais_reservadas || 0}h reservadas</span>
              <span>{d.ocupacao?.dias_com_reserva || 0} dias c/ evento</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Chamados & Manutenções */}
        <Link
          to="/sindico/chamados"
          className="group relative overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/30 hover:shadow-card dark:border-slate-800 dark:bg-[#0e1525]"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              Manutenções
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Icone nome="wrench" className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-extrabold tracking-tight text-[#0b1830] dark:text-white">
                {d.chamados?.total_mes || 0}
              </p>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                {d.chamados?.taxa_resolucao_pct || 0}% resolvidos
              </span>
            </div>
            <h4 className="mt-1 text-sm font-bold text-[#0b1830] dark:text-slate-300">
              Chamados & Reparos
            </h4>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>{d.chamados?.pendentes || 0} em aberto</span>
              <span>Méd. {d.chamados?.tempo_medio_resolucao_horas || 0}h</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Operação da Portaria & Segurança */}
        <Link
          to="/portaria/encomendas"
          className="group relative overflow-hidden rounded-2xl border border-[#e2e6ec] bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-card dark:border-slate-800 dark:bg-[#0e1525]"
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              Portaria
            </span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fdf0d9] text-[#b26a00] dark:bg-amber-950/60 dark:text-amber-400 shadow-2xs group-hover:scale-105 transition-transform">
              <Icone nome="package" className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-3xl font-extrabold tracking-tight text-[#0b1830] dark:text-white">
              {d.totais.encomendas_pendentes}
            </p>
            <h4 className="mt-1 text-sm font-bold text-[#0b1830] dark:text-slate-300">
              Encomendas a Retirar
            </h4>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <span>{d.totais.chaves_emprestadas} chaves em uso</span>
              <span className={Number(d.totais.chaves_atrasadas || 0) > 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                {Number(d.totais.chaves_atrasadas || 0) > 0 ? `${d.totais.chaves_atrasadas} atrasadas` : 'Sem atrasos'}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ========================================================= */}
      {/* 2. GRID DE GRÁFICOS ANALÍTICOS PRINCIPAIS                */}
      {/* ========================================================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico de Evolução Mensal (Ocupa 2 colunas) */}
        <div className="lg:col-span-2">
          <Cartao className="p-6">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Icone nome="calendar" className="h-4 w-4 text-navy dark:text-sky-400" />
                  Evolução Histórica de Agendamentos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Volume de reservas dos últimos 6 meses até {rotuloMesAtual}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                  Total no período: {totalEvolucao} reservas
                </span>
              </div>
            </div>

            <GraficoEvolucaoMensal dados={dadosEvolucaoCompat} />
          </Cartao>
        </div>

        {/* Gráfico Donut de Status das Reservas (Ocupa 1 coluna) */}
        <div className="lg:col-span-1">
          <Cartao className="p-6 h-full flex flex-col justify-between">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="check" className="h-4 w-4 text-navy dark:text-sky-400" />
                Status das Reservas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Proporção em {rotuloMesAtual}
              </p>
            </div>

            <div className="py-4 my-auto">
              <GraficoDonutStatus
                dados={dadosStatusCompat}
                statusAtivo={filtroStatus}
                onSelectStatus={st => setFiltroStatus(curr => (curr === st ? 'TODOS' : st))}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              {dadosStatusCompat.reduce((acc, s) => acc + s.total, 0) > 0
                ? 'Clique em um status para filtrar a tabela abaixo'
                : `Sem agendamentos registrados em ${rotuloMesAtual}`}
            </div>
          </Cartao>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. PROJEÇÃO FUTURA (CASH FLOW) & CATEGORIAS DE MANUTENÇÃO */}
      {/* ========================================================= */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card: Projeção de Demanda Futura (Próximos 3 Meses) */}
        <Cartao className="p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Icone nome="sparkles" className="h-4 w-4 text-sky-500" />
                  Previsão de Demanda & Receita Futura
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Projeção para os próximos 3 meses com base em agendamentos já confirmados
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Forecast 90d
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
              {(d.projecao_futura || []).map((p, idx) => (
                <div
                  key={p.mes_chave || idx}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 text-center flex flex-col justify-between"
                >
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {p.mes_rotulo}
                  </p>
                  <p className="text-xl font-extrabold text-navy dark:text-sky-400 my-2">
                    {p.reservas_agendadas} {p.reservas_agendadas === 1 ? 'reserva' : 'reservas'}
                  </p>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <p className="text-[11px] text-slate-400">Receita Prevista</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatarMoeda(p.receita_prevista)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 text-center border-t border-slate-100 dark:border-slate-800 pt-3">
            Valores atualizados em tempo real conforme novas reservas são realizadas pelos moradores.
          </p>
        </Cartao>

        {/* Card: Desempenho de Chamados por Categoria */}
        <Cartao className="p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Icone nome="wrench" className="h-4 w-4 text-amber-500" />
                  Chamados por Categoria
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Distribuição das solicitações e manutenções abertas em {rotuloMesAtual}
                </p>
              </div>
              <Link
                to="/sindico/chamados"
                className="text-xs font-bold text-navy hover:underline dark:text-sky-400"
              >
                Gerenciar chamados
              </Link>
            </div>

            {(!d.chamados?.categorias || d.chamados.categorias.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum chamado registrado para {rotuloMesAtual}.
              </div>
            ) : (
              <div className="space-y-3.5 my-2">
                {d.chamados.categorias.map(cat => (
                  <div key={cat.categoria} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {cat.rotulo}
                      </span>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-900 dark:text-slate-100">{cat.total}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          ({cat.pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Resolvidos: <strong>{d.chamados?.resolvidos || 0}</strong></span>
            <span>Em andamento: <strong>{d.chamados?.em_andamento || 0}</strong></span>
            <span>Tempo médio: <strong>{d.chamados?.tempo_medio_resolucao_horas || 0}h</strong></span>
          </div>
        </Cartao>
      </div>

      {/* ========================================================= */}
      {/* 4. SEÇÃO ANALÍTICA COM ABAS & TABELAS PAGINADAS            */}
      {/* ========================================================= */}
      <Cartao className="p-6">
        {/* Abas Superiores da Seção Analítica */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setAbaTabela('cobranca')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                abaTabela === 'cobranca'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-[#f6f7f9] dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icone nome="building" className="h-4 w-4" />
              <span>Espelho de Cobrança (Taxas)</span>
              {listaCobranca.length > 0 && (
                <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                  abaTabela === 'cobranca' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  {listaCobranca.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setAbaTabela('ranking')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                abaTabela === 'ranking'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-[#f6f7f9] dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icone nome="users" className="h-4 w-4" />
              <span>Ranking de Unidades</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaTabela('agendamentos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                abaTabela === 'agendamentos'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-[#f6f7f9] dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icone nome="clock" className="h-4 w-4" />
              <span>Todos os Agendamentos</span>
              <span className="text-[10px] text-slate-400">({d.reservas_recentes.length})</span>
            </button>
          </div>

          {/* Atalhos contextuais da aba ativa */}
          {abaTabela === 'cobranca' && listaCobranca.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => abrirRelatorioPdf('cobranca')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Exportar espelho para PDF"
              >
                <Icone nome="fileText" className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>PDF Cobrança</span>
              </button>
              <button
                type="button"
                onClick={baixarRelatorioCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Baixar planilha CSV"
              >
                <Icone nome="download" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>

        {/* ABA 1: ESPELHO DE COBRANÇA DE TAXAS DE ÁREAS COMUNS */}
        {abaTabela === 'cobranca' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <p>
                Demonstrativo oficial de todas as reservas tarifadas de <strong>{rotuloMesAtual}</strong> para inclusão no boleto condominial.
              </p>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Total Geral: <span className="text-emerald-600 dark:text-emerald-400 text-sm">{formatarMoeda(d.financeiro?.receita_mes_atual)}</span>
              </p>
            </div>

            {listaCobranca.length === 0 ? (
              <EmptyState
                titulo={`Nenhuma taxa a cobrar em ${rotuloMesAtual}`}
                descricao="Não há reservas tarifadas registradas ou com taxas pendentes de cobrança neste período."
              />
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Unidade</th>
                        <th className="px-4 py-3">Morador Responsável</th>
                        <th className="px-4 py-3">Espaço Utilizado</th>
                        <th className="px-4 py-3">Data & Horário</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Taxa Aplicada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {cobrancaPaginada.map(c => (
                        <tr key={c.id_reserva} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                            Apto {c.apartamento} {c.bloco ? `• ${c.bloco}` : ''}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900 dark:text-slate-100">{c.morador_nome}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{c.morador_cpf}</p>
                          </td>
                          <td className="px-4 py-3 font-semibold text-navy dark:text-sky-400">
                            {c.area_nome}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{c.data_evento}</p>
                            <p className="text-[11px] text-slate-400">{c.horario_inicio} às {c.horario_fim}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tipo={c.status === 'CONCLUIDA' ? 'neutro' : 'sucesso'}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatarMoeda(c.valor_taxa)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Paginacao
                  paginaAtual={paginaCobranca}
                  totalPaginas={totalPaginasCobranca}
                  totalRegistros={listaCobranca.length}
                  itensPorPagina={ITENS_POR_PAGINA}
                  onMudarPagina={setPaginaCobranca}
                />
              </div>
            )}
          </div>
        )}

        {/* ABA 2: RANKING DE UNIDADES */}
        {abaTabela === 'ranking' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <p>Unidades habitacionais com maior engajamento e utilização das áreas coletivas em <strong>{rotuloMesAtual}</strong>.</p>
              <p className="font-medium">{listaRanking.length} apartamentos registrados</p>
            </div>

            {listaRanking.length === 0 ? (
              <EmptyState
                titulo="Sem registros de utilização"
                descricao="Nenhum apartamento registrou uso de áreas comuns neste período."
              />
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 w-12 text-center">#</th>
                        <th className="px-4 py-3">Apartamento / Bloco</th>
                        <th className="px-4 py-3">Morador</th>
                        <th className="px-4 py-3 text-center">Total de Reservas</th>
                        <th className="px-4 py-3 text-right">Taxas Acumuladas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {rankingPaginado.map((u, idx) => {
                        const rankNumero = (paginaRanking - 1) * ITENS_POR_PAGINA + idx + 1;
                        return (
                          <tr key={`${u.bloco}-${u.apartamento}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                                rankNumero === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : rankNumero === 2
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                  : rankNumero === 3
                                  ? 'bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'text-slate-400'
                              }`}>
                                {rankNumero}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                              Apto {u.apartamento} {u.bloco ? `• ${u.bloco}` : ''}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">{u.morador}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{u.morador_cpf}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-navy dark:text-sky-400">
                              {u.total_reservas}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {formatarMoeda(u.total_taxas)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Paginacao
                  paginaAtual={paginaRanking}
                  totalPaginas={totalPaginasRanking}
                  totalRegistros={listaRanking.length}
                  itensPorPagina={ITENS_POR_PAGINA}
                  onMudarPagina={setPaginaRanking}
                />
              </div>
            )}
          </div>
        )}

        {/* ABA 3: TODOS OS AGENDAMENTOS DO PERÍODO COM FILTROS */}
        {abaTabela === 'agendamentos' && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={buscaAgendamento}
                  onChange={e => {
                    setBuscaAgendamento(e.target.value);
                    setPaginaAgendamentos(1);
                  }}
                  placeholder="Buscar por morador ou apartamento..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-sky-500 transition-colors"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Icone nome="search" className="h-3.5 w-3.5" />
                </span>
                {buscaAgendamento && (
                  <button
                    onClick={() => {
                      setBuscaAgendamento('');
                      setPaginaAgendamentos(1);
                    }}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Limpar busca"
                  >
                    <Icone nome="x" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="relative flex-1 min-w-[150px]">
                <select
                  value={filtroArea}
                  onChange={e => {
                    setFiltroArea(e.target.value);
                    setPaginaAgendamentos(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <option value="TODAS">Todas as áreas comuns</option>
                  {areasUnicas.map(areaNome => (
                    <option key={areaNome} value={areaNome} className="dark:bg-slate-900">
                      {areaNome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-[130px]">
                <select
                  value={filtroStatus}
                  onChange={e => {
                    setFiltroStatus(e.target.value);
                    setPaginaAgendamentos(1);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <option value="TODOS">Todos os status</option>
                  <option value="ATIVA">Ativas</option>
                  <option value="CONCLUIDA">Concluídas</option>
                  <option value="CANCELADA">Canceladas</option>
                </select>
              </div>
            </div>

            {/* Feedback de Filtros Ativos */}
            {temFiltroAgendamento && (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  Exibindo <strong>{agendamentosFiltrados.length}</strong> de {d.reservas_recentes.length} agendamentos
                </span>
                <button
                  onClick={() => {
                    setBuscaAgendamento('');
                    setFiltroArea('TODAS');
                    setFiltroStatus('TODOS');
                  }}
                  className="font-bold text-navy hover:underline dark:text-sky-400 cursor-pointer"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {agendamentosFiltrados.length === 0 ? (
              <EmptyState
                titulo={temFiltroAgendamento ? 'Nenhum agendamento encontrado' : `Nenhuma reserva em ${rotuloMesAtual}`}
                descricao={
                  temFiltroAgendamento
                    ? 'Nenhum resultado corresponde à pesquisa, área ou status selecionado.'
                    : `Não foram registrados agendamentos para ${rotuloMesAtual}.`
                }
                acao={
                  temFiltroAgendamento ? (
                    <Botao
                      variante="secundario"
                      tamanho="sm"
                      onClick={() => {
                        setBuscaAgendamento('');
                        setFiltroArea('TODAS');
                        setFiltroStatus('TODOS');
                      }}
                    >
                      Redefinir Filtros
                    </Botao>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {agendamentosPaginados.map((r, i) => (
                    <div key={r.id_reserva || i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-navy dark:bg-slate-800 dark:text-sky-400 border border-slate-200 dark:border-slate-700">
                          {r.nome.charAt(0)}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {r.nome}
                            </p>
                            {r.unidade && (
                              <span className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {r.unidade}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            {r.area}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <Badge
                          tipo={
                            r.status === 'ATIVA'
                              ? 'sucesso'
                              : r.status === 'CANCELADA'
                              ? 'perigo'
                              : 'neutro'
                          }
                        >
                          {r.status}
                        </Badge>
                        <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {new Date(r.data_hora_inicio).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Paginacao
                  paginaAtual={paginaAgendamentos}
                  totalPaginas={totalPaginasAgendamentos}
                  totalRegistros={agendamentosFiltrados.length}
                  itensPorPagina={ITENS_POR_PAGINA}
                  onMudarPagina={setPaginaAgendamentos}
                />
              </div>
            )}
          </div>
        )}
      </Cartao>

      {/* ========================================================= */}
      {/* 5. ATALHOS RÁPIDOS DE GESTÃO (RODAPÉ DO PAINEL)           */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-[#e2e6ec] bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0b1830]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-xs dark:bg-sky-500 dark:text-slate-950">
              <Icone nome="shield" className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Atalhos Rápidos de Gestão
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse diretamente as operações do dia a dia do condomínio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/sindico/avisos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="megaphone" className="h-3.5 w-3.5 text-sky-500" />
              Publicar Aviso
            </Link>

            <Link
              to="/sindico/chamados"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="wrench" className="h-3.5 w-3.5 text-amber-500" />
              Gestão de Chamados
            </Link>

            <Link
              to="/sindico/pessoas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="users" className="h-3.5 w-3.5 text-emerald-500" />
              Pessoas & Unidades
            </Link>

            <Link
              to="/portaria/painel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="package" className="h-3.5 w-3.5 text-blue-500" />
              Portaria
            </Link>
          </div>
        </div>
      </div>

      <Mensagem
        texto={msg.texto}
        tipo={msg.tipo}
        aoFechar={() => setMsg({ texto: '', tipo: 'ok' })}
      />
    </div>
  );
}
