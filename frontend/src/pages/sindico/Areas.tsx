import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, Modal, EmptyState } from '../../components/ui';

type Area = {
  id_area_comum: number;
  nome: string;
  capacidade: number;
  ativo: boolean;
  duracao_slot_min: number;
  antecedencia_minima_dias: number;
  antecedencia_minima_horas?: number;
  antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number;
  limite_reservas_semana: number;
  imagem_url?: string | null;
  horarios: { dia_semana: string; hora_inicio: string; hora_fim: string }[];
};

/** Trata digitação de números inteiros eliminando o 0 à esquerda (ex.: '01' -> 1). */
function parseNum(val: string, min = 0, max?: number): number {
  const limpo = val.replace(/^0+(?=\d)/, '');
  if (limpo === '') return 0;
  let n = parseInt(limpo, 10);
  if (isNaN(n)) return 0;
  if (n < min) n = min;
  if (max !== undefined && n > max) n = max;
  return n;
}

/** Formata minutos para exibição amigável em horas e minutos. */
function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Formata horas para exibição amigável em dias e horas. */
function formatarHoras(horasTotal: number): string {
  const d = Math.floor(horasTotal / 24);
  const h = horasTotal % 24;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

/** UC09 - CRUD de áreas comuns com regras configuráveis de reserva (UI/UX Pro Max) */
export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [editando, setEditando] = useState<Area | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    capacidade: 10,
    tipo_acesso: 'LIVRE',
    tipo_uso: 'RESERVAVEL',
    duracao_slot_min: 60,
    antecedencia_minima_horas: 24,
    antecedencia_maxima_dias: 30,
    prazo_cancelamento_horas: 24,
    limite_reservas_semana: 2,
  });

  const fileInputCriar = useRef<HTMLInputElement>(null);
  const fileInputEditar = useRef<HTMLInputElement>(null);

  const carregar = () => api.get<Area[]>('/areas').then(setAreas);
  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const area = await api.post<Area>('/areas', form);
      const file = fileInputCriar.current?.files?.[0];
      if (file) {
        await api.upload(`/areas/${area.id_area_comum}/imagem`, 'imagem', file);
      }
      setMsg({ t: `Área "${form.nome}" cadastrada com sucesso.`, tipo: 'ok' });
      setForm({
        nome: '',
        capacidade: 10,
        tipo_acesso: 'LIVRE',
        tipo_uso: 'RESERVAVEL',
        duracao_slot_min: 60,
        antecedencia_minima_horas: 24,
        antecedencia_maxima_dias: 30,
        prazo_cancelamento_horas: 24,
        limite_reservas_semana: 2,
      });
      if (fileInputCriar.current) fileInputCriar.current.value = '';
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(a: Area) {
    try {
      await api.put(`/areas/${a.id_area_comum}`, { ativo: !a.ativo });
      setMsg({ t: `Situação da área "${a.nome}" alterada.`, tipo: 'ok' });
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  function abrirEdicao(a: Area) {
    const antMinHoras = a.antecedencia_minima_horas ?? (a.antecedencia_minima_dias * 24);
    setEditando({ ...a, antecedencia_minima_horas: antMinHoras });
    setPreviewImagem(a.imagem_url || null);
  }

  async function salvarEdicao() {
    if (!editando) return;
    setSalvando(true);
    try {
      await api.put(`/areas/${editando.id_area_comum}`, {
        nome: editando.nome,
        capacidade: editando.capacidade,
        duracao_slot_min: editando.duracao_slot_min,
        antecedencia_minima_horas: editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24),
        antecedencia_maxima_dias: editando.antecedencia_maxima_dias,
        prazo_cancelamento_horas: editando.prazo_cancelamento_horas,
        limite_reservas_semana: editando.limite_reservas_semana,
      });
      const file = fileInputEditar.current?.files?.[0];
      if (file) {
        await api.upload(`/areas/${editando.id_area_comum}/imagem`, 'imagem', file);
      }
      setMsg({ t: `Área "${editando.nome}" atualizada com sucesso.`, tipo: 'ok' });
      setEditando(null);
      setPreviewImagem(null);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <Titulo
        sub="Gerenciamento dos espaços coletivos, regras de antecedência e parâmetros de reserva."
        icone={<Icone nome="building" className="h-5 w-5" />}
      >
        Áreas Comuns & Regras
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Tabela de Áreas */}
        <div className="lg:col-span-8">
          <Cartao>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Espaços Cadastrados</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de {areas.length} áreas no condomínio</p>
              </div>
            </div>

            {areas.length === 0 ? (
              <EmptyState
                titulo="Nenhuma área cadastrada"
                descricao="Utilize o formulário ao lado para cadastrar o primeiro espaço coletivo."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th className="py-3 px-3">Espaço</th>
                      <th className="py-3 px-2">Cap.</th>
                      <th className="py-3 px-2">Duração</th>
                      <th className="py-3 px-2">Antec. Mín.</th>
                      <th className="py-3 px-2">Cancel.</th>
                      <th className="py-3 px-2">Situação</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {areas.map(a => (
                      <tr key={a.id_area_comum} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {a.imagem_url ? (
                              <img
                                src={a.imagem_url}
                                alt={a.nome}
                                className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                                <Icone nome="image" className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{a.nome}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">Máx. {a.limite_reservas_semana}x/sem</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{a.capacidade} pes.</td>
                        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">{formatarDuracao(a.duracao_slot_min)}</td>
                        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">
                          {formatarHoras(a.antecedencia_minima_horas ?? a.antecedencia_minima_dias * 24)}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">{formatarHoras(a.prazo_cancelamento_horas)}</td>
                        <td className="py-3 px-2">
                          <Badge tipo={a.ativo ? 'sucesso' : 'perigo'}>
                            {a.ativo ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirEdicao(a)}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
                              title="Editar regras e dados"
                            >
                              <Icone nome="edit" className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => alternarAtivo(a)}
                              className={`rounded-lg p-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                                a.ativo
                                  ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                              }`}
                              title={a.ativo ? 'Inativar área' : 'Reativar área'}
                            >
                              {a.ativo ? 'Inativar' : 'Reativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>
        </div>

        {/* Formulário de Cadastro de Nova Área */}
        <div className="lg:col-span-4">
          <Cartao>
            <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="plus" className="h-4 w-4 text-navy dark:text-sky-400" />
                Cadastrar Novo Espaço
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Defina o nome e as regras de agendamento</p>
            </div>

            <form onSubmit={criar} className="space-y-4">
              <Campo rotulo="Nome do Espaço" obrigatorio>
                <input
                  className={inputCls}
                  placeholder="Ex.: Salão de Festas"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Capacidade (Pessoas)" obrigatorio>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    placeholder="1"
                    value={form.capacidade === 0 ? '' : form.capacidade}
                    onChange={e => setForm({ ...form, capacidade: parseNum(e.target.value, 1) })}
                  />
                </Campo>

                <Campo rotulo="Limite Semanal / Unid." obrigatorio>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    placeholder="1"
                    value={form.limite_reservas_semana === 0 ? '' : form.limite_reservas_semana}
                    onChange={e => setForm({ ...form, limite_reservas_semana: parseNum(e.target.value, 1) })}
                  />
                </Campo>
              </div>

              {/* Duração da Reserva */}
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Duração da Reserva <span className="text-red-500">*</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={24}
                      className={inputCls + ' pr-7'}
                      placeholder="0"
                      value={Math.floor(form.duracao_slot_min / 60) === 0 ? '' : Math.floor(form.duracao_slot_min / 60)}
                      onChange={e => {
                        const h = parseNum(e.target.value, 0, 24);
                        const m = form.duracao_slot_min % 60;
                        setForm({ ...form, duracao_slot_min: Math.max(1, h * 60 + m) });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      className={inputCls + ' pr-9'}
                      placeholder="0"
                      value={(form.duracao_slot_min % 60) === 0 ? '' : (form.duracao_slot_min % 60)}
                      onChange={e => {
                        const h = Math.floor(form.duracao_slot_min / 60);
                        const m = parseNum(e.target.value, 0, 59);
                        setForm({ ...form, duracao_slot_min: Math.max(1, h * 60 + m) });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">min</span>
                  </div>
                </div>
              </label>

              {/* Antecedência Mínima */}
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Antecedência Mínima</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      className={inputCls + ' pr-7'}
                      placeholder="0"
                      value={Math.floor(form.antecedencia_minima_horas / 24) === 0 ? '' : Math.floor(form.antecedencia_minima_horas / 24)}
                      onChange={e => {
                        const d = parseNum(e.target.value, 0);
                        const h = form.antecedencia_minima_horas % 24;
                        setForm({ ...form, antecedencia_minima_horas: d * 24 + h });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">d</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className={inputCls + ' pr-7'}
                      placeholder="0"
                      value={(form.antecedencia_minima_horas % 24) === 0 ? '' : (form.antecedencia_minima_horas % 24)}
                      onChange={e => {
                        const d = Math.floor(form.antecedencia_minima_horas / 24);
                        const h = parseNum(e.target.value, 0, 23);
                        setForm({ ...form, antecedencia_minima_horas: d * 24 + h });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                  </div>
                </div>
              </label>

              {/* Prazo de Cancelamento */}
              <label className="block text-sm">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Prazo de Cancelamento</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      className={inputCls + ' pr-7'}
                      placeholder="0"
                      value={Math.floor(form.prazo_cancelamento_horas / 24) === 0 ? '' : Math.floor(form.prazo_cancelamento_horas / 24)}
                      onChange={e => {
                        const d = parseNum(e.target.value, 0);
                        const h = form.prazo_cancelamento_horas % 24;
                        setForm({ ...form, prazo_cancelamento_horas: d * 24 + h });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">d</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      className={inputCls + ' pr-7'}
                      placeholder="0"
                      value={(form.prazo_cancelamento_horas % 24) === 0 ? '' : (form.prazo_cancelamento_horas % 24)}
                      onChange={e => {
                        const d = Math.floor(form.prazo_cancelamento_horas / 24);
                        const h = parseNum(e.target.value, 0, 23);
                        setForm({ ...form, prazo_cancelamento_horas: d * 24 + h });
                      }}
                    />
                    <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                  </div>
                </div>
              </label>

              <Campo rotulo="Antecedência Máxima (Dias)">
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="0"
                  value={form.antecedencia_maxima_dias === 0 ? '' : form.antecedencia_maxima_dias}
                  onChange={e => setForm({ ...form, antecedencia_maxima_dias: parseNum(e.target.value, 0) })}
                />
              </Campo>

              <Campo rotulo="Imagem / Foto da Área">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  ref={fileInputCriar}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy dark:file:text-sky-400 hover:file:bg-navy-100 dark:hover:file:bg-slate-700 transition-colors"
                />
              </Campo>

              <Botao className="w-full py-2.5" carregando={salvando}>
                Salvar Novo Espaço
              </Botao>
            </form>
          </Cartao>
        </div>
      </div>

      {/* Modal de Edição */}
      <Modal
        aberto={!!editando}
        fechar={() => setEditando(null)}
        titulo={`Editar — ${editando?.nome || ''}`}
        largura="max-w-xl"
      >
        {editando && (
          <div className="space-y-4">
            <Campo rotulo="Nome da Área" obrigatorio>
              <input
                className={inputCls}
                value={editando.nome}
                onChange={e => setEditando({ ...editando, nome: e.target.value })}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Capacidade (Pessoas)">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  placeholder="1"
                  value={editando.capacidade === 0 ? '' : editando.capacidade}
                  onChange={e => setEditando({ ...editando, capacidade: parseNum(e.target.value, 1) })}
                />
              </Campo>

              <Campo rotulo="Limite Semanal / Unid.">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  placeholder="1"
                  value={editando.limite_reservas_semana === 0 ? '' : editando.limite_reservas_semana}
                  onChange={e => setEditando({ ...editando, limite_reservas_semana: parseNum(e.target.value, 1) })}
                />
              </Campo>
            </div>

            {/* Duração da Reserva */}
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Duração da Reserva</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    className={inputCls + ' pr-7'}
                    placeholder="0"
                    value={Math.floor(editando.duracao_slot_min / 60) === 0 ? '' : Math.floor(editando.duracao_slot_min / 60)}
                    onChange={e => {
                      const h = parseNum(e.target.value, 0, 24);
                      const m = editando.duracao_slot_min % 60;
                      setEditando({ ...editando, duracao_slot_min: Math.max(1, h * 60 + m) });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    className={inputCls + ' pr-9'}
                    placeholder="0"
                    value={(editando.duracao_slot_min % 60) === 0 ? '' : (editando.duracao_slot_min % 60)}
                    onChange={e => {
                      const h = Math.floor(editando.duracao_slot_min / 60);
                      const m = parseNum(e.target.value, 0, 59);
                      setEditando({ ...editando, duracao_slot_min: Math.max(1, h * 60 + m) });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">min</span>
                </div>
              </div>
            </label>

            {/* Antecedência Mínima */}
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Antecedência Mínima</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className={inputCls + ' pr-7'}
                    placeholder="0"
                    value={Math.floor((editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) / 24) === 0 ? '' : Math.floor((editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) / 24)}
                    onChange={e => {
                      const d = parseNum(e.target.value, 0);
                      const h = (editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) % 24;
                      setEditando({ ...editando, antecedencia_minima_horas: d * 24 + h });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">d</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className={inputCls + ' pr-7'}
                    placeholder="0"
                    value={((editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) % 24) === 0 ? '' : ((editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) % 24)}
                    onChange={e => {
                      const d = Math.floor((editando.antecedencia_minima_horas ?? (editando.antecedencia_minima_dias * 24)) / 24);
                      const h = parseNum(e.target.value, 0, 23);
                      setEditando({ ...editando, antecedencia_minima_horas: d * 24 + h });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                </div>
              </div>
            </label>

            {/* Prazo de Cancelamento */}
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Prazo de Cancelamento</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    className={inputCls + ' pr-7'}
                    placeholder="0"
                    value={Math.floor(editando.prazo_cancelamento_horas / 24) === 0 ? '' : Math.floor(editando.prazo_cancelamento_horas / 24)}
                    onChange={e => {
                      const d = parseNum(e.target.value, 0);
                      const h = editando.prazo_cancelamento_horas % 24;
                      setEditando({ ...editando, prazo_cancelamento_horas: d * 24 + h });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">d</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className={inputCls + ' pr-7'}
                    placeholder="0"
                    value={(editando.prazo_cancelamento_horas % 24) === 0 ? '' : (editando.prazo_cancelamento_horas % 24)}
                    onChange={e => {
                      const d = Math.floor(editando.prazo_cancelamento_horas / 24);
                      const h = parseNum(e.target.value, 0, 23);
                      setEditando({ ...editando, prazo_cancelamento_horas: d * 24 + h });
                    }}
                  />
                  <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">h</span>
                </div>
              </div>
            </label>

            <Campo rotulo="Antecedência Máxima (Dias)">
              <input
                type="number"
                min={0}
                className={inputCls}
                placeholder="0"
                value={editando.antecedencia_maxima_dias === 0 ? '' : editando.antecedencia_maxima_dias}
                onChange={e => setEditando({ ...editando, antecedencia_maxima_dias: parseNum(e.target.value, 0) })}
              />
            </Campo>

            <Campo rotulo="Substituir Imagem">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                ref={fileInputEditar}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setPreviewImagem(URL.createObjectURL(file));
                }}
                className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy dark:file:text-sky-400 hover:file:bg-navy-100 dark:hover:file:bg-slate-700 transition-colors"
              />
            </Campo>

            {previewImagem && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5">
                <img src={previewImagem} alt="Preview" className="h-16 w-24 rounded-lg object-cover" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Pré-visualização da imagem</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Botao variante="claro" onClick={() => setEditando(null)}>
                Cancelar
              </Botao>
              <Botao onClick={salvarEdicao} carregando={salvando}>
                Salvar Alterações
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
