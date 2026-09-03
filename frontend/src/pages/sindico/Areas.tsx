import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, Modal, EmptyState, ModalConfirmacao } from '../../components/ui';
import { IMAGEM_MAX_BYTES, IMAGEM_MAX_MB, IMAGEM_TIPOS_ACEITOS, IMAGEM_EXTENSOES_ACEITAS } from '../../constants';

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

type BloqueioArea = {
  id_bloqueio_area: number;
  id_area_comum: number;
  area_nome: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  motivo: 'MANUTENCAO' | 'LIMPEZA' | 'EVENTO' | 'OBRA';
  descricao?: string | null;
  autor_nome: string;
};

/** Opções de horários de 30 em 30 min para seletores refinados */
const HORARIOS_DIA = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00'
];

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

/** Valida tamanho e formato da imagem antes do envio; retorna a mensagem de erro ou null se valida. */
function validarImagem(file: File): string | null {
  if (!IMAGEM_TIPOS_ACEITOS.includes(file.type)) {
    return `Formato de imagem inválido. Aceitos: ${IMAGEM_EXTENSOES_ACEITAS}.`;
  }
  if (file.size > IMAGEM_MAX_BYTES) {
    return `A imagem excede o tamanho máximo permitido (${IMAGEM_MAX_MB} MB).`;
  }
  return null;
}

