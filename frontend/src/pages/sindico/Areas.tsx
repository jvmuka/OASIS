import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

type Area = {
  id_area_comum: number; nome: string; capacidade: number; ativo: boolean;
  duracao_slot_min: number; antecedencia_minima_dias: number; antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number; limite_reservas_semana: number;
  imagem_url?: string | null;
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string }[];
};

/** UC09 - CRUD de áreas comuns com as regras configuráveis de reserva. */
export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [editando, setEditando] = useState<Area | null>(null);
  const [form, setForm] = useState({
    nome: '', capacidade: 10, tipo_acesso: 'LIVRE', tipo_uso: 'RESERVAVEL',
    duracao_slot_min: 60, antecedencia_minima_dias: 1, antecedencia_maxima_dias: 30,
    prazo_cancelamento_horas: 24, limite_reservas_semana: 2,
  });
  const fileInputCriar = useRef<HTMLInputElement>(null);
  const fileInputEditar = useRef<HTMLInputElement>(null);

  const carregar = () => api.get<Area[]>('/areas').then(setAreas);
  useEffect(() => { carregar(); }, []);

  const campo = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    try {
      const area = await api.post<Area>('/areas', form);
      // Upload de imagem se selecionado
      const file = fileInputCriar.current?.files?.[0];
      if (file) {
        await api.upload(`/areas/${area.id_area_comum}/imagem`, 'imagem', file);
      }
      setMsg({ t: `Área "${form.nome}" cadastrada.`, tipo: 'ok' });
      setForm({ ...form, nome: '' });
      if (fileInputCriar.current) fileInputCriar.current.value = '';
      carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  async function alternarAtivo(a: Area) {
    try { await api.put(`/areas/${a.id_area_comum}`, { ativo: !a.ativo }); carregar(); }
    catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  function abrirEdicao(a: Area) {
    setEditando({ ...a });
  }

  function campoEdicao(k: keyof Area) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setEditando(prev => prev ? { ...prev, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value } : null);
  }

  async function salvarEdicao() {
    if (!editando) return;
    try {
      await api.put(`/areas/${editando.id_area_comum}`, {
        nome: editando.nome,
        capacidade: editando.capacidade,
        duracao_slot_min: editando.duracao_slot_min,
        antecedencia_minima_dias: editando.antecedencia_minima_dias,
        antecedencia_maxima_dias: editando.antecedencia_maxima_dias,
        prazo_cancelamento_horas: editando.prazo_cancelamento_horas,
        limite_reservas_semana: editando.limite_reservas_semana,
      });
      // Upload de nova imagem se selecionado
      const file = fileInputEditar.current?.files?.[0];
      if (file) {
        await api.upload(`/areas/${editando.id_area_comum}/imagem`, 'imagem', file);
      }
      setMsg({ t: `Área "${editando.nome}" atualizada.`, tipo: 'ok' });
      setEditando(null);
      carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  return (
    <div>
      <Titulo sub="Cadastro das áreas e das regras de reserva">Áreas Comuns</Titulo>
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Tabela de áreas */}
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
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {a.imagem_url ? (
                        <img src={a.imagem_url} alt={a.nome}
                          className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">—</div>
                      )}
                      <span className="font-semibold text-navy">{a.nome}</span>
                    </div>
                  </td>
                  <td>{a.capacidade}</td>
                  <td>{a.duracao_slot_min} min</td>
                  <td>{a.antecedencia_minima_dias}–{a.antecedencia_maxima_dias}d</td>
                  <td>
                    <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                      (a.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                      {a.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="space-x-2 text-right">
                    <button className="text-xs text-navy underline" onClick={() => abrirEdicao(a)}>
                      Editar
                    </button>
                    <button className="text-xs text-navy underline" onClick={() => alternarAtivo(a)}>
                      {a.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>

        {/* Formulario de nova area */}
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
            <Campo rotulo="Imagem da área">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                ref={fileInputCriar}
                className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy hover:file:bg-navy/20" />
            </Campo>
            <Botao className="w-full">Cadastrar área</Botao>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Lembre-se de cadastrar os horários de funcionamento (via API /areas/:id/horarios)
            para que a área apareça com slots na tela de reserva.
          </p>
        </Cartao>
      </div>

      {/* Modal de edicao */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-navy">
              Editar — {editando.nome}
            </h3>
            <div className="space-y-3">
              <Campo rotulo="Nome">
                <input className={inputCls} value={editando.nome} onChange={campoEdicao('nome')} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Capacidade">
                  <input type="number" min={1} className={inputCls}
                    value={editando.capacidade} onChange={campoEdicao('capacidade')} />
                </Campo>
                <Campo rotulo="Duração slot (min)">
                  <input type="number" min={15} className={inputCls}
                    value={editando.duracao_slot_min} onChange={campoEdicao('duracao_slot_min')} />
                </Campo>
                <Campo rotulo="Antecedência mín. (dias)">
                  <input type="number" min={0} className={inputCls}
                    value={editando.antecedencia_minima_dias} onChange={campoEdicao('antecedencia_minima_dias')} />
                </Campo>
                <Campo rotulo="Antecedência máx. (dias)">
                  <input type="number" min={0} className={inputCls}
                    value={editando.antecedencia_maxima_dias} onChange={campoEdicao('antecedencia_maxima_dias')} />
                </Campo>
                <Campo rotulo="Prazo cancel. (horas)">
                  <input type="number" min={0} className={inputCls}
                    value={editando.prazo_cancelamento_horas} onChange={campoEdicao('prazo_cancelamento_horas')} />
                </Campo>
                <Campo rotulo="Limite/semana">
                  <input type="number" min={1} className={inputCls}
                    value={editando.limite_reservas_semana} onChange={campoEdicao('limite_reservas_semana')} />
                </Campo>
              </div>
              <Campo rotulo="Alterar imagem">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  ref={fileInputEditar}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-navy/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy hover:file:bg-navy/20" />
              </Campo>
              {editando.imagem_url && (
                <div className="flex items-center gap-2">
                  <img src={editando.imagem_url} alt="Imagem atual" className="h-16 w-16 rounded-lg object-cover" />
                  <span className="text-xs text-slate-400">Imagem atual</span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Botao variante="claro" onClick={() => setEditando(null)}>Cancelar</Botao>
                <Botao onClick={salvarEdicao}>Salvar alterações</Botao>
              </div>
            </div>
          </div>
        </div>
      )}

      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
