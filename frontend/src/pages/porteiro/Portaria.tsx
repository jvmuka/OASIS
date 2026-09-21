import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import {
  Botao, Cartao, Titulo, Icone, Badge, EmptyState, Modal, inputCls, mascararCPF,
} from '../../components/ui';

type OcupacaoItem = {
  id_reserva: number;
  area: string;
  morador: string;
  bloco: string | null;
  apartamento: string | null;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  em_atraso: boolean;
  minutos_restantes: number | null;
  minutos_atraso: number | null;
};

type AgendaItem = {
  id_reserva: number;
  area: string;
  morador: string;
  bloco: string | null;
  apartamento: string | null;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  status?: string;
  situacao: 'AGENDADA' | 'EM_ANDAMENTO' | 'ENCERRADA' | 'CANCELADA';
};

type PessoaBusca = {
  id_pessoa: number;
  nome: string;
  cpf: string;
  celular: string | null;
  bloco: string | null;
  apartamento: string | null;
  tipo_vinculo: string | null;
  em_atividade: boolean;
  atividade_area: string | null;
  atividade_inicio: string | null;
  atividade_fim: string | null;
};

type AtividadeReserva = {
  id_reserva: number;
  area: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  status?: string;
};

type AtividadePessoa = {
  pessoa: { id_pessoa: number; nome: string; cpf: string; celular: string | null; bloco: string | null; apartamento: string | null };
  atividade_agora: AtividadeReserva | null;
  proximas_reservas: AtividadeReserva[];
  historico_90_dias: AtividadeReserva[];
};

const SITUACAO_BADGE: Record<string, { tipo: 'info' | 'sucesso' | 'neutro' | 'perigo'; rotulo: string }> = {
  AGENDADA: { tipo: 'info', rotulo: 'Agendada' },
  EM_ANDAMENTO: { tipo: 'sucesso', rotulo: 'Em andamento' },
  ENCERRADA: { tipo: 'neutro', rotulo: 'Encerrada' },
  CANCELADA: { tipo: 'perigo', rotulo: 'Cancelada' },
};

function hojeSP() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const MESES_ROTULOS: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

function gerarOpcoesMeses() {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtualNum = agora.getMonth() + 1;
  const meses: { valor: string; rotulo: string }[] = [];

  for (let offset = 2; offset >= -6; offset--) {
    const d = new Date(anoAtual, mesAtualNum - 1 + offset, 1);
    const ano = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const chave = `${ano}-${mm}`;
    const rotulo = `${MESES_ROTULOS[mm] || mm}/${ano}`;
    meses.push({ valor: chave, rotulo });
  }
  return meses;
}

