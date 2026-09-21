import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { Cartao, Titulo, Icone, Badge, EmptyState, Botao } from '../../components/ui';
import {
  GraficoEvolucaoMensal,
  GraficoDonutStatus,
  GraficoBarrasAreas,
  PontoEvolucao,
  ItemStatusReserva,
  ItemAreaRanking,
} from '../../components/Graficos';

type Painel = {
  mes_selecionado: string;
  meses_disponiveis: { valor: string; rotulo: string }[];
  totais: {
    reservas_mes: number | string;
    encomendas_pendentes: number | string;
    moradores_ativos: number | string;
    chaves_emprestadas: number | string;
    total_unidades: number | string;
  };
  evolucao_mensal: PontoEvolucao[];
  status_reservas: ItemStatusReserva[];
  areas_mais_usadas: ItemAreaRanking[];
  reservas_recentes: {
    id_reserva: number;
    nome: string;
    area: string;
    data_hora_inicio: string;
    data_hora_fim?: string;
    status: string;
    unidade?: string | null;
  }[];
};

/**
 * UC13 - Painel Administrativo Geral do Síndico / Gestor
 * Apresenta indicadores consolidados, gráficos vetoriais nativos (Evolução, Donut e Ranking),
 * seletor de mês para análise temporal, Super Cards operacionais e filtros rápidos de agendamentos.
 */
