import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

type Area = {
  id_area_comum: number; nome: string; capacidade: number; ativo: boolean;
  duracao_slot_min: number; antecedencia_minima_dias: number; antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number; limite_reservas_semana: number;
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string }[];
};

/** UC09 - CRUD de áreas comuns com as regras configuráveis de reserva. */
export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [form, setForm] = useState({
    nome: '', capacidade: 10, tipo_acesso: 'LIVRE', tipo_uso: 'RESERVAVEL',
    duracao_slot_min: 60, antecedencia_minima_dias: 1, antecedencia_maxima_dias: 30,
    prazo_cancelamento_horas: 24, limite_reservas_semana: 2,
  });

  const carregar = () => api.get<Area[]>('/areas').then(setAreas);
  useEffect(() => { carregar(); }, []);

  const campo = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/areas', form);
      setMsg({ t: `Área "${form.nome}" cadastrada.`, tipo: 'ok' });
      setForm({ ...form, nome: '' }); carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }
  async function alternarAtivo(a: Area) {
    try { await api.put(`/areas/${a.id_area_comum}`, { ativo: !a.ativo }); carregar(); }
    catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  return (
    <div>
      <Titulo sub="Cadastro das áreas e das regras de reserva">Áreas Comuns</Titulo>
      <div className="grid gap-4 lg:grid-cols-5">
        <Cartao className="lg:col-span-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-400">
                <th className="py-2">Área</th><th>Cap.</th><th>Slot</th><th>Antec.</th><th>Situação</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {areas.map(a => (
                <tr key={a.id_area_comum}>
                  <td className="py-2 font-semibold text-navy">{a.nome}</td>
                  <td>{a.capacidade}</td>
                  <td>{a.duracao_slot_min} min</td>
                  <td>{a.antecedencia_minima_dias}–{a.antecedencia_maxima_dias}d</td>
                  <td>
                    <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                      (a.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                      {a.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="text-xs text-navy underline" onClick={() => alternarAtivo(a)}>
                      {a.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
        <Cartao className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-navy">Nova área</h3>
          <form onSubmit={criar} className="space-y-2">
            <Campo rotulo="Nome"><input className={inputCls} value={form.nome} onChange={campo('nome')} required /></Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo rotulo="Capacidade"><input type="number" min={1} className={inputCls} value={form.capacidade} onChange={campo('capacidade')} /></Campo>
              <Campo rotulo="Slot (min)"><input type="number" min={15} className={inputCls} value={form.duracao_slot_min} onChange={campo('duracao_slot_min')} /></Campo>
              <Campo rotulo="Antec. mín (dias)"><input type="number" min={0} className={inputCls} value={form.antecedencia_minima_dias} onChange={campo('antecedencia_minima_dias')} /></Campo>
              <Campo rotulo="Antec. máx (dias)"><input type="number" min={0} className={inputCls} value={form.antecedencia_maxima_dias} onChange={campo('antecedencia_maxima_dias')} /></Campo>
              <Campo rotulo="Cancel. (horas)"><input type="number" min={0} className={inputCls} value={form.prazo_cancelamento_horas} onChange={campo('prazo_cancelamento_horas')} /></Campo>
              <Campo rotulo="Limite/semana"><input type="number" min={1} className={inputCls} value={form.limite_reservas_semana} onChange={campo('limite_reservas_semana')} /></Campo>
            </div>
            <Botao className="w-full">Cadastrar área</Botao>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Lembre-se de cadastrar os horários de funcionamento (via API /areas/:id/horarios)
            para que a área apareça com slots na tela de reserva.
          </p>
        </Cartao>
      </div>
      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