/** Obtém a data no formato YYYY-MM-DD com fuso brasileiro */
function dataHojeBR(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function dataAmanhaBR(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

function dataProximoSabadoBR(): string {
  const d = new Date();
  const diff = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

/** UC09 - CRUD de áreas comuns e interdições de manutenção (UI/UX Pro Max) */
export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [bloqueios, setBloqueios] = useState<BloqueioArea[]>([]);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [modalBloqueioAberto, setModalBloqueioAberto] = useState(false);
  const [editando, setEditando] = useState<Area | null>(null);
  const [excluindoBloqueio, setExcluindoBloqueio] = useState<BloqueioArea | null>(null);
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

  // Estado avançado para agendamento de manutenção (UI/UX Pro Max)
  const [tipoPeriodo, setTipoPeriodo] = useState<'UNICO' | 'MULTIPLO'>('UNICO');
  const [areaSelecionadaId, setAreaSelecionadaId] = useState('');
  const [motivoSelecionado, setMotivoSelecionado] = useState<'MANUTENCAO' | 'LIMPEZA' | 'OBRA' | 'EVENTO'>('MANUTENCAO');
  const [descricaoBloqueio, setDescricaoBloqueio] = useState('');

  // Período de 1 dia
  const [dataUnica, setDataUnica] = useState(dataHojeBR());
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');
  const [presetHorario, setPresetHorario] = useState<'MANHA' | 'TARDE' | 'NOITE' | 'DIA_TODO' | 'CUSTOM'>('MANHA');

  // Período de múltiplos dias
  const [dataInicioMulti, setDataInicioMulti] = useState(dataHojeBR());
  const [horaInicioMulti, setHoraInicioMulti] = useState('08:00');
  const [dataFimMulti, setDataFimMulti] = useState(dataAmanhaBR());
  const [horaFimMulti, setHoraFimMulti] = useState('18:00');

  const fileInputCriar = useRef<HTMLInputElement>(null);
  const fileInputEditar = useRef<HTMLInputElement>(null);

  const carregarAreas = () => api.get<Area[]>('/areas').then(setAreas);
  const carregarBloqueios = () => api.get<BloqueioArea[]>('/areas/bloqueios').then(setBloqueios);

  useEffect(() => {
    carregarAreas();
    carregarBloqueios();
  }, []);

  function aplicarPreset(p: 'MANHA' | 'TARDE' | 'NOITE' | 'DIA_TODO') {
    setPresetHorario(p);
    if (p === 'MANHA') {
      setHoraInicio('08:00');
      setHoraFim('12:00');
    } else if (p === 'TARDE') {
      setHoraInicio('13:00');
      setHoraFim('18:00');
    } else if (p === 'NOITE') {
      setHoraInicio('18:00');
      setHoraFim('22:00');
    } else if (p === 'DIA_TODO') {
      setHoraInicio('08:00');
      setHoraFim('22:00');
    }
  }

  function abrirModalBloqueio() {
    setAreaSelecionadaId(areas[0]?.id_area_comum ? String(areas[0].id_area_comum) : '');
    setMotivoSelecionado('MANUTENCAO');
    setTipoPeriodo('UNICO');
    setDataUnica(dataHojeBR());
    setHoraInicio('08:00');
    setHoraFim('12:00');
    setPresetHorario('MANHA');
    setDataInicioMulti(dataHojeBR());
    setHoraInicioMulti('08:00');
    setDataFimMulti(dataAmanhaBR());
    setHoraFimMulti('18:00');
    setDescricaoBloqueio('');
    setModalBloqueioAberto(true);
  }

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
      setModalCriarAberto(false);
      carregarAreas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function criarBloqueio(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    let dtIni = '';
    let dtFim = '';

    if (tipoPeriodo === 'UNICO') {
      if (!dataUnica || !horaInicio || !horaFim) {
        setMsg({ t: 'Informe a data, horário de início e término.', tipo: 'erro' });
        setSalvando(false);
        return;
      }
      dtIni = `${dataUnica} ${horaInicio}:00`;
      dtFim = `${dataUnica} ${horaFim}:00`;
    } else {
      dtIni = `${dataInicioMulti} ${horaInicioMulti}:00`;
      dtFim = `${dataFimMulti} ${horaFimMulti}:00`;
    }

    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
    if (dtFim.replace(' ', 'T') <= dtIni.replace(' ', 'T')) {
      setMsg({ t: 'O horário de término deve ser posterior ao horário de início.', tipo: 'erro' });
      setSalvando(false);
      return;
    }
    if (dtFim.replace(' ', 'T') <= agora) {
      setMsg({ t: 'Não é permitido agendar manutenção para datas e horários no passado.', tipo: 'erro' });
      setSalvando(false);
      return;
    }

    try {
      const res = await api.post<any>('/areas/bloqueios', {
        id_area_comum: Number(areaSelecionadaId),
        motivo: motivoSelecionado,
        data_hora_inicio: dtIni,
        data_hora_fim: dtFim,
        descricao: descricaoBloqueio || null,
      });

      if (res.reservas_canceladas > 0) {
        const afetadosStr = res.moradores_afetados
          ?.map((m: any) => `${m.nome}${m.unidade ? ` (Unid. ${m.unidade})` : ''}`)
          .join(', ');
        setMsg({
          t: `Manutenção agendada com sucesso. ${res.reservas_canceladas} reserva(s) conflitante(s) cancelada(s) automaticamente: ${afetadosStr}.`,
          tipo: 'ok',
        });
      } else {
        setMsg({ t: 'Manutenção agendada com sucesso. Horários bloqueados para moradores.', tipo: 'ok' });
      }

      setModalBloqueioAberto(false);
      carregarBloqueios();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarRemocaoBloqueio() {
    if (!excluindoBloqueio) return;
    try {
      await api.delete(`/areas/bloqueios/${excluindoBloqueio.id_bloqueio_area}`);
      setMsg({ t: 'Interdição removida com sucesso. O espaço foi liberado.', tipo: 'ok' });
      setExcluindoBloqueio(null);
      carregarBloqueios();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  async function alternarAtivo(a: Area) {
    try {
      await api.put(`/areas/${a.id_area_comum}`, { ativo: !a.ativo });
      setMsg({ t: `Situação da área "${a.nome}" alterada.`, tipo: 'ok' });
      carregarAreas();
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
      carregarAreas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  const areaSelecionadaObj = areas.find(a => String(a.id_area_comum) === areaSelecionadaId);

  return (
    <div className="space-y-6">
      <Titulo
        sub="Gerenciamento dos espaços coletivos, interdições para manutenção e regras de agendamento."
        icone={<Icone nome="building" className="h-5 w-5" />}
        acao={
          <div className="flex flex-wrap items-center gap-2">
            <Botao
              variante="secundario"
              icone={<Icone nome="wrench" className="h-4 w-4 text-amber-500" />}
              onClick={abrirModalBloqueio}
            >
              Agendar Manutenção
            </Botao>
            <Botao
              variante="primario"
              icone={<Icone nome="plus" className="h-4 w-4" />}
              onClick={() => {
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
                setModalCriarAberto(true);
              }}
            >
              Cadastrar Espaço
            </Botao>
          </div>
        }
      >
        Áreas Comuns & Manutenção
      </Titulo>

      {/* Tabela de Áreas em Largura Total */}
      <Cartao>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Espaços Cadastrados</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total de {areas.length} áreas no condomínio</p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {areas.length} área(s)
          </span>
        </div>

        {areas.length === 0 ? (
          <EmptyState
            titulo="Nenhuma área cadastrada"
            descricao="Clique no botão acima para cadastrar o primeiro espaço coletivo."
            acao={
              <Botao
                variante="primario"
                tamanho="sm"
                icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                onClick={() => setModalCriarAberto(true)}
              >
                Cadastrar Espaço
              </Botao>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-3">Espaço</th>
                  <th className="py-3 px-2">Capacidade</th>
                  <th className="py-3 px-2">Duração</th>
                  <th className="py-3 px-2">Antecedência Mínima</th>
                  <th className="py-3 px-2">Prazo Cancel.</th>
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
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">Máx. {a.limite_reservas_semana}x/semana por unidade</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{a.capacidade} pessoas</td>
                    <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">{formatarDuracao(a.duracao_slot_min)}</td>
                    <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">
                      {formatarHoras(a.antecedencia_minima_horas ?? a.antecedencia_minima_dias * 24)}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">{formatarHoras(a.prazo_cancelamento_horas)}</td>
                    <td className="py-3 px-2">
                      {(() => {
                        const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
                        const emManutencao = bloqueios.some(b => {
                          const bIni = new Date(b.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
                          const bFim = new Date(b.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
                          return b.id_area_comum === a.id_area_comum && bIni <= agora && bFim >= agora;
                        });
                        return (
                          <Badge tipo={!a.ativo ? 'perigo' : emManutencao ? 'aviso' : 'sucesso'}>
                            {!a.ativo ? 'Inativa' : emManutencao ? 'Em Manutenção' : 'Ativa'}
                          </Badge>
                        );
                      })()}
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

      {/* Tabela de Manutenções e Bloqueios Agendados */}
      <Cartao>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Icone nome="wrench" className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              Interdições & Manutenções Agendadas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Períodos em que o agendamento de moradores fica automaticamente bloqueado
            </p>
          </div>
          <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {bloqueios.length} agendamento(s)
          </span>
        </div>

        {bloqueios.length === 0 ? (
          <EmptyState
            icone="check"
            titulo="Nenhum espaço em manutenção ou interditado"
            descricao="Todas as áreas ativas estão liberadas para reserva conforme suas regras usuais."
            acao={
              <Botao
                variante="secundario"
                tamanho="sm"
                icone={<Icone nome="wrench" className="h-3.5 w-3.5 text-amber-500" />}
                onClick={abrirModalBloqueio}
              >
                Agendar Manutenção
              </Botao>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-3">Espaço Interditado</th>
                  <th className="py-3 px-2">Motivo</th>
                  <th className="py-3 px-2">Período de Início</th>
                  <th className="py-3 px-2">Período de Término</th>
                  <th className="py-3 px-2">Descrição / Detalhes</th>
                  <th className="py-3 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bloqueios.map(b => (
                  <tr key={b.id_bloqueio_area} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">
                      {b.area_nome}
                    </td>
                    <td className="py-3 px-2">
                      <Badge
                        tipo={
                          b.motivo === 'MANUTENCAO'
                            ? 'aviso'
                            : b.motivo === 'OBRA'
                            ? 'perigo'
                            : 'info'
                        }
                      >
                        {b.motivo}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(b.data_hora_inicio).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(b.data_hora_fim).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-400">
                      {b.descricao || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setExcluindoBloqueio(b)}
                        className="text-xs font-semibold text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Liberar espaço e remover interdição"
                      >
                        Liberar Área
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Modal de Agendamento de Manutenção (Design System UI/UX Pro Max) */}
      <Modal
        aberto={modalBloqueioAberto}
        fechar={() => setModalBloqueioAberto(false)}
        titulo="Agendar Manutenção / Interdição de Área"
        largura="max-w-xl"
      >
        <form onSubmit={criarBloqueio} className="space-y-5">
          {/* Seleção do Espaço */}
          <Campo rotulo="Espaço a ser Interditado" obrigatorio>
            <select
              className={inputCls}
              value={areaSelecionadaId}
              onChange={e => setAreaSelecionadaId(e.target.value)}
              required
            >
              <option value="">Selecione a área comum...</option>
              {areas.map(a => (
                <option key={a.id_area_comum} value={a.id_area_comum}>
                  {a.nome} (Capacidade: {a.capacidade} pessoas)
                </option>
              ))}
            </select>
          </Campo>

          {/* Seleção de Motivo em Pills Modernas */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Motivo da Interdição <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'MANUTENCAO', rotulo: 'Manutenção', icone: 'wrench' as const },
                { id: 'LIMPEZA', rotulo: 'Limpeza', icone: 'sparkles' as const },
                { id: 'OBRA', rotulo: 'Obras', icone: 'alert' as const },
                { id: 'EVENTO', rotulo: 'Evento', icone: 'calendar' as const },
              ].map(m => {
                const sel = motivoSelecionado === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMotivoSelecionado(m.id as any)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      sel
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-600'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icone nome={m.icone} className="h-3.5 w-3.5" />
                    <span>{m.rotulo}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Tipo de Período (Único Dia vs Múltiplos Dias) */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/50 p-3.5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Icone nome="clock" className="h-3.5 w-3.5 text-navy dark:text-sky-400" />
                Definição do Período
              </span>
              <div className="inline-flex rounded-lg bg-slate-200/80 dark:bg-slate-700/80 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setTipoPeriodo('UNICO')}
                  className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                    tipoPeriodo === 'UNICO'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Mesmo Dia
                </button>
                <button
                  type="button"
                  onClick={() => setTipoPeriodo('MULTIPLO')}
                  className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                    tipoPeriodo === 'MULTIPLO'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Vários Dias
                </button>
              </div>
            </div>

            {/* Configuração de 1 Dia */}
            {tipoPeriodo === 'UNICO' ? (
              <div className="space-y-3.5">
                {/* Data e Atalhos */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Data da Manutenção</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDataUnica(dataHojeBR())}
                        className="text-[11px] font-bold text-navy hover:underline dark:text-sky-400 cursor-pointer"
                      >
                        Hoje
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => setDataUnica(dataAmanhaBR())}
                        className="text-[11px] font-bold text-navy hover:underline dark:text-sky-400 cursor-pointer"
                      >
                        Amanhã
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <button
                        type="button"
                        onClick={() => setDataUnica(dataProximoSabadoBR())}
                        className="text-[11px] font-bold text-navy hover:underline dark:text-sky-400 cursor-pointer"
                      >
                        Sábado
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    min={dataHojeBR()}
                    className={inputCls}
                    value={dataUnica}
                    onChange={e => setDataUnica(e.target.value)}
                    required
                  />
                </div>

                {/* Presets de Horário Rápidos */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Horários Sugeridos
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 text-xs">
                    {[
                      { id: 'MANHA', rotulo: 'Manhã', subtitulo: '08h – 12h' },
                      { id: 'TARDE', rotulo: 'Tarde', subtitulo: '13h – 18h' },
                      { id: 'NOITE', rotulo: 'Noite', subtitulo: '18h – 22h' },
                      { id: 'DIA_TODO', rotulo: 'Dia Todo', subtitulo: '08h – 22h' },
                    ].map(p => {
                      const sel = presetHorario === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => aplicarPreset(p.id as any)}
                          className={`rounded-lg border p-2 text-center transition-all cursor-pointer ${
                            sel
                              ? 'border-navy bg-navy text-white shadow-xs dark:bg-sky-600 dark:border-sky-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <p className="font-bold text-[11px]">{p.rotulo}</p>
                          <p className={`text-[10px] ${sel ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                            {p.subtitulo}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seletores de Horário Início / Fim */}
                <div className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Hora de Início" obrigatorio>
                    <select
                      className={inputCls}
                      value={horaInicio}
                      onChange={e => {
                        setHoraInicio(e.target.value);
                        setPresetHorario('CUSTOM');
                      }}
                      required
                    >
                      {HORARIOS_DIA.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo rotulo="Hora de Término" obrigatorio>
                    <select
                      className={inputCls}
                      value={horaFim}
                      onChange={e => {
                        setHoraFim(e.target.value);
                        setPresetHorario('CUSTOM');
                      }}
                      required
                    >
                      {HORARIOS_DIA.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
              </div>
            ) : (
              /* Configuração de Múltiplos Dias */
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Início da Interdição
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="date"
                        min={dataHojeBR()}
                        className={inputCls + ' col-span-2 text-xs'}
                        value={dataInicioMulti}
                        onChange={e => {
                          setDataInicioMulti(e.target.value);
                          if (dataFimMulti < e.target.value) setDataFimMulti(e.target.value);
                        }}
                        required
                      />
                      <select
                        className={inputCls + ' text-xs px-2'}
                        value={horaInicioMulti}
                        onChange={e => setHoraInicioMulti(e.target.value)}
                        required
                      >
                        {HORARIOS_DIA.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Término da Interdição
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input
                        type="date"
                        min={dataInicioMulti || dataHojeBR()}
                        className={inputCls + ' col-span-2 text-xs'}
                        value={dataFimMulti}
                        onChange={e => setDataFimMulti(e.target.value)}
                        required
                      />
                      <select
                        className={inputCls + ' text-xs px-2'}
                        value={horaFimMulti}
                        onChange={e => setHoraFimMulti(e.target.value)}
                        required
                      >
                        {HORARIOS_DIA.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Campo rotulo="Descrição / Observações (opcional)">
            <textarea
              className={inputCls + ' min-h-20 resize-y'}
              placeholder="Ex.: Manutenção preventiva periódica dos filtros e motores."
              value={descricaoBloqueio}
              onChange={e => setDescricaoBloqueio(e.target.value)}
              maxLength={255}
            />
          </Campo>

          {/* Resumo Visual em Tempo Real */}
          <div className="rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:border-amber-800/80 dark:from-amber-950/40 dark:to-orange-950/20 p-3.5 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-1.5 text-amber-600 dark:text-amber-400 shrink-0">
              <Icone nome="wrench" className="h-4 w-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <p className="font-bold">
                {areaSelecionadaObj?.nome || 'Espaço Selecionado'} • {motivoSelecionado}
              </p>
              <p className="text-amber-900/80 dark:text-amber-300/80">
                {tipoPeriodo === 'UNICO' ? (
                  <>
                    Data: <b>{dataUnica ? new Date(dataUnica + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</b> das{' '}
                    <b>{horaInicio}</b> às <b>{horaFim}</b>
                  </>
                ) : (
                  <>
                    De <b>{dataInicioMulti} {horaInicioMulti}</b> até <b>{dataFimMulti} {horaFimMulti}</b>
                  </>
                )}
              </p>
              <p className="text-[11px] text-amber-800/70 dark:text-amber-400/70 pt-0.5">
                Os horários serão marcados como <b>MANUTENÇÃO</b> e bloqueados para todos os moradores.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Botao type="button" variante="claro" onClick={() => setModalBloqueioAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvando}
              icone={<Icone nome="check" className="h-4 w-4" />}
            >
              Confirmar Interdição
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Liberação de Área */}
      <ModalConfirmacao
        aberto={!!excluindoBloqueio}
        fechar={() => setExcluindoBloqueio(null)}
        confirmar={confirmarRemocaoBloqueio}
        titulo="Liberar Espaço Coletivo"
        mensagem={
          excluindoBloqueio && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Deseja remover a interdição de <b className="text-slate-900 dark:text-slate-100">{excluindoBloqueio.area_nome}</b> agendada para{' '}
                <b>{new Date(excluindoBloqueio.data_hora_inicio).toLocaleString('pt-BR')}</b> até{' '}
                <b>{new Date(excluindoBloqueio.data_hora_fim).toLocaleString('pt-BR')}</b>?
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
                O espaço voltará a ficar disponível para agendamento pelos moradores imediatamente.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Liberar Espaço"
        textoBotaoCancelar="Cancelar"
        variante="sucesso"
        icone="check"
      />

      {/* Modal de Cadastro de Novo Espaço */}
      <Modal
        aberto={modalCriarAberto}
        fechar={() => setModalCriarAberto(false)}
        titulo="Cadastrar Novo Espaço Coletivo"
        largura="max-w-xl"
      >
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
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const erro = validarImagem(file);
                if (erro) {
                  setMsg({ t: erro, tipo: 'erro' });
                  e.target.value = '';
                }
              }}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-50 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-navy dark:file:text-sky-400 hover:file:bg-navy-100 dark:hover:file:bg-slate-700 transition-colors"
            />
          </Campo>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Botao type="button" variante="claro" onClick={() => setModalCriarAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={salvando}>
              Cadastrar Espaço
            </Botao>
          </div>
        </form>
      </Modal>

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
                  value={editando.capacidade === 0 ? '' : editando.capacidade}
                  onChange={e => setEditando({ ...editando, capacidade: parseNum(e.target.value, 1) })}
                />
              </Campo>

              <Campo rotulo="Limite Semanal / Unid.">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={editando.limite_reservas_semana === 0 ? '' : editando.limite_reservas_semana}
                  onChange={e => setEditando({ ...editando, limite_reservas_semana: parseNum(e.target.value, 1) })}
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
                  if (!file) return;
                  const erro = validarImagem(file);
                  if (erro) {
                    setMsg({ t: erro, tipo: 'erro' });
                    e.target.value = '';
                    return;
                  }
                  setPreviewImagem(URL.createObjectURL(file));
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

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
