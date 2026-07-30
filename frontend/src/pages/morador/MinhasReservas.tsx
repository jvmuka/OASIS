import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Cartao, Mensagem, Titulo } from '../../components/ui';

type Reserva = {
  id_reserva: number; area: string; data_hora_inicio: string; data_hora_fim: string;
  numero_pessoas: number; status: string; prazo_cancelamento_horas: number;
};

/** UC04 - listar e cancelar as reservas do morador logado. */
export default function MinhasReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => api.get<Reserva[]>('/reservas/minhas').then(setReservas);
  useEffect(() => { carregar(); }, []);

  async function cancelar(id: number) {
    if (!confirm('Confirma o cancelamento desta reserva?')) return;
    try {
      await api.patch(`/reservas/${id}/cancelar`, { motivo: 'Cancelada pelo morador' });
      setMsg({ t: 'Reserva cancelada.', tipo: 'ok' }); carregar();
    } catch (e: any) { setMsg({ t: e.message, tipo: 'erro' }); } // RN08 chega aqui
  }

  const f = (d: string) => new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const cor: any = { ATIVA: 'bg-emerald-50 text-emerald-700', CANCELADA: 'bg-red-50 text-red-600', CONCLUIDA: 'bg-slate-100 text-slate-500' };

  return (
    <div>
      <Titulo sub="Acompanhe e cancele suas reservas">Minhas Reservas</Titulo>
      <Cartao>
        {reservas.length === 0 && <p className="text-sm text-slate-500">Você ainda não possui reservas.</p>}
        <ul className="divide-y">
          {reservas.map(r => (
            <li key={r.id_reserva} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold text-navy">{r.area}</p>
                <p className="text-xs text-slate-500">{f(r.data_hora_inicio)} até {f(r.data_hora_fim)} — {r.numero_pessoas} pessoa(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (cor[r.status] || '')}>{r.status}</span>
                {r.status === 'ATIVA' &&
                  <Botao variante="perigo" onClick={() => cancelar(r.id_reserva)}>Cancelar</Botao>}
              </div>
            </li>
          ))}
        </ul>
        <Mensagem texto={msg.t} tipo={msg.tipo} />
      </Cartao>
    </div>
  );
}
