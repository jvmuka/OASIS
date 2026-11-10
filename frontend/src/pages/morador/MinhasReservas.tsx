import { useSync } from '../../hooks/useSync';
import { useEffect, useRef, useState } from 'react';
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

const ITENS_POR_PAGINA = 8;

/** UC04 - Listar e cancelar as reservas do morador logado (UI/UX Pro Max) */
export default function MinhasReservas() {
  const nav = useNavigate();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'FUTURAS' | 'HISTORICO' | 'TODAS'>('FUTURAS');
  const [filtroArea, setFiltroArea] = useState<string>('TODAS');
  const [filtroMes, setFiltroMes] = useState<string>('TODOS');
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

  useSync('RESERVAS', () => {
    carregar();
  });

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

  // Meses únicos disponíveis para filtro a partir dos agendamentos
  const mesesDisponiveis = Array.from(
    new Set(
      reservas
        .filter(r => r.data_hora_inicio)
        .map(r => {
          const d = new Date(r.data_hora_inicio);
          const ano = d.getFullYear();
          const mes = String(d.getMonth() + 1).padStart(2, '0');
          return `${ano}-${mes}`;
        })
    )
  ).sort().reverse();

  const formatarMesRotulo = (chave: string) => {
    const [ano, mes] = chave.split('-');
    const MESES: Record<string, string> = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro',
    };
    return `${MESES[mes] || mes}/${ano}`;
  };

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
    .filter(r => {
      if (filtroMes !== 'TODOS') {
        const d = new Date(r.data_hora_inicio);
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}` === filtroMes;
      }
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
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const reservasPaginadas = reservasFiltradas.slice(
    (paginaValida - 1) * ITENS_POR_PAGINA,
    paginaValida * ITENS_POR_PAGINA
  );

  const mudarFiltroStatus = (f: 'FUTURAS' | 'HISTORICO' | 'TODAS') => {
    setFiltroStatus(f);
    setPagina(1);
  };

  const estadoTourRef = useRef({ totalFuturas, totalHistorico });
  estadoTourRef.current = { totalFuturas, totalHistorico };

  useEffect(() => {
    const onTourEtapa = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || (detail.rota !== '/morador/reservas' && detail.rota !== 'minhas-reservas')) return;

      const { totalFuturas: fut, totalHistorico: hist } = estadoTourRef.current;
      if (detail.passo === 1 || detail.passo === 2) {
        setFiltroArea('TODAS');
        setFiltroMes('TODOS');
        mudarFiltroStatus(fut > 0 ? 'FUTURAS' : 'TODAS');
      } else if (detail.passo === 3) {
        setFiltroArea('TODAS');
        setFiltroMes('TODOS');
        mudarFiltroStatus(hist > 0 ? 'HISTORICO' : 'TODAS');
      }
    };

    window.addEventListener('oasis:tour-etapa', onTourEtapa);
    return () => window.removeEventListener('oasis:tour-etapa', onTourEtapa);
  }, []);

  const mudarFiltroArea = (area: string) => {
    setFiltroArea(area);
    setPagina(1);
  };

  const mudarFiltroMes = (mes: string) => {
    setFiltroMes(mes);
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <Titulo ajudaKey="/morador/reservas"
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
        <div id="tour-minhas-reservas-ativas" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => mudarFiltroStatus('FUTURAS')}
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtroStatus === 'FUTURAS'
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Futuras / Ativas</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Histórico / Concluídas</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
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
                : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <span>Todas</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                filtroStatus === 'TODAS'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {totalGeral}
            </span>
          </button>
        </div>

        {/* Filtros por Mês e por Área Comum */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por Mês */}
          {mesesDisponiveis.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="filtro-mes" className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Mês:
              </label>
              <select
                id="filtro-mes"
                value={filtroMes}
                onChange={e => mudarFiltroMes(e.target.value)}
                className="rounded-xl border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 dark:border-slate-800 dark:bg-[#0e1525] dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-500/20 cursor-pointer"
              >
                <option value="TODOS">Todos os meses</option>
                {mesesDisponiveis.map(m => (
                  <option key={m} value={m}>
                    {formatarMesRotulo(m)}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                className="rounded-xl border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 dark:border-slate-800 dark:bg-[#0e1525] dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-500/20 cursor-pointer"
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

          {(filtroMes !== 'TODOS' || filtroArea !== 'TODAS') && (
            <button
              type="button"
              onClick={() => {
                setFiltroMes('TODOS');
                setFiltroArea('TODAS');
                setPagina(1);
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>
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
              filtroMes !== 'TODOS'
                ? `Você não possui reservas para o mês selecionado (${formatarMesRotulo(filtroMes)}).`
                : filtroArea !== 'TODAS'
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
            <div id="tour-minhas-reservas-historico" className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          id="tour-minhas-reservas-cancelar"
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
              paginaAtual={paginaValida}
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
