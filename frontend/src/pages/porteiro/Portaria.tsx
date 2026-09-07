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
  situacao: 'AGENDADA' | 'EM_ANDAMENTO' | 'ENCERRADA';
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

const SITUACAO_BADGE: Record<AgendaItem['situacao'], { tipo: 'info' | 'sucesso' | 'neutro'; rotulo: string }> = {
  AGENDADA: { tipo: 'info', rotulo: 'Agendada' },
  EM_ANDAMENTO: { tipo: 'sucesso', rotulo: 'Em andamento' },
  ENCERRADA: { tipo: 'neutro', rotulo: 'Encerrada' },
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

  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<PessoaBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaBusca | null>(null);
  const [atividade, setAtividade] = useState<AtividadePessoa | null>(null);
  const [carregandoAtividade, setCarregandoAtividade] = useState(false);
  const [erroAtividade, setErroAtividade] = useState('');

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

  const emUso = ocupacao.filter(o => !o.em_atraso);
  const emAtraso = ocupacao.filter(o => o.em_atraso);

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
        ) : ocupacao.length === 0 ? (
          <EmptyState
            icone="building"
            titulo="Nenhuma área ocupada no momento"
            descricao="Assim que uma reserva ativa começar, ela aparecerá aqui."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...emAtraso, ...emUso].map(item => (
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
            <p className="text-xs text-slate-500 dark:text-slate-400">Reservas ativas em ordem cronológica</p>
          </div>
          <input
            type="date"
            className={inputCls + ' w-auto'}
            value={dataAgenda}
            onChange={e => setDataAgenda(e.target.value)}
          />
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
          <EmptyState icone="calendar" titulo="Nenhuma reserva neste dia" descricao="Não há reservas ativas para a data selecionada." />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto pr-1">
            {agenda.map(r => (
              <div key={r.id_reserva} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatarHora(r.data_hora_inicio)} – {formatarHora(r.data_hora_fim)} · {r.area}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {r.morador} · {unidadeTexto(r.bloco, r.apartamento)}
                  </p>
                </div>
                <Badge tipo={SITUACAO_BADGE[r.situacao].tipo}>{SITUACAO_BADGE[r.situacao].rotulo}</Badge>
              </div>
            ))}
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
