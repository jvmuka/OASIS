import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import {
  Botao, Cartao, Titulo, Icone, Badge, EmptyState, Modal, Campo, Mensagem, inputCls, mascararCPF, mascararCelular,
} from '../../components/ui';
import { hojeSP, formatarHora, formatarDataHora, gerarOpcoesMeses, minutosTexto } from '../../utils/data';
import Pessoas from '../sindico/Pessoas';

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

const SITUACAO_BADGE: Record<string, { tipo: 'info' | 'sucesso' | 'neutro' | 'perigo'; rotulo: string }> = {
  AGENDADA: { tipo: 'info', rotulo: 'Agendada' },
  EM_ANDAMENTO: { tipo: 'sucesso', rotulo: 'Em andamento' },
  ENCERRADA: { tipo: 'neutro', rotulo: 'Encerrada' },
  CANCELADA: { tipo: 'perigo', rotulo: 'Cancelada' },
};

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

  const [versaoPessoas, setVersaoPessoas] = useState(0);

  // Estados para cadastro rápido de Visitante e Prestador de Serviço
  const [modalVisitanteAberto, setModalVisitanteAberto] = useState(false);
  const [unidadesCondominio, setUnidadesCondominio] = useState<{ id_unidade: number; bloco: string; numero_apartamento: string }[]>([]);
  const [salvandoVisitante, setSalvandoVisitante] = useState(false);
  const [erroVisitante, setErroVisitante] = useState<string | null>(null);
  const [msgPortaria, setMsgPortaria] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [formVisitante, setFormVisitante] = useState({
    nome: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    tipo: 'VISITANTE' as 'VISITANTE' | 'PRESTADOR_SERVICO',
    id_unidade: '',
    tipo_servico: '',
  });

  // Carrega todas as áreas comuns registradas no condomínio para alimentar o filtro
  useEffect(() => {
    api.get<{ id_area_comum: number; nome: string; ativo: boolean }[]>('/areas')
      .then(lista => {
        const nomes = lista.filter(a => a.ativo !== false).map(a => a.nome).sort();
        setTodasAreas(nomes);
      })
      .catch(() => {});

    api.get<{ id_unidade: number; bloco: string; numero_apartamento: string }[]>('/cadastros/unidades')
      .then(setUnidadesCondominio)
      .catch(() => {});
  }, []);

  async function salvarVisitante(e: React.FormEvent) {
    e.preventDefault();
    setErroVisitante(null);

    const cpfLimpo = formVisitante.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroVisitante('CPF deve conter 11 dígitos.');
      return;
    }
    if (!formVisitante.nome.trim()) {
      setErroVisitante('Nome é obrigatório.');
      return;
    }
    if (formVisitante.tipo === 'PRESTADOR_SERVICO' && !formVisitante.tipo_servico.trim()) {
      setErroVisitante('Por favor, informe a descrição do tipo de serviço (ex: Eletricista, Encanador, etc.).');
      return;
    }
    if (!formVisitante.data_nascimento) {
      setErroVisitante('Data de nascimento é obrigatória.');
      return;
    }

    setSalvandoVisitante(true);
    try {
      await api.post('/cadastros/pessoas', {
        nome: formVisitante.nome.trim(),
        cpf: cpfLimpo,
        data_nascimento: formVisitante.data_nascimento,
        celular: formVisitante.celular ? formVisitante.celular.replace(/\D/g, '') : undefined,
        perfis: [formVisitante.tipo],
        id_unidade: formVisitante.id_unidade ? Number(formVisitante.id_unidade) : undefined,
        tipo_vinculo: formVisitante.tipo,
        reside: false,
        tipo_servico: formVisitante.tipo === 'PRESTADOR_SERVICO' ? formVisitante.tipo_servico.trim() : undefined,
      });

      setModalVisitanteAberto(false);
      setVersaoPessoas(v => v + 1);
      setFormVisitante({
        nome: '',
        cpf: '',
        data_nascimento: '',
        celular: '',
        tipo: 'VISITANTE',
        id_unidade: '',
        tipo_servico: '',
      });
      setMsgPortaria({
        t: `${formVisitante.tipo === 'VISITANTE' ? 'Visitante' : 'Prestador de Serviço'} cadastrado(a) com sucesso!`,
        tipo: 'ok',
      });
    } catch (err: any) {
      setErroVisitante(err.message || 'Erro ao cadastrar pessoa.');
    } finally {
      setSalvandoVisitante(false);
    }
  }

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


  // Exibe apenas reservas atualmente em andamento (desaparece assim que o horário de término chega)
  const ocupacaoAtiva = ocupacao.filter(o => !o.em_atraso && new Date(o.data_hora_fim) > new Date());

  return (
    <div className="space-y-6">
      <Titulo
        sub="Ocupação das áreas comuns, agenda do dia e consulta de moradores para controle de acesso."
        icone={<Icone nome="building" className="h-5 w-5" />}
        acao={
          <Botao
            variante="primario"
            icone={<Icone nome="plus" className="h-4 w-4" />}
            onClick={() => {
              setErroVisitante(null);
              setModalVisitanteAberto(true);
            }}
          >
            Cadastrar Visitante / Prestador
          </Botao>
        }
      >
        Painel da Portaria
      </Titulo>

      {msgPortaria.t && (
        <Mensagem tipo={msgPortaria.tipo} texto={msgPortaria.t} aoFechar={() => setMsgPortaria({ t: '', tipo: 'ok' })} />
      )}

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
                            ? `${formatarDataHora(r.data_hora_inicio, false)} – ${formatarHora(r.data_hora_fim)} · ${r.area}`
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

      {/* Bloco C: Buscar Morador com tabela e filtros de pessoas da administração */}
      <Pessoas
        key={versaoPessoas}
        apenasConsulta
        embutido
        titulo="Buscar Morador"
        subtitulo="Nome, CPF, bloco ou apartamento"
      />

      {/* Modal: Cadastro de Visitante / Prestador de Serviço */}
      <Modal
        aberto={modalVisitanteAberto}
        fechar={() => { if (!salvandoVisitante) setModalVisitanteAberto(false); }}
        titulo="Cadastrar Visitante / Prestador de Serviço"
      >
        <p className="text-xs text-slate-500 mb-4 -mt-2">
          Cadastro simplificado para controle de acesso na portaria. Não gera usuário nem login no sistema.
        </p>
        <form onSubmit={salvarVisitante} className="space-y-4">
          {erroVisitante && <Mensagem tipo="erro" texto={erroVisitante} />}

          <Campo rotulo="Tipo de Acesso / Papel">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormVisitante(f => ({ ...f, tipo: 'VISITANTE' }))}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  formVisitante.tipo === 'VISITANTE'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                Visitante
              </button>
              <button
                type="button"
                onClick={() => setFormVisitante(f => ({ ...f, tipo: 'PRESTADOR_SERVICO' }))}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  formVisitante.tipo === 'PRESTADOR_SERVICO'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                }`}
              >
                Prestador de Serviço
              </button>
            </div>
          </Campo>

          {formVisitante.tipo === 'PRESTADOR_SERVICO' && (
            <Campo
              rotulo="Descrição do Tipo de Prestador de Serviço"
              obrigatorio
              ajuda="Informe a profissão, especialidade ou tipo de trabalho (ex: Eletricista, Encanador, Pintor, Técnico de Internet, etc.)"
            >
              <input
                type="text"
                required
                maxLength={100}
                placeholder="Ex: Eletricista, Encanador, Pintor, Técnico de Internet..."
                value={formVisitante.tipo_servico}
                onChange={e => setFormVisitante(f => ({ ...f, tipo_servico: e.target.value }))}
                className={inputCls}
              />
            </Campo>
          )}

          <Campo rotulo="Nome Completo" obrigatorio>
            <input
              type="text"
              required
              placeholder="Ex: João da Silva"
              value={formVisitante.nome}
              onChange={e => setFormVisitante(f => ({ ...f, nome: e.target.value }))}
              className={inputCls}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="CPF" obrigatorio>
              <input
                type="text"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                value={formVisitante.cpf}
                onChange={e => setFormVisitante(f => ({ ...f, cpf: mascararCPF(e.target.value) }))}
                className={inputCls}
              />
            </Campo>

            <Campo rotulo="Data de Nascimento" obrigatorio>
              <input
                type="date"
                required
                value={formVisitante.data_nascimento}
                onChange={e => setFormVisitante(f => ({ ...f, data_nascimento: e.target.value }))}
                className={inputCls}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="Celular (opcional)">
              <input
                type="text"
                maxLength={15}
                placeholder="(00) 00000-0000"
                value={formVisitante.celular}
                onChange={e => setFormVisitante(f => ({ ...f, celular: mascararCelular(e.target.value) }))}
                className={inputCls}
              />
            </Campo>

            <Campo rotulo="Unidade Relacionada (opcional)">
              <select
                value={formVisitante.id_unidade}
                onChange={e => setFormVisitante(f => ({ ...f, id_unidade: e.target.value }))}
                className={inputCls}
              >
                <option value="">Nenhuma unidade vinculada</option>
                {unidadesCondominio.map(u => (
                  <option key={u.id_unidade} value={u.id_unidade}>
                    Bloco {u.bloco} - Apto {u.numero_apartamento}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Botao
              type="button"
              variante="claro"
              disabled={salvandoVisitante}
              onClick={() => setModalVisitanteAberto(false)}
            >
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvandoVisitante}
            >
              Salvar Cadastro
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
