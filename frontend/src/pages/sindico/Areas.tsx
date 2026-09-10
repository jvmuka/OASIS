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
  reserva_por_dia?: boolean;
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

type Dependencias = {
  reservas_total: number;
  reservas_ativas_futuras: number;
  chaves: number;
  bloqueios_area: number;
  bloqueios_perfil: number;
  pode_excluir: boolean;
};

/** Opções de horários de 30 em 30 min cobrindo as 24 horas do dia (meia-noite a meia-noite) */
const HORARIOS_DIA = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  '23:59', '24:00'
];

type DiaSemana = 'DOMINGO' | 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO';

type HorarioForm = {
  dia_semana: DiaSemana;
  ativo: boolean;
  hora_inicio: string;
  hora_fim: string;
};

const DIAS_SEMANA_CONFIG: { dia: DiaSemana; label: string; sigla: string }[] = [
  { dia: 'DOMINGO', label: 'Domingo', sigla: 'Dom' },
  { dia: 'SEGUNDA', label: 'Segunda-feira', sigla: 'Seg' },
  { dia: 'TERCA', label: 'Terça-feira', sigla: 'Ter' },
  { dia: 'QUARTA', label: 'Quarta-feira', sigla: 'Qua' },
  { dia: 'QUINTA', label: 'Quinta-feira', sigla: 'Qui' },
  { dia: 'SEXTA', label: 'Sexta-feira', sigla: 'Sex' },
  { dia: 'SABADO', label: 'Sábado', sigla: 'Sáb' },
];

function criarHorariosPadrao(): HorarioForm[] {
  return DIAS_SEMANA_CONFIG.map(d => ({
    dia_semana: d.dia,
    ativo: true,
    hora_inicio: '08:00',
    hora_fim: '22:00',
  }));
}

function formatarDiasResumo(horarios?: { dia_semana: string }[]): string {
  if (!horarios || horarios.length === 0) return 'Sem horários definidos';
  const diasAtivos = new Set(horarios.map(h => h.dia_semana));
  if (diasAtivos.size === 7) return 'Todos os dias';
  const semana = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const fimDeSemana = ['SABADO', 'DOMINGO'];
  const sexADom = ['SEXTA', 'SABADO', 'DOMINGO'];

  if (semana.every(d => diasAtivos.has(d)) && diasAtivos.size === 5) return 'Seg a Sex';
  if (fimDeSemana.every(d => diasAtivos.has(d)) && diasAtivos.size === 2) return 'Fim de Semana (Sáb e Dom)';
  if (sexADom.every(d => diasAtivos.has(d)) && diasAtivos.size === 3) return 'Sex a Dom';

  const NOMES_CURTOS: Record<string, string> = {
    DOMINGO: 'Dom',
    SEGUNDA: 'Seg',
    TERCA: 'Ter',
    QUARTA: 'Qua',
    QUINTA: 'Qui',
    SEXTA: 'Sex',
    SABADO: 'Sáb',
  };
  const ordem: DiaSemana[] = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  return ordem
    .filter(d => diasAtivos.has(d))
    .map(d => NOMES_CURTOS[d])
    .join(', ');
}