function minutosTexto(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function unidadeTexto(bloco: string | null, apartamento: string | null) {
  return bloco ? `Bloco ${bloco}, Apto ${apartamento}` : 'Unidade não vinculada';
}

/** Cartão de uma área ocupada agora, com destaque visual para reservas em atraso. */
function CartaoOcupacao({ item }: { item: OcupacaoItem }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        item.em_atraso
          ? 'border-red-200 bg-red-50/60 dark:border-rose-900/60 dark:bg-rose-950/30'
          : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{item.area}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.morador}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{unidadeTexto(item.bloco, item.apartamento)}</p>
        </div>
        {item.em_atraso ? (
          <Badge tipo="perigo">Em atraso</Badge>
        ) : (
          <Badge tipo="sucesso">Em uso</Badge>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {formatarHora(item.data_hora_inicio)} — {formatarHora(item.data_hora_fim)} · {item.numero_pessoas} pessoa(s)
        </span>
        <span className={`font-bold ${item.em_atraso ? 'text-red-600 dark:text-rose-400' : 'text-navy dark:text-sky-400'}`}>
          {item.em_atraso
            ? `${minutosTexto(item.minutos_atraso || 0)} de atraso`
            : `${minutosTexto(item.minutos_restantes || 0)} restantes`}
        </span>
      </div>
    </div>
  );
}

/** UC02 (visão da portaria): ocupação em tempo real, agenda do dia e consulta de moradores. */
export default function Portaria() {
  const [ocupacao, setOcupacao] = useState<OcupacaoItem[]>([]);
  const [carregandoOcupacao, setCarregandoOcupacao] = useState(true);
  const [erroOcupacao, setErroOcupacao] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const [dataAgenda, setDataAgenda] = useState(hojeSP());
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(true);
  const [erroAgenda, setErroAgenda] = useState('');
  const [buscaAgenda, setBuscaAgenda] = useState('');
  const [filtroAreaAgenda, setFiltroAreaAgenda] = useState('TODAS');
  const [filtroSituacaoAgenda, setFiltroSituacaoAgenda] = useState('TODAS');
  const [filtroMesAgenda, setFiltroMesAgenda] = useState('TODOS');
  const [todasAreas, setTodasAreas] = useState<string[]>([]);
  const opcoesMeses = useRef(gerarOpcoesMeses()).current;

  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PessoaBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaBusca | null>(null);
  const [atividade, setAtividade] = useState<AtividadePessoa | null>(null);
  const [carregandoAtividade, setCarregandoAtividade] = useState(false);
  const [erroAtividade, setErroAtividade] = useState('');

  // Carrega todas as áreas comuns registradas no condomínio para alimentar o filtro
  useEffect(() => {
    api.get<{ id_area_comum: number; nome: string; ativo: boolean }[]>('/areas')
      .then(lista => {
        const nomes = lista.filter(a => a.ativo !== false).map(a => a.nome).sort();
        setTodasAreas(nomes);
      })
      .catch(() => {});
  }, []);

  const carregarOcupacao = () => {
    setCarregandoOcupacao(true);
    setErroOcupacao('');
    api.get<OcupacaoItem[]>('/portaria/ocupacao-agora')
      .then(r => {
        setOcupacao(r);
        setUltimaAtualizacao(new Date());
      })
      .catch(err => setErroOcupacao(err.message || 'Erro ao carregar a ocupação atual.'))
      .finally(() => setCarregandoOcupacao(false));
  };

  useEffect(() => {
    carregarOcupacao();
    const intervalo = setInterval(carregarOcupacao, 60000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarAgenda = (data: string) => {
    setCarregandoAgenda(true);
    setErroAgenda('');
    api.get<{ data: string; reservas: AgendaItem[] }>(`/portaria/agenda?data=${data}`)
      .then(r => setAgenda(r.reservas))
      .catch(err => setErroAgenda(err.message || 'Erro ao carregar a agenda do dia.'))
      .finally(() => setCarregandoAgenda(false));
  };

  useEffect(() => {
    carregarAgenda(dataAgenda);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataAgenda]);

  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    const termo = busca.trim();
    if (!termo) {
      setResultados([]);
      setErroBusca('');
      setBuscando(false);
      return;
    }
    setBuscando(true);
    buscaTimer.current = setTimeout(() => {
      api.get<PessoaBusca[]>(`/portaria/pessoas/busca?q=${encodeURIComponent(termo)}`)
        .then(setResultados)
        .catch(err => setErroBusca(err.message || 'Erro ao buscar moradores.'))
        .finally(() => setBuscando(false));
    }, 350);
    return () => {
      if (buscaTimer.current) clearTimeout(buscaTimer.current);
    };
  }, [busca]);

  function abrirPessoa(p: PessoaBusca) {
    setPessoaSelecionada(p);
    setAtividade(null);
    setErroAtividade('');
    setCarregandoAtividade(true);
    api.get<AtividadePessoa>(`/portaria/pessoas/${p.id_pessoa}/atividade`)
      .then(setAtividade)
      .catch(err => setErroAtividade(err.message || 'Erro ao carregar a atividade da pessoa.'))
      .finally(() => setCarregandoAtividade(false));
  }

  // Exibe apenas reservas atualmente em andamento (desaparece assim que o horário de término chega)
  const ocupacaoAtiva = ocupacao.filter(o => !o.em_atraso && new Date(o.data_hora_fim) > new Date());

  return (
    <div className="space-y-6">
      <Titulo
        sub="Ocupação das áreas comuns, agenda do dia e consulta de moradores para controle de acesso."
        icone={<Icone nome="building" className="h-5 w-5" />}
      >
        Painel da Portaria
      </Titulo>

      {/* Bloco A: Agora no condomínio */}
      <Cartao>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icone nome="clock" className="h-4 w-4 text-navy dark:text-sky-400" />
              Agora no Condomínio
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {ultimaAtualizacao
                ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR')}`
                : 'Carregando...'}
              {' · '}atualiza automaticamente a cada 1 minuto
            </p>
          </div>
          <Botao
            variante="claro"
            tamanho="sm"
            carregando={carregandoOcupacao}
            icone={<Icone nome="chevronRight" className="h-3.5 w-3.5 rotate-90" />}
            onClick={carregarOcupacao}
          >
            Atualizar agora
          </Botao>
        </div>

        {erroOcupacao ? (
          <EmptyState
            icone="alert"
            titulo="Não foi possível carregar a ocupação"
            descricao={erroOcupacao}
            acao={<Botao tamanho="sm" onClick={carregarOcupacao}>Tentar novamente</Botao>}
          />
        ) : carregandoOcupacao && !ultimaAtualizacao ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Carregando ocupação atual...
          </div>
        ) : ocupacaoAtiva.length === 0 ? (
          <EmptyState
            icone="building"
            titulo="Nenhuma área ocupada no momento"
            descricao="Assim que uma reserva ativa começar, ela aparecerá aqui."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ocupacaoAtiva.map(item => (
              <CartaoOcupacao key={item.id_reserva} item={item} />
            ))}
          </div>
        )}
      </Cartao>

      {/* Bloco B: Agenda do dia */}
      <Cartao>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icone nome="calendar" className="h-4 w-4 text-navy dark:text-sky-400" />
              Agenda do Dia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {dataAgenda === 'TODAS'
                ? 'Exibindo reservas de qualquer data em ordem cronológica'
                : dataAgenda.length === 7
                ? `Exibindo reservas do mês de ${opcoesMeses.find(m => m.valor === dataAgenda)?.rotulo || dataAgenda}`
                : 'Reservas do dia selecionado em ordem cronológica'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setDataAgenda(hojeSP());
                setFiltroMesAgenda('TODOS');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                dataAgenda === hojeSP()
                  ? 'bg-navy text-white border-navy dark:bg-sky-600 dark:border-sky-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                const mesAtual = hojeSP().slice(0, 7);
                setDataAgenda(mesAtual);
                setFiltroMesAgenda(mesAtual);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                dataAgenda === hojeSP().slice(0, 7) || (dataAgenda.length === 7 && filtroMesAgenda === dataAgenda)
                  ? 'bg-navy text-white border-navy dark:bg-sky-600 dark:border-sky-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Este Mês
            </button>
            <button
              type="button"
              onClick={() => {
                setDataAgenda('TODAS');
                setFiltroMesAgenda('TODOS');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                dataAgenda === 'TODAS'
                  ? 'bg-navy text-white border-navy dark:bg-sky-600 dark:border-sky-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
              }`}
            >
              Qualquer data
            </button>
            <input
              type="date"
              className={inputCls + ' w-auto text-xs py-1.5'}
              value={dataAgenda.length === 10 ? dataAgenda : ''}
              onChange={e => {
                if (e.target.value) {
                  setDataAgenda(e.target.value);
                  setFiltroMesAgenda(e.target.value.slice(0, 7));
                }
              }}
            />
          </div>
        </div>

        {erroAgenda ? (
          <EmptyState
            icone="alert"
            titulo="Não foi possível carregar a agenda"
            descricao={erroAgenda}
            acao={<Botao tamanho="sm" onClick={() => carregarAgenda(dataAgenda)}>Tentar novamente</Botao>}
          />
        ) : carregandoAgenda ? (
          <div className="flex h-24 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Carregando agenda...
          </div>
        ) : agenda.length === 0 ? (
          <EmptyState
            icone="calendar"
            titulo={
              dataAgenda === 'TODAS'
                ? 'Nenhuma reserva encontrada'
                : dataAgenda.length === 7
                ? 'Nenhuma reserva neste mês'
                : 'Nenhuma reserva neste dia'
            }
            descricao={
              dataAgenda === 'TODAS'
                ? 'Não há reservas registradas no sistema.'
                : dataAgenda.length === 7
                ? 'Não há reservas ativas para o mês selecionado.'
                : 'Não há reservas ativas para a data selecionada.'
            }
          />
        ) : (
          <div>
            {/* Barra de Filtros da Agenda: Busca, Área Comum, Situação/Status e Mês */}
            <div className="mb-4 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={buscaAgenda}
                  onChange={e => setBuscaAgenda(e.target.value)}
                  placeholder="Buscar morador ou apartamento..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-sky-500 transition-colors"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <Icone nome="search" className="h-3.5 w-3.5" />
                </span>
                {buscaAgenda && (
                  <button
                    onClick={() => setBuscaAgenda('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Limpar busca"
                  >
                    <Icone nome="x" className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="relative flex-1 min-w-[150px]">
                <select
                  value={filtroAreaAgenda}
                  onChange={e => setFiltroAreaAgenda(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <option value="TODAS">Todas as áreas comuns</option>
                  {Array.from(new Set([...todasAreas, ...agenda.map(r => r.area)])).filter(Boolean).sort().map(areaNome => (
                    <option key={areaNome} value={areaNome} className="dark:bg-slate-900">
                      {areaNome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 min-w-[150px]">
                <select
                  value={filtroSituacaoAgenda}
                  onChange={e => setFiltroSituacaoAgenda(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <option value="TODAS">Todas as situações / status</option>
                  <option value="EM_ANDAMENTO">Em andamento</option>
                  <option value="AGENDADA">Agendadas</option>
                  <option value="ENCERRADA">Encerradas / Concluídas</option>
                  <option value="CANCELADA">Canceladas</option>
                </select>
              </div>

              {/* Filtro Por Mês */}
              <div className="relative flex-1 min-w-[140px]">
                <select
                  value={filtroMesAgenda}
                  onChange={e => {
                    const novoMes = e.target.value;
                    setFiltroMesAgenda(novoMes);
                    if (novoMes === 'TODOS') {
                      setDataAgenda('TODAS');
                    } else {
                      setDataAgenda(novoMes);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 px-3 text-xs font-medium text-slate-700 focus:border-navy focus:bg-white focus:outline-hidden dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:focus:border-sky-500 transition-colors cursor-pointer"
                >
                  <option value="TODOS">Todos os meses</option>
                  {opcoesMeses.map(m => (
                    <option key={m.valor} value={m.valor} className="dark:bg-slate-900">
                      {m.rotulo}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feedback do filtro */}
            {(buscaAgenda.trim() !== '' || filtroAreaAgenda !== 'TODAS' || filtroSituacaoAgenda !== 'TODAS' || filtroMesAgenda !== 'TODOS') && (
              <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>
                  Exibindo <strong>{
                    agenda.filter(r => {
                      const termo = buscaAgenda.toLowerCase().trim();
                      const matchBusca =
                        !termo ||
                        r.morador.toLowerCase().includes(termo) ||
                        (r.apartamento && r.apartamento.toLowerCase().includes(termo)) ||
                        (r.bloco && r.bloco.toLowerCase().includes(termo));
                      const matchArea = filtroAreaAgenda === 'TODAS' || r.area === filtroAreaAgenda;
                      const matchSituacao =
                        filtroSituacaoAgenda === 'TODAS' ||
                        r.situacao === filtroSituacaoAgenda ||
                        (filtroSituacaoAgenda === 'CANCELADA' && r.status === 'CANCELADA');
                      const matchMes =
                        filtroMesAgenda === 'TODOS' ||
                        r.data_hora_inicio.startsWith(filtroMesAgenda);
                      return matchBusca && matchArea && matchSituacao && matchMes;
                    }).length
                  }</strong> de {agenda.length} agendamentos
                </span>
                <button
                  onClick={() => {
                    setBuscaAgenda('');
                    setFiltroAreaAgenda('TODAS');
                    setFiltroSituacaoAgenda('TODAS');
                    setFiltroMesAgenda('TODOS');
                  }}
                  className="font-bold text-navy hover:underline dark:text-sky-400"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* Lista Filtrada */}
            {(() => {
              const agendaFiltrada = agenda.filter(r => {
                const termo = buscaAgenda.toLowerCase().trim();
                const matchBusca =
                  !termo ||
                  r.morador.toLowerCase().includes(termo) ||
                  (r.apartamento && r.apartamento.toLowerCase().includes(termo)) ||
                  (r.bloco && r.bloco.toLowerCase().includes(termo));
                const matchArea = filtroAreaAgenda === 'TODAS' || r.area === filtroAreaAgenda;
                const matchSituacao =
                  filtroSituacaoAgenda === 'TODAS' ||
                  r.situacao === filtroSituacaoAgenda ||
                  (filtroSituacaoAgenda === 'CANCELADA' && r.status === 'CANCELADA');
                const matchMes =
                  filtroMesAgenda === 'TODOS' ||
                  r.data_hora_inicio.startsWith(filtroMesAgenda);
                return matchBusca && matchArea && matchSituacao && matchMes;
              });

              if (agendaFiltrada.length === 0) {
                return (
                  <EmptyState
                    icone="calendar"
                    titulo="Nenhum agendamento encontrado"
                    descricao="Não foram encontradas reservas com os critérios de busca, área, status ou mês selecionados."
                    acao={
                      <Botao
                        tamanho="sm"
                        variante="secundario"
                        onClick={() => {
                          setBuscaAgenda('');
                          setFiltroAreaAgenda('TODAS');
                          setFiltroSituacaoAgenda('TODAS');
                          setFiltroMesAgenda('TODOS');
                        }}
                      >
                        Redefinir Filtros
                      </Botao>
                    }
                  />
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto pr-1">
                  {agendaFiltrada.map(r => (
                    <div key={r.id_reserva} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {dataAgenda === 'TODAS' || dataAgenda.length === 7 || filtroMesAgenda !== 'TODOS'
                            ? `${formatarDataHora(r.data_hora_inicio)} – ${formatarHora(r.data_hora_fim)} · ${r.area}`
                            : `${formatarHora(r.data_hora_inicio)} – ${formatarHora(r.data_hora_fim)} · ${r.area}`}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {r.morador} · {unidadeTexto(r.bloco, r.apartamento)}
                        </p>
                      </div>
                      <Badge tipo={SITUACAO_BADGE[r.situacao]?.tipo || 'neutro'}>
                        {SITUACAO_BADGE[r.situacao]?.rotulo || r.situacao}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </Cartao>

      {/* Bloco C: Buscar morador */}
      <Cartao>
        <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Icone nome="search" className="h-4 w-4 text-navy dark:text-sky-400" />
            Buscar Morador
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Nome, CPF, bloco ou apartamento</p>
        </div>

        <div className="relative mb-4">
          <input
            className={inputCls + ' pl-9'}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Digite para buscar..."
          />
          <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
            <Icone nome="search" className="h-4 w-4" />
          </span>
        </div>

        {erroBusca ? (
          <EmptyState icone="alert" titulo="Erro na busca" descricao={erroBusca} />
        ) : !busca.trim() ? (
          <EmptyState icone="user" titulo="Digite um nome, CPF, bloco ou apartamento" descricao="Os resultados aparecerão aqui." />
        ) : buscando ? (
          <div className="flex h-20 items-center justify-center text-sm text-slate-500 dark:text-slate-400">Buscando...</div>
        ) : resultados.length === 0 ? (
          <EmptyState icone="user" titulo="Nenhum morador encontrado" descricao="Tente outro termo de busca." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto pr-1">
            {resultados.map(p => (
              <button
                key={p.id_pessoa}
                type="button"
                onClick={() => abrirPessoa(p)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50/60 dark:hover:bg-slate-800/60 rounded-xl px-2 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{p.nome}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {unidadeTexto(p.bloco, p.apartamento)} · CPF {mascararCPF(p.cpf)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {p.em_atividade && <Badge tipo="sucesso">Em atividade</Badge>}
                  <Icone nome="chevronRight" className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Cartao>

      {/* Modal: atividade da pessoa selecionada */}
      <Modal
        aberto={!!pessoaSelecionada}
        fechar={() => setPessoaSelecionada(null)}
        titulo={pessoaSelecionada ? pessoaSelecionada.nome : 'Atividade'}
        rodape={<Botao variante="claro" onClick={() => setPessoaSelecionada(null)}>Fechar</Botao>}
      >
        {carregandoAtividade ? (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Carregando atividade...
          </div>
        ) : erroAtividade ? (
          <EmptyState icone="alert" titulo="Não foi possível carregar" descricao={erroAtividade} />
        ) : atividade ? (
          <div className="space-y-5">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1 border border-slate-100 dark:border-slate-700">
              <p>Unidade: <b>{unidadeTexto(atividade.pessoa.bloco, atividade.pessoa.apartamento)}</b></p>
              <p>CPF: <b>{mascararCPF(atividade.pessoa.cpf)}</b></p>
              {atividade.pessoa.celular && <p>Celular: <b>{atividade.pessoa.celular}</b></p>}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Atividade Agora
              </h4>
              {atividade.atividade_agora ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3 text-sm">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{atividade.atividade_agora.area}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatarHora(atividade.atividade_agora.data_hora_inicio)} – {formatarHora(atividade.atividade_agora.data_hora_fim)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Sem atividade em andamento.</p>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Próximas Reservas
              </h4>
              {atividade.proximas_reservas.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma reserva futura.</p>
              ) : (
                <ul className="space-y-1.5">
                  {atividade.proximas_reservas.map(r => (
                    <li key={r.id_reserva} className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{r.area}</span> · {formatarDataHora(r.data_hora_inicio)}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Histórico (últimos 90 dias)
              </h4>
              {atividade.historico_90_dias.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhum uso registrado no período.</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {atividade.historico_90_dias.map(r => (
                    <li key={r.id_reserva} className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{r.area}</span> · {formatarDataHora(r.data_hora_inicio)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