export default function PainelAdmin() {
  const [d, setD] = useState<Painel | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Filtros de agendamentos
  const [buscaAgendamento, setBuscaAgendamento] = useState('');
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');
  const [todasAreas, setTodasAreas] = useState<string[]>([]);

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
      .get<Painel>(`/relatorios/painel${query}`)
      .then(res => {
        setD(res);
        setMesSelecionado(res.mes_selecionado);
      })
      .catch(err => setErro(err.message || 'Erro ao consultar indicadores.'))
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

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
          <span className="font-medium">Carregando métricas consolidadas do condomínio...</span>
        </div>
      </div>
    );
  }

  if (erro || !d) {
    return (
      <div className="space-y-6">
        <Titulo
          sub="Acompanhe os principais indicadores de operação e uso dos espaços coletivos."
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

  // Obter lista única de todas as áreas comuns cadastradas e presentes no período
  const areasUnicas = Array.from(
    new Set([
      ...todasAreas,
      ...d.areas_mais_usadas.map(a => a.nome),
      ...d.reservas_recentes.map(r => r.area),
    ])
  ).filter(Boolean).sort();

  // Filtragem dos agendamentos
  const agendamentosFiltrados = d.reservas_recentes.filter(r => {
    const termo = buscaAgendamento.toLowerCase().trim();
    const matchBusca =
      !termo ||
      r.nome.toLowerCase().includes(termo) ||
      (r.unidade && r.unidade.toLowerCase().includes(termo));
    const matchArea = filtroArea === 'TODAS' || r.area === filtroArea;
    const matchStatus = filtroStatus === 'TODOS' || r.status === filtroStatus;
    return matchBusca && matchArea && matchStatus;
  });

  const temFiltroAtivo =
    buscaAgendamento.trim() !== '' || filtroArea !== 'TODAS' || filtroStatus !== 'TODOS';

  const kpis = [
    {
      titulo: 'Reservas no Mês',
      valor: d.totais.reservas_mes,
      subtitulo: 'Espaços coletivos agendados',
      link: '/portaria/painel',
      icone: 'calendar' as const,
      tag: 'Agenda',
      gradiente: 'from-blue-600/15 via-sky-500/10 to-transparent',
      borda: 'border-blue-200/80 hover:border-blue-400 dark:border-blue-900/60 dark:hover:border-blue-600',
      iconeBg: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
      tagBadge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300',
    },
    {
      titulo: 'Encomendas na Portaria',
      valor: d.totais.encomendas_pendentes,
      subtitulo: 'Aguardando retirada',
      link: '/portaria/encomendas',
      icone: 'package' as const,
      tag: 'Portaria',
      gradiente: 'from-amber-600/15 via-orange-500/10 to-transparent',
      borda: 'border-amber-200/80 hover:border-amber-400 dark:border-amber-900/60 dark:hover:border-amber-600',
      iconeBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
      tagBadge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
    },
    {
      titulo: 'Moradores Ativos',
      valor: d.totais.moradores_ativos,
      subtitulo: `Em ${d.totais.total_unidades} unidades habitacionais`,
      link: '/sindico/pessoas',
      icone: 'users' as const,
      tag: 'Cadastros',
      gradiente: 'from-emerald-600/15 via-teal-500/10 to-transparent',
      borda: 'border-emerald-200/80 hover:border-emerald-400 dark:border-emerald-900/60 dark:hover:border-emerald-600',
      iconeBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
      tagBadge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
    },
    {
      titulo: 'Chaves em Uso',
      valor: d.totais.chaves_emprestadas,
      subtitulo: 'Áreas técnicas & controle',
      link: '/portaria/chaves',
      icone: 'key' as const,
      tag: 'Controle',
      gradiente: 'from-indigo-600/15 via-purple-500/10 to-transparent',
      borda: 'border-indigo-200/80 hover:border-indigo-400 dark:border-indigo-900/60 dark:hover:border-indigo-600',
      iconeBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
      tagBadge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300',
    },
  ];

  const totalEvolucao = d.evolucao_mensal.reduce((acc, p) => acc + Number(p.total), 0);
  const rotuloMesAtual = d.meses_disponiveis.find(m => m.valor === mesSelecionado)?.rotulo || mesSelecionado;

  return (
    <div className="space-y-7">
      {/* Top Header com Seletor de Mês e Ações Rápidas */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Titulo
            sub="Visão estratégica consolidada, métricas operacionais e fluxo de utilização do condomínio."
            icone={<Icone nome="home" className="h-5 w-5" />}
          >
            Painel Geral do Condomínio
          </Titulo>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor de Mês de Análise */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <Icone nome="calendar" className="h-4 w-4 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:inline">
              Mês:
            </span>
            <select
              value={mesSelecionado}
              onChange={e => {
                const novoMes = e.target.value;
                setMesSelecionado(novoMes);
                carregar(novoMes);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden dark:text-slate-100 cursor-pointer pr-1"
            >
              {d.meses_disponiveis.map(m => (
                <option key={m.valor} value={m.valor} className="dark:bg-slate-900">
                  {m.rotulo}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/sindico/avisos"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-navy dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-all"
          >
            <Icone nome="megaphone" className="h-4 w-4 text-sky-500" />
            <span>Publicar Aviso</span>
          </Link>

          {/* Botão sólido Novo Morador (sem gradiente/fade) */}
          <Link
            to="/sindico/pessoas"
            className="inline-flex items-center gap-2 rounded-xl bg-navy px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-navy/90 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors"
          >
            <Icone nome="plus" className="h-4 w-4" />
            <span>Novo Morador</span>
          </Link>

          <button
            onClick={() => carregar(mesSelecionado)}
            title="Atualizar dados"
            disabled={carregando}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-navy hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${carregando ? 'animate-spin text-navy dark:text-sky-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* 1. Super Cards de Indicadores Operacionais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Link
            key={k.titulo}
            to={k.link}
            className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 ${k.borda}`}
          >
            {/* Gradiente sutil decorativo de fundo */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${k.gradiente} opacity-60 transition-opacity group-hover:opacity-100`}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${k.tagBadge}`}>
                  {k.tag}
                </span>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-2xs transition-transform duration-300 group-hover:scale-110 ${k.iconeBg}`}
                >
                  <Icone nome={k.icone} className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  {k.valor}
                </p>
                <h4 className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                  {k.titulo}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {k.subtitulo}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-navy dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                <span>Acessar detalhes</span>
                <Icone nome="chevronRight" className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 2. Grid de Gráficos Analíticos Principais */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Gráfico de Evolução Mensal (Ocupa 2 colunas) */}
        <div className="lg:col-span-2">
          <Cartao className="p-6">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Icone nome="calendar" className="h-4 w-4 text-navy dark:text-sky-400" />
                  Evolução de Agendamentos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Volume de reservas nos 6 meses até {rotuloMesAtual}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                  Total no período: {totalEvolucao} reservas
                </span>
              </div>
            </div>

            <GraficoEvolucaoMensal dados={d.evolucao_mensal} />
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
                dados={d.status_reservas}
                statusAtivo={filtroStatus}
                onSelectStatus={st => setFiltroStatus(curr => (curr === st ? 'TODOS' : st))}
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              {d.status_reservas.reduce((acc, s) => acc + Number(s.total), 0) > 0
                ? 'Clique em um status para filtrar os agendamentos abaixo'
                : `Sem agendamentos registrados em ${rotuloMesAtual}`}
            </div>
          </Cartao>
        </div>
      </div>

      {/* 3. Grid de Ranking de Áreas e Reservas com Filtros */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Áreas mais utilizadas */}
        <Cartao className="p-6">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="building" className="h-4 w-4 text-navy dark:text-sky-400" />
                Espaços Mais Demandados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranking de reservas em {rotuloMesAtual}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {d.areas_mais_usadas.length} áreas registradas
            </span>
          </div>

          <GraficoBarrasAreas dados={d.areas_mais_usadas} />
        </Cartao>

        {/* Reservas Recentes com Filtros de Morador/Apto, Área e Status */}
        <Cartao className="p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="clock" className="h-4 w-4 text-navy dark:text-sky-400" />
                Agendamentos no Período
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pesquise por morador, apartamento ou filtre por área e status
              </p>
            </div>
            <Link
              to="/portaria/painel"
              className="text-xs font-bold text-navy hover:underline dark:text-sky-400 shrink-0"
            >
              Ver agenda completa
            </Link>
          </div>

          {/* Barra de Filtros: Busca textual + Filtro de Área Comum + Filtro de Status */}
          <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 min-w-[180px]">
              <input
                type="text"
                value={buscaAgendamento}
                onChange={e => setBuscaAgendamento(e.target.value)}
                placeholder="Buscar morador ou apto..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-sky-500 transition-colors"
              />
              <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500 pointer-events-none">
                <Icone nome="search" className="h-3.5 w-3.5" />
              </span>
              {buscaAgendamento && (
                <button
                  onClick={() => setBuscaAgendamento('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpar busca"
                >
                  <Icone nome="x" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="relative flex-1 min-w-[150px]">
              <select
                value={filtroArea}
                onChange={e => setFiltroArea(e.target.value)}
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
                onChange={e => setFiltroStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
              >
                <option value="TODOS">Todos os status</option>
                <option value="ATIVA">Ativas</option>
                <option value="CONCLUIDA">Concluídas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>
          </div>

          {/* Feedback de Resultados dos Filtros */}
          {temFiltroAtivo && (
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>
                Exibindo <strong>{agendamentosFiltrados.length}</strong> de {d.reservas_recentes.length} agendamentos
              </span>
              <button
                onClick={() => {
                  setBuscaAgendamento('');
                  setFiltroArea('TODAS');
                  setFiltroStatus('TODOS');
                }}
                className="font-bold text-navy hover:underline dark:text-sky-400"
              >
                Limpar filtros
              </button>
            </div>
          )}

          {agendamentosFiltrados.length === 0 ? (
            <EmptyState
              titulo={temFiltroAtivo ? 'Nenhum agendamento encontrado' : `Nenhuma reserva em ${rotuloMesAtual}`}
              descricao={
                temFiltroAtivo
                  ? 'Nenhum resultado corresponde à pesquisa, área ou status informado.'
                  : `Não foram registrados agendamentos de áreas comuns para ${rotuloMesAtual}.`
              }
              acao={
                temFiltroAtivo ? (
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[380px] overflow-y-auto pr-1">
              {agendamentosFiltrados.map((r, i) => (
                <div key={r.id_reserva || i} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy/10 to-brand-blue/15 text-xs font-black text-navy dark:from-sky-950 dark:to-cyan-950 dark:text-sky-400 border border-slate-200/50 dark:border-slate-800">
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
          )}
        </Cartao>
      </div>

      {/* 4. Barra de Atalhos Rápidos para o Administrador */}
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
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
                Acesse rapidamente as principais áreas administrativas do condomínio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/sindico/avisos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="megaphone" className="h-3.5 w-3.5 text-sky-500" />
              Mural de Avisos
            </Link>

            <Link
              to="/portaria/painel"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="package" className="h-3.5 w-3.5 text-amber-500" />
              Portaria & Encomendas
            </Link>

            <Link
              to="/sindico/pessoas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="users" className="h-3.5 w-3.5 text-emerald-500" />
              Cadastros & Moradores
            </Link>

            <Link
              to="/sindico/ocorrencias"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <Icone nome="alert" className="h-3.5 w-3.5 text-rose-500" />
              Ocorrências
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


