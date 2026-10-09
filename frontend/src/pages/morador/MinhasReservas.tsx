import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Botao, Cartao, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao, Paginacao } from '../../components/ui';

type Reserva = {
  id_reserva: number;
  area: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  status: string;
  prazo_cancelamento_horas: number;
};

const ITENS_POR_PAGINA = 20;

/** UC04 - Listar e cancelar as reservas do morador logado (UI/UX Pro Max) */
export default function MinhasReservas() {
  const nav = useNavigate();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'FUTURAS' | 'HISTORICO' | 'TODAS'>('FUTURAS');
  const [filtroArea, setFiltroArea] = useState<string>('TODAS');
  const [pagina, setPagina] = useState(1);
  const [cancelando, setCancelando] = useState<Reserva | null>(null);
  const [processando, setProcessando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    setCarregando(true);
    api
      .get<Reserva[]>('/reservas/minhas')
      .then(setReservas)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  async function confirmarCancelamento() {
    if (!cancelando) return;
    setProcessando(true);
    try {
      await api.patch(`/reservas/${cancelando.id_reserva}/cancelar`, {
        motivo: 'Cancelada pelo morador',
      });
      setMsg({ t: `Reserva para "${cancelando.area}" cancelada com sucesso.`, tipo: 'ok' });
      setCancelando(null);
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setProcessando(false);
    }
  }

  const formatarDataHora = (d: string) =>
    new Date(d).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const obterStatusReserva = (r: Reserva) => {
    const agora = new Date();
    const inicio = new Date(r.data_hora_inicio);
    const fim = new Date(r.data_hora_fim);

    if (r.status === 'CANCELADA') {
      return {
        label: 'CANCELADA',
        tipo: 'perigo' as const,
        isAtivaOuFutura: false,
        podeCancelar: false,
        prazoExpirado: false,
      };
    }

    if (r.status === 'CONCLUIDA' || fim <= agora) {
      return {
        label: 'CONCLUÍDA',
        tipo: 'neutro' as const,
        isAtivaOuFutura: false,
        podeCancelar: false,
        prazoExpirado: false,
      };
    }

    if (inicio <= agora && fim > agora) {
      return {
        label: 'EM ANDAMENTO',
        tipo: 'aviso' as const,
        isAtivaOuFutura: true,
        podeCancelar: false,
        prazoExpirado: false,
      };
    }

    const limiteCancelamento = new Date(inicio.getTime() - (r.prazo_cancelamento_horas || 0) * 3600 * 1000);
    const dentroDoPrazo = agora <= limiteCancelamento;

    return {
      label: 'ATIVA',
      tipo: 'sucesso' as const,
      isAtivaOuFutura: true,
      podeCancelar: dentroDoPrazo,
      prazoExpirado: !dentroDoPrazo,
    };
  };

  // Áreas comuns disponíveis para filtro
  const areasDisponiveis = Array.from(new Set(reservas.map(r => r.area))).filter(Boolean).sort();

  // Contadores para os botões de filtro
  const totalFuturas = reservas.filter(r => obterStatusReserva(r).isAtivaOuFutura).length;
  const totalHistorico = reservas.filter(r => !obterStatusReserva(r).isAtivaOuFutura).length;
  const totalGeral = reservas.length;

  // Filtragem e ordenação inteligente
  const reservasFiltradas = reservas
    .filter(r => {
      const st = obterStatusReserva(r);
      if (filtroStatus === 'FUTURAS') return st.isAtivaOuFutura;
      if (filtroStatus === 'HISTORICO') return !st.isAtivaOuFutura;
      return true;
    })
    .filter(r => {
      if (filtroArea !== 'TODAS') return r.area === filtroArea;
      return true;
    })
    .sort((a, b) => {
      const stA = obterStatusReserva(a);
      const stB = obterStatusReserva(b);

      // 1. Futuras / Ativas primeiro quando em visualização 'TODAS'
      if (stA.isAtivaOuFutura !== stB.isAtivaOuFutura) {
        return stA.isAtivaOuFutura ? -1 : 1;
      }

      // 2. Se ambas são futuras, ordenar cronologicamente crescente (próxima primeiro)
      if (stA.isAtivaOuFutura && stB.isAtivaOuFutura) {
        return new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime();
      }

      // 3. Se ambas são histórico/concluídas, ordenar decrescente (mais recente primeiro)
      return new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime();
    });

  const totalPaginas = Math.ceil(reservasFiltradas.length / ITENS_POR_PAGINA) || 1;
  const reservasPaginadas = reservasFiltradas.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );

  const mudarFiltroStatus = (f: 'FUTURAS' | 'HISTORICO' | 'TODAS') => {
    setFiltroStatus(f);
    setPagina(1);
  };

  const mudarFiltroArea = (area: string) => {
    setFiltroArea(area);
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <Titulo
        sub="Acompanhe o status dos seus agendamentos e gerencie cancelamentos."
        icone={<Icone nome="clock" className="h-5 w-5" />}
        acao={
          <Botao
            icone={<Icone nome="plus" className="h-4 w-4" />}
            onClick={() => nav('/morador/reservar')}
          >
            Fazer Nova Reserva
          </Botao>
        }
      >
        Minhas Reservas
      </Titulo>

      {/* Barra de Filtros: Status e Área Comum */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Abas de Status com contadores */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => mudarFiltroStatus('FUTURAS')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'FUTURAS'
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Futuras / Ativas</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filtroStatus === 'FUTURAS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {totalFuturas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => mudarFiltroStatus('HISTORICO')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'HISTORICO'
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Histórico / Concluídas</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filtroStatus === 'HISTORICO'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {totalHistorico}
            </span>
          </button>

          <button
            type="button"
            onClick={() => mudarFiltroStatus('TODAS')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'TODAS'
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Todas</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                filtroStatus === 'TODAS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {totalGeral}
            </span>
          </button>
        </div>

        {/* Filtro por Área Comum */}
        {areasDisponiveis.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="filtro-area" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Área:
            </label>
            <select
              id="filtro-area"
              value={filtroArea}
              onChange={e => mudarFiltroArea(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-500/20 cursor-pointer"
            >
              <option value="TODAS">Todas as áreas</option>
              {areasDisponiveis.map(area => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Cartao>
        {carregando ? (
          <div className="flex h-40 items-center justify-center text-xs text-slate-400">
            <Icone nome="clock" className="mr-2 h-4 w-4 animate-spin text-navy dark:text-sky-400" />
            Carregando suas reservas...
          </div>
        ) : reservasFiltradas.length === 0 ? (
          <EmptyState
            icone="calendar"
            titulo="Nenhuma reserva encontrada"
            descricao={
              filtroArea !== 'TODAS'
                ? `Você não possui reservas para a área "${filtroArea}" no filtro selecionado.`
                : filtroStatus === 'FUTURAS'
                ? 'Você não possui reservas futuras ativas no momento.'
                : 'Você ainda não realizou agendamentos de áreas comuns.'
            }
            acao={
              <Botao
                tamanho="sm"
                icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                onClick={() => nav('/morador/reservar')}
              >
                Agendar Espaço
              </Botao>
            }
          />
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reservasPaginadas.map(r => {
                const st = obterStatusReserva(r);
                return (
                  <div
                    key={r.id_reserva}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400 font-bold">
                        <Icone nome="calendar" className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{r.area}</h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {formatarDataHora(r.data_hora_inicio)} até {formatarDataHora(r.data_hora_fim)}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Capacidade reservada: {r.numero_pessoas} pessoa(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center self-end">
                      <Badge tipo={st.tipo}>
                        {st.label}
                      </Badge>

                      {st.podeCancelar && (
                        <Botao
                          variante="perigo"
                          tamanho="sm"
                          icone={<Icone nome="trash" className="h-3.5 w-3.5" />}
                          onClick={() => setCancelando(r)}
                        >
                          Cancelar
                        </Botao>
                      )}

                      {st.prazoExpirado && (
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
                          Prazo de cancelamento expirado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Paginacao
              paginaAtual={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={reservasFiltradas.length}
              itensPorPagina={ITENS_POR_PAGINA}
              onMudarPagina={setPagina}
            />
          </div>
        )}
      </Cartao>

      {/* Modal de Confirmação de Cancelamento */}
      <ModalConfirmacao
        aberto={!!cancelando}
        fechar={() => setCancelando(null)}
        confirmar={confirmarCancelamento}
        titulo="Confirmar Cancelamento de Reserva"
        mensagem={
          cancelando && (
            <div className="space-y-3 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza de que deseja cancelar sua reserva do espaço <b className="text-slate-900 dark:text-slate-100">{cancelando.area}</b> agendada para{' '}
                <b>{formatarDataHora(cancelando.data_hora_inicio)}</b>?
              </p>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-300">
                <p className="font-bold flex items-center gap-1.5">
                  <Icone nome="alert" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  Regra de Cancelamento:
                </p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-400 text-[11px]">
                  Cancelamentos só são permitidos com pelo menos {cancelando.prazo_cancelamento_horas}h de antecedência.
                </p>
              </div>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Cancelar Reserva"
        textoBotaoCancelar="Voltar"
        variante="perigo"
        icone="trash"
        carregando={processando}
      />

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
