import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { Botao, Cartao, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao } from '../../components/ui';

type Reserva = {
  id_reserva: number;
  area: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  numero_pessoas: number;
  status: string;
  prazo_cancelamento_horas: number;
};

/** UC04 - Listar e cancelar as reservas do morador logado (UI/UX Pro Max) */
export default function MinhasReservas() {
  const nav = useNavigate();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'TODAS' | 'ATIVAS' | 'HISTORICO'>('TODAS');
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

  const reservasFiltradas = reservas.filter(r => {
    if (filtro === 'ATIVAS') return r.status === 'ATIVA';
    if (filtro === 'HISTORICO') return r.status !== 'ATIVA';
    return true;
  });

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

      {/* Filtros rápidos */}
      <div className="flex gap-2">
        {(['TODAS', 'ATIVAS', 'HISTORICO'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtro === f
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            {f === 'TODAS' ? 'Todas' : f === 'ATIVAS' ? 'Ativas / Futuras' : 'Histórico'}
          </button>
        ))}
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
              filtro === 'ATIVAS'
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
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {reservasFiltradas.map(r => (
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

                  {r.status === 'ATIVA' && (
                    <Botao
                      variante="perigo"
                      tamanho="sm"
                      icone={<Icone nome="trash" className="h-3.5 w-3.5" />}
                      onClick={() => setCancelando(r)}
                    >
                      Cancelar
                    </Botao>
                  )}
                </div>
              </div>
            ))}
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