/** Componente interativo para configuração de dias e horários de funcionamento de áreas comuns */
function SeletorHorariosSemana({
  horarios,
  onChange,
  onPreset,
}: {
  horarios: HorarioForm[];
  onChange: (novos: HorarioForm[]) => void;
  onPreset: (tipo: 'TODOS' | 'SEG_SEX' | 'FIM_DE_SEMANA' | 'SEX_DOM' | 'VINTE_QUATRO_HORAS') => void;
}) {
  function alternarDia(dia: DiaSemana) {
    onChange(
      horarios.map(h => (h.dia_semana === dia ? { ...h, ativo: !h.ativo } : h))
    );
  }

  function mudarHora(dia: DiaSemana, campo: 'hora_inicio' | 'hora_fim', val: string) {
    onChange(
      horarios.map(h => (h.dia_semana === dia ? { ...h, [campo]: val } : h))
    );
  }

  function copiarHorarioParaAtivos(base: HorarioForm) {
    onChange(
      horarios.map(h =>
        h.ativo ? { ...h, hora_inicio: base.hora_inicio, hora_fim: base.hora_fim } : h
      )
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Dias e Horários de Funcionamento <span className="text-red-500">*</span>
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Defina em quais dias da semana este espaço pode receber reservas e suas janelas de funcionamento.
          </p>
        </div>
      </div>

      {/* Atalhos Rápidos de Seleção */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 text-xs">
        <button
          type="button"
          onClick={() => onPreset('VINTE_QUATRO_HORAS')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-medium text-slate-700 hover:border-navy hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          <span className="block font-bold text-[11px]">24 Horas</span>
          <span className="text-[10px] text-slate-400">00h às 24h</span>
        </button>
        <button
          type="button"
          onClick={() => onPreset('TODOS')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-medium text-slate-700 hover:border-navy hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          <span className="block font-bold text-[11px]">Todos os Dias</span>
          <span className="text-[10px] text-slate-400">08h às 22h</span>
        </button>
        <button
          type="button"
          onClick={() => onPreset('SEG_SEX')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-medium text-slate-700 hover:border-navy hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          <span className="block font-bold text-[11px]">Seg a Sex</span>
          <span className="text-[10px] text-slate-400">Dias úteis</span>
        </button>
        <button
          type="button"
          onClick={() => onPreset('FIM_DE_SEMANA')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-medium text-slate-700 hover:border-navy hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          <span className="block font-bold text-[11px]">Fim de Semana</span>
          <span className="text-[10px] text-slate-400">Sáb e Dom</span>
        </button>
        <button
          type="button"
          onClick={() => onPreset('SEX_DOM')}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center font-medium text-slate-700 hover:border-navy hover:text-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:text-sky-400 transition-all cursor-pointer shadow-xs"
        >
          <span className="block font-bold text-[11px]">Sex a Dom</span>
          <span className="text-[10px] text-slate-400">Salão de Festas</span>
        </button>
      </div>

      {/* Tabela / Lista dos 7 Dias da Semana */}
      <div className="divide-y divide-slate-200/70 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden">
        {DIAS_SEMANA_CONFIG.map(d => {
          const item = horarios.find(h => h.dia_semana === d.dia) || {
            dia_semana: d.dia,
            ativo: false,
            hora_inicio: '08:00',
            hora_fim: '22:00',
          };
          return (
            <div
              key={d.dia}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 transition-colors gap-2 ${
                item.ativo
                  ? 'bg-white dark:bg-slate-800/80'
                  : 'bg-slate-50/70 text-slate-400 dark:bg-slate-900/40 dark:text-slate-500'
              }`}
            >
              <label className="flex items-center gap-2.5 cursor-pointer select-none sm:w-44">
                <input
                  type="checkbox"
                  checked={item.ativo}
                  onChange={() => alternarDia(d.dia)}
                  className="h-4 w-4 rounded-sm border-slate-300 text-navy focus:ring-navy dark:border-slate-600 dark:bg-slate-700 dark:focus:ring-sky-500 cursor-pointer"
                />
                <span className={`text-xs font-semibold ${item.ativo ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                  {d.label}
                </span>
              </label>

              {item.ativo ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">De:</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-navy focus:ring-1 focus:ring-navy cursor-pointer"
                      value={item.hora_inicio}
                      onChange={e => mudarHora(d.dia, 'hora_inicio', e.target.value)}
                    >
                      {HORARIOS_DIA.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Até:</span>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-navy focus:ring-1 focus:ring-navy cursor-pointer"
                      value={item.hora_fim}
                      onChange={e => mudarHora(d.dia, 'hora_fim', e.target.value)}
                    >
                      {HORARIOS_DIA.map(h => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => copiarHorarioParaAtivos(item)}
                    title="Copiar este horário de abertura e fechamento para todos os dias ativos"
                    className="rounded-md border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-sky-400 transition-colors cursor-pointer text-[10px] font-semibold"
                  >
                    Replicar
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 dark:text-slate-500 italic pr-2">
                  Fechado neste dia
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [horariosCriar, setHorariosCriar] = useState<HorarioForm[]>(criarHorariosPadrao);
  const [horariosEditar, setHorariosEditar] = useState<HorarioForm[]>(criarHorariosPadrao);

  // Ciclo de vida das áreas: inativação (reversível) x exclusão (permanente e condicional)
  const [verificandoAreaId, setVerificandoAreaId] = useState<number | null>(null);
  const [excluirPermitida, setExcluirPermitida] = useState<Area | null>(null);
  const [excluirBloqueada, setExcluirBloqueada] = useState<{ area: Area; dep: Dependencias } | null>(null);
  const [inativarConfirmar, setInativarConfirmar] = useState<{ area: Area; dep: Dependencias } | null>(null);
  const [reativarConfirmar, setReativarConfirmar] = useState<Area | null>(null);
  const [processandoCicloVida, setProcessandoCicloVida] = useState(false);

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
    reserva_por_dia: false,
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

  function aplicarPresetDias(tipo: 'TODOS' | 'SEG_SEX' | 'FIM_DE_SEMANA' | 'SEX_DOM' | 'VINTE_QUATRO_HORAS', modo: 'CRIAR' | 'EDITAR') {
    const fn = modo === 'CRIAR' ? setHorariosCriar : setHorariosEditar;
    fn(prev =>
      prev.map(h => {
        if (tipo === 'VINTE_QUATRO_HORAS') {
          return { ...h, ativo: true, hora_inicio: '00:00', hora_fim: '24:00' };
        }
        if (tipo === 'TODOS') {
          return { ...h, ativo: true, hora_inicio: '08:00', hora_fim: '22:00' };
        }
        if (tipo === 'SEG_SEX') {
          const isSegSex = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'].includes(h.dia_semana);
          return { ...h, ativo: isSegSex, hora_inicio: '08:00', hora_fim: '22:00' };
        }
        if (tipo === 'FIM_DE_SEMANA') {
          const isFim = ['SABADO', 'DOMINGO'].includes(h.dia_semana);
          return { ...h, ativo: isFim, hora_inicio: '08:00', hora_fim: '23:00' };
        }
        if (tipo === 'SEX_DOM') {
          const isSexDom = ['SEXTA', 'SABADO', 'DOMINGO'].includes(h.dia_semana);
          return { ...h, ativo: isSexDom, hora_inicio: '08:00', hora_fim: '23:00' };
        }
        return h;
      })
    );
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
    const diasAtivos = horariosCriar.filter(h => h.ativo);
    if (diasAtivos.length === 0) {
      setMsg({ t: 'Selecione ao menos um dia da semana de funcionamento para o espaço.', tipo: 'erro' });
      return;
    }
    for (const h of diasAtivos) {
      if (h.hora_fim <= h.hora_inicio) {
        setMsg({ t: `O horário de término deve ser após o de início no dia ${h.dia_semana}.`, tipo: 'erro' });
        return;
      }
    }

    setSalvando(true);
    try {
      const payload = {
        ...form,
        horarios: diasAtivos.map(h => ({
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
        })),
      };
      const area = await api.post<Area>('/areas', payload);
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
        reserva_por_dia: false,
      });
      setHorariosCriar(criarHorariosPadrao());
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

  async function executarAlternarAtivo(a: Area) {
    setProcessandoCicloVida(true);
    try {
      await api.put(`/areas/${a.id_area_comum}`, { ativo: !a.ativo });
      setMsg({
        t: a.ativo
          ? `Área "${a.nome}" inativada. Ela deixou de aparecer para os moradores.`
          : `Área "${a.nome}" reativada. Ela voltou a aparecer para os moradores.`,
        tipo: 'ok',
      });
      carregarAreas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setProcessandoCicloVida(false);
    }
  }

  /** Ao clicar em Inativar, busca as dependências apenas para informar quantas reservas futuras existem. */
  async function clicarInativar(a: Area) {
    setVerificandoAreaId(a.id_area_comum);
    try {
      const dep = await api.get<Dependencias>(`/areas/${a.id_area_comum}/dependencias`);
      setInativarConfirmar({ area: a, dep });
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setVerificandoAreaId(null);
    }
  }

  function clicarReativar(a: Area) {
    setReativarConfirmar(a);
  }

  /** Ao clicar em Excluir, consulta as dependências ANTES de decidir qual modal abrir. */
  async function clicarExcluir(a: Area) {
    setVerificandoAreaId(a.id_area_comum);
    try {
      const dep = await api.get<Dependencias>(`/areas/${a.id_area_comum}/dependencias`);
      if (dep.pode_excluir) {
        setExcluirPermitida(a);
      } else {
        setExcluirBloqueada({ area: a, dep });
      }
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setVerificandoAreaId(null);
    }
  }

  async function confirmarExclusao() {
    if (!excluirPermitida) return;
    setProcessandoCicloVida(true);
    try {
      await api.delete(`/areas/${excluirPermitida.id_area_comum}`);
      setMsg({ t: `Área "${excluirPermitida.nome}" excluída permanentemente.`, tipo: 'ok' });
      setExcluirPermitida(null);
      carregarAreas();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setProcessandoCicloVida(false);
    }
  }

  /** Descreve, em linguagem simples, quais registros impedem a exclusão física. */
  function descreverImpedimentos(dep: Dependencias): string[] {
    const itens: string[] = [];
    if (dep.reservas_total > 0) itens.push(`${dep.reservas_total} reserva(s) registrada(s) (ativas, concluídas ou canceladas)`);
    if (dep.chaves > 0) itens.push(`${dep.chaves} chave(s) cadastrada(s) para o espaço`);
    if (dep.bloqueios_area > 0) itens.push(`${dep.bloqueios_area} interdição(ões)/manutenção(ões) registrada(s)`);
    if (dep.bloqueios_perfil > 0) itens.push(`${dep.bloqueios_perfil} bloqueio(s) de morador vinculado(s) à área`);
    return itens;
  }

  function abrirEdicao(a: Area) {
    const antMinHoras = a.antecedencia_minima_horas ?? (a.antecedencia_minima_dias * 24);
    setEditando({
      ...a,
      antecedencia_minima_horas: antMinHoras,
      reserva_por_dia: Boolean(a.reserva_por_dia),
    });
    setPreviewImagem(a.imagem_url || null);

    const horariosCarregados = DIAS_SEMANA_CONFIG.map(d => {
      const encontrado = a.horarios?.find(h => h.dia_semana === d.dia);
      if (encontrado) {
        return {
          dia_semana: d.dia,
          ativo: true,
          hora_inicio: encontrado.hora_inicio.slice(0, 5),
          hora_fim: encontrado.hora_fim.slice(0, 5),
        };
      }
      return {
        dia_semana: d.dia,
        ativo: false,
        hora_inicio: '08:00',
        hora_fim: '22:00',
      };
    });
    setHorariosEditar(horariosCarregados);
  }

  async function salvarEdicao() {
    if (!editando) return;
    const diasAtivos = horariosEditar.filter(h => h.ativo);
    if (diasAtivos.length === 0) {
      setMsg({ t: 'Selecione ao menos um dia da semana de funcionamento para o espaço.', tipo: 'erro' });
      return;
    }
    for (const h of diasAtivos) {
      if (h.hora_fim <= h.hora_inicio) {
        setMsg({ t: `O horário de término deve ser após o de início no dia ${h.dia_semana}.`, tipo: 'erro' });
        return;
      }
    }

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
        reserva_por_dia: Boolean(editando.reserva_por_dia),
        horarios: diasAtivos.map(h => ({
          dia_semana: h.dia_semana,
          hora_inicio: h.hora_inicio,
          hora_fim: h.hora_fim,
        })),
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
  const areasAtivas = areas.filter(a => a.ativo);
  const areasInativas = areas.filter(a => !a.ativo);

  /** Renderiza uma linha da tabela de áreas, compartilhada entre o bloco de ativas e o de inativas. */
  function linhaArea(a: Area) {
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
    const emManutencao = bloqueios.some(b => {
      const bIni = new Date(b.data_hora_inicio).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
      const bFim = new Date(b.data_hora_fim).toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).replace(' ', 'T');
      return b.id_area_comum === a.id_area_comum && bIni <= agora && bFim >= agora;
    });
    const verificando = verificandoAreaId === a.id_area_comum;

    return (
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
        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">
          {a.reserva_por_dia ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
              Dia Inteiro
            </span>
          ) : (
            formatarDuracao(a.duracao_slot_min)
          )}
        </td>
        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">
          {formatarHoras(a.antecedencia_minima_horas ?? a.antecedencia_minima_dias * 24)}
        </td>
        <td className="py-3 px-2 text-xs text-slate-600 dark:text-slate-300">{formatarHoras(a.prazo_cancelamento_horas)}</td>
        <td className="py-3 px-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 text-xs font-semibold">
            <Icone nome="calendar" className="h-3 w-3 text-slate-400 dark:text-slate-500" />
            {formatarDiasResumo(a.horarios)}
          </span>
        </td>
        <td className="py-3 px-2">
          <Badge tipo={!a.ativo ? 'perigo' : emManutencao ? 'aviso' : 'sucesso'}>
            {!a.ativo ? 'Inativa' : emManutencao ? 'Em Manutenção' : 'Ativa'}
          </Badge>
        </td>
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => abrirEdicao(a)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
              title="Editar regras e horários"
            >
              <Icone nome="edit" className="h-4 w-4" />
            </button>
            <button
              onClick={() => (a.ativo ? clicarInativar(a) : clicarReativar(a))}
              disabled={verificando}
              className={`rounded-lg p-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                a.ativo
                  ? 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
              }`}
              title={a.ativo ? 'Inativar área' : 'Reativar área'}
            >
              {a.ativo ? 'Inativar' : 'Reativar'}
            </button>
            <button
              onClick={() => clicarExcluir(a)}
              disabled={verificando}
              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title="Excluir área permanentemente"
            >
              {verificando ? (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Icone nome="trash" className="h-4 w-4" />
              )}
            </button>
          </div>
        </td>
      </tr>
    );
  }

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
                  reserva_por_dia: false,
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

      {/* Explicação da diferença entre inativar e excluir */}
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200/70 bg-sky-50/70 dark:border-sky-900/60 dark:bg-sky-950/30 p-3.5 text-xs text-sky-900 dark:text-sky-200">
        <Icone nome="info" className="h-4 w-4 shrink-0 mt-0.5 text-sky-500 dark:text-sky-400" />
        <p>
          <b>Inativar</b> oculta a área dos moradores e bloqueia novas reservas, mas preserva o histórico — pode ser revertido a qualquer momento.{' '}
          <b>Excluir</b> remove a área permanentemente e só é permitido quando não há reserva, chave ou bloqueio associado a ela.
        </p>
      </div>

      {/* Tabela de Áreas Ativas em Largura Total */}
      <Cartao>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Espaços Cadastrados</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total de {areasAtivas.length} área(s) ativa(s) no condomínio</p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {areasAtivas.length} área(s)
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
        ) : areasAtivas.length === 0 ? (
          <EmptyState
            icone="alert"
            titulo="Nenhuma área ativa"
            descricao="Todas as áreas cadastradas estão inativas no momento. Veja o bloco abaixo."
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
                  <th className="py-3 px-2">Funcionamento</th>
                  <th className="py-3 px-2">Situação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {areasAtivas.map(a => linhaArea(a))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Bloco de Áreas Inativas: esmaecido, deixando claro que os dados foram preservados */}
      {areasInativas.length > 0 && (
        <Cartao className="opacity-70 hover:opacity-100 transition-opacity">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-500 dark:text-slate-400">Áreas Inativas</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Ocultas para os moradores e sem novas reservas, mas com o histórico preservado.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {areasInativas.length} área(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-3 px-3">Espaço</th>
                  <th className="py-3 px-2">Capacidade</th>
                  <th className="py-3 px-2">Duração</th>
                  <th className="py-3 px-2">Antecedência Mínima</th>
                  <th className="py-3 px-2">Prazo Cancel.</th>
                  <th className="py-3 px-2">Funcionamento</th>
                  <th className="py-3 px-2">Situação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {areasInativas.map(a => linhaArea(a))}
              </tbody>
            </table>
          </div>
        </Cartao>
      )}

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
        rodape={
          <>
            <Botao type="button" variante="claro" onClick={() => setModalBloqueioAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              form="form-bloqueio-area"
              variante="primario"
              carregando={salvando}
              icone={<Icone nome="check" className="h-4 w-4" />}
            >
              Confirmar Interdição
            </Botao>
          </>
        }
      >
        <form id="form-bloqueio-area" onSubmit={criarBloqueio} className="space-y-5">
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

      {/* Modal de Confirmação de Exclusão Permanente (quando não há dependências) */}
      <ModalConfirmacao
        aberto={!!excluirPermitida}
        fechar={() => setExcluirPermitida(null)}
        confirmar={confirmarExclusao}
        titulo="Excluir Área Permanentemente"
        mensagem={
          excluirPermitida && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Deseja excluir definitivamente a área <b className="text-slate-900 dark:text-slate-100">{excluirPermitida.nome}</b>?
              </p>
              <p className="text-[11px] text-red-700 dark:text-rose-300 bg-red-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-red-200/60 dark:border-rose-800/60">
                Esta ação é permanente e não pode ser desfeita. Os horários e utensílios cadastrados para este espaço também serão removidos.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Excluir Definitivamente"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="trash"
        carregando={processandoCicloVida}
      />

      {/* Modal de Exclusão Recusada (há dependências): explica o motivo e oferece a inativação */}
      <ModalConfirmacao
        aberto={!!excluirBloqueada}
        fechar={() => setExcluirBloqueada(null)}
        titulo="Não é Possível Excluir esta Área"
        mensagem={
          excluirBloqueada && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                A área <b className="text-slate-900 dark:text-slate-100">{excluirBloqueada.area.nome}</b> já possui histórico no sistema e não pode ser excluída:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                {descreverImpedimentos(excluirBloqueada.dep).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <p className="text-[11px] text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 p-2.5 rounded-lg border border-sky-200/60 dark:border-sky-800/60">
                Use a inativação para remover o espaço da listagem dos moradores sem perder esses registros.
              </p>
            </div>
          )
        }
        variante="perigo"
        icone="alert"
        rodape={
          <>
            <Botao type="button" variante="claro" onClick={() => setExcluirBloqueada(null)}>
              Fechar
            </Botao>
            {excluirBloqueada?.area.ativo && (
              <Botao
                type="button"
                variante="secundario"
                icone={<Icone nome="alert" className="h-4 w-4" />}
                onClick={() => {
                  const { area, dep } = excluirBloqueada;
                  setExcluirBloqueada(null);
                  setInativarConfirmar({ area, dep });
                }}
              >
                Inativar em vez disso
              </Botao>
            )}
          </>
        }
      />

      {/* Modal de Confirmação de Inativação */}
      <ModalConfirmacao
        aberto={!!inativarConfirmar}
        fechar={() => setInativarConfirmar(null)}
        confirmar={() => {
          if (!inativarConfirmar) return;
          const { area } = inativarConfirmar;
          setInativarConfirmar(null);
          executarAlternarAtivo(area);
        }}
        titulo="Inativar Área"
        mensagem={
          inativarConfirmar && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Ao inativar <b className="text-slate-900 dark:text-slate-100">{inativarConfirmar.area.nome}</b>:
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                <li>Ela deixa de aparecer para os moradores na tela de novas reservas.</li>
                <li>Novas reservas para este espaço ficam bloqueadas.</li>
                <li>As reservas existentes e todo o histórico são preservados.</li>
                <li>Ela pode ser reativada a qualquer momento.</li>
              </ul>
              {inativarConfirmar.dep.reservas_ativas_futuras > 0 && (
                <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/60">
                  Atenção: existem {inativarConfirmar.dep.reservas_ativas_futuras} reserva(s) ativa(s) e futura(s) para este espaço. Elas continuarão valendo normalmente.
                </p>
              )}
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Inativar"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="alert"
        carregando={processandoCicloVida}
      />

      {/* Modal de Confirmação de Reativação */}
      <ModalConfirmacao
        aberto={!!reativarConfirmar}
        fechar={() => setReativarConfirmar(null)}
        confirmar={() => {
          if (!reativarConfirmar) return;
          const area = reativarConfirmar;
          setReativarConfirmar(null);
          executarAlternarAtivo(area);
        }}
        titulo="Reativar Área"
        mensagem={
          reativarConfirmar && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              A área <b className="text-slate-900 dark:text-slate-100">{reativarConfirmar.nome}</b> voltará a aparecer para os moradores e poderá receber novas reservas normalmente.
            </p>
          )
        }
        textoBotaoConfirmar="Sim, Reativar"
        textoBotaoCancelar="Cancelar"
        variante="sucesso"
        icone="check"
        carregando={processandoCicloVida}
      />

      {/* Modal de Cadastro de Novo Espaço */}
      <Modal
        aberto={modalCriarAberto}
        fechar={() => setModalCriarAberto(false)}
        titulo="Cadastrar Novo Espaço Coletivo"
        largura="max-w-2xl"
        rodape={
          <>
            <Botao type="button" variante="claro" onClick={() => setModalCriarAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-criar-area" carregando={salvando}>
              Cadastrar Espaço
            </Botao>
          </>
        }
      >
        <form id="form-criar-area" onSubmit={criar} className="space-y-4">
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

          {/* Modalidade de Reserva */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Modalidade de Reserva <span className="text-red-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, reserva_por_dia: false })}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  !form.reserva_por_dia
                    ? 'border-navy bg-navy/5 ring-1 ring-navy dark:border-sky-500 dark:bg-sky-950/30 dark:ring-sky-500'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="modalidade_criar"
                  checked={!form.reserva_por_dia}
                  onChange={() => setForm({ ...form, reserva_por_dia: false })}
                  className="mt-0.5 h-4 w-4 text-navy focus:ring-navy dark:text-sky-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Por Horários / Faixas</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    O morador reserva frações de tempo (ex.: 1h, 2h, 4h).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, reserva_por_dia: true })}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  form.reserva_por_dia
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 dark:border-amber-400 dark:bg-amber-950/30 dark:ring-amber-400'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="modalidade_criar"
                  checked={form.reserva_por_dia}
                  onChange={() => setForm({ ...form, reserva_por_dia: true })}
                  className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 dark:text-amber-400 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Por Dia Inteiro</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Reserva a diária completa conforme o horário de funcionamento do dia.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Duração da Reserva (apenas quando modalidade por horários) */}
          {!form.reserva_por_dia ? (
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
          ) : (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold">Reserva por Diária Ativada</p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                A reserva cobrirá o dia todo automaticamente, iniciando e finalizando exatamente nos horários definidos em "Dias e Horários de Funcionamento" abaixo.
              </p>
            </div>
          )}

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

          {/* Configuração de Dias e Horários de Funcionamento */}
          <SeletorHorariosSemana
            horarios={horariosCriar}
            onChange={setHorariosCriar}
            onPreset={t => aplicarPresetDias(t, 'CRIAR')}
          />

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
        </form>
      </Modal>

      {/* Modal de Edição */}
      <Modal
        aberto={!!editando}
        fechar={() => setEditando(null)}
        titulo={`Editar — ${editando?.nome || ''}`}
        largura="max-w-2xl"
        rodape={
          editando && (
            <>
              <Botao variante="claro" onClick={() => setEditando(null)}>
                Cancelar
              </Botao>
              <Botao onClick={salvarEdicao} carregando={salvando}>
                Salvar Alterações
              </Botao>
            </>
          )
        }
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

            {/* Modalidade de Reserva */}
            <div className="space-y-1.5">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Modalidade de Reserva <span className="text-red-500">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditando({ ...editando, reserva_por_dia: false })}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    !editando.reserva_por_dia
                      ? 'border-navy bg-navy/5 ring-1 ring-navy dark:border-sky-500 dark:bg-sky-950/30 dark:ring-sky-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="modalidade_editar"
                    checked={!editando.reserva_por_dia}
                    onChange={() => setEditando({ ...editando, reserva_por_dia: false })}
                    className="mt-0.5 h-4 w-4 text-navy focus:ring-navy dark:text-sky-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Por Horários / Faixas</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      O morador reserva frações de tempo (ex.: 1h, 2h, 4h).
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditando({ ...editando, reserva_por_dia: true })}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    editando.reserva_por_dia
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500 dark:border-amber-400 dark:bg-amber-950/30 dark:ring-amber-400'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="modalidade_editar"
                    checked={Boolean(editando.reserva_por_dia)}
                    onChange={() => setEditando({ ...editando, reserva_por_dia: true })}
                    className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 dark:text-amber-400 cursor-pointer"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Por Dia Inteiro</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Reserva a diária completa conforme o horário de funcionamento do dia.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Duração da Reserva (apenas quando modalidade por horários) */}
            {!editando.reserva_por_dia ? (
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
            ) : (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                <p className="font-semibold">Reserva por Diária Ativada</p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  A reserva cobrirá o dia todo automaticamente, iniciando e finalizando exatamente nos horários definidos em "Dias e Horários de Funcionamento" abaixo.
                </p>
              </div>
            )}

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

            {/* Configuração de Dias e Horários de Funcionamento */}
            <SeletorHorariosSemana
              horarios={horariosEditar}
              onChange={setHorariosEditar}
              onPreset={t => aplicarPresetDias(t, 'EDITAR')}
            />

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
          </div>
        )}
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
