/** Tipos compartilhados para Áreas Comuns do condomínio. */

export type DiaSemana = 'DOMINGO' | 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA' | 'SABADO';

export type JanelaHorario = {
  hora_inicio: string;
  hora_fim: string;
};

export type HorarioForm = {
  dia_semana: DiaSemana;
  ativo: boolean;
  turnos: JanelaHorario[];
};

export type ConflitoTurnoInfo = {
  tipo: 'INVALIDO' | 'CONFLITO';
  mensagem: string;
};

export type HorarioArea = {
  dia_semana: string;
  hora_inicio: string;
  hora_fim: string;
};

export type ChaveArea = {
  id_chave: number;
  codigo: string;
  status: string;
  responsavel?: string | null;
  data_hora_retirada?: string | null;
};

export type PenalidadeUsuario = {
  id_bloqueio_perfil: number;
  bloqueado: boolean;
  motivo: string;
  descricao?: string | null;
  data_hora_inicio: string;
  data_hora_fim?: string | null;
};

export type Area = {
  id_area_comum: number;
  nome: string;
  descricao?: string | null;
  capacidade: number;
  ativo: boolean;
  duracao_slot_min: number;
  antecedencia_minima_dias: number;
  antecedencia_minima_horas?: number;
  antecedencia_maxima_dias: number;
  prazo_cancelamento_horas: number;
  limite_reservas_semana: number;
  tipo_limite_reserva?: 'DIARIO' | 'SEMANAL' | 'MENSAL';
  max_unidades_simultaneas?: number;
  reserva_por_dia?: boolean;
  requer_reserva?: boolean;
  valor?: number | string;
  exige_chave?: boolean;
  chaves?: ChaveArea[];
  status_livre?: 'LIVRE' | 'EM_USO';
  status_livre_atualizado_em?: string | null;
  status_livre_observacao?: string | null;
  status_livre_porteiro?: string | null;
  em_uso_agora?: boolean;
  imagem_url?: string | null;
  horarios: HorarioArea[];
  idade_minima?: number;
  penalidade_usuario?: PenalidadeUsuario | null;
};

export type BloqueioArea = {
  id_bloqueio_area: number;
  id_area_comum: number;
  area_nome: string;
  data_hora_inicio: string;
  data_hora_fim: string;
  motivo: 'MANUTENCAO' | 'LIMPEZA' | 'EVENTO' | 'OBRA';
  descricao?: string | null;
  autor_nome: string;
};

export type DependenciasArea = {
  reservas_total: number;
  reservas_ativas_futuras: number;
  chaves: number;
  bloqueios_area: number;
  bloqueios_perfil: number;
  pode_excluir: boolean;
};

export type DiaSemanaConfig = {
  dia: DiaSemana;
  label: string;
  sigla: string;
};

/** Configuração completa dos 7 dias da semana. */
export const DIAS_SEMANA_CONFIG: DiaSemanaConfig[] = [
  { dia: 'DOMINGO', label: 'Domingo', sigla: 'Dom' },
  { dia: 'SEGUNDA', label: 'Segunda-feira', sigla: 'Seg' },
  { dia: 'TERCA', label: 'Terça-feira', sigla: 'Ter' },
  { dia: 'QUARTA', label: 'Quarta-feira', sigla: 'Qua' },
  { dia: 'QUINTA', label: 'Quinta-feira', sigla: 'Qui' },
  { dia: 'SEXTA', label: 'Sexta-feira', sigla: 'Sex' },
  { dia: 'SABADO', label: 'Sábado', sigla: 'Sáb' },
];

/** Mapeamento de dia da semana para índice numérico (0=Domingo). */
export const DOW_MAP: Record<string, number> = {
  DOMINGO: 0,
  SEGUNDA: 1,
  TERCA: 2,
  QUARTA: 3,
  QUINTA: 4,
  SEXTA: 5,
  SABADO: 6,
};

/** Nomes curtos dos dias da semana. */
export const NOMES_CURTOS_DIA: Record<string, string> = {
  DOMINGO: 'Dom',
  SEGUNDA: 'Seg',
  TERCA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SABADO: 'Sáb',
};

/** Opções de horários de 30 em 30 min cobrindo as 24 horas do dia (meia-noite a 23h59) */
export const HORARIOS_DIA = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
  '23:59'
];

/** Slot de horário disponível para reserva. */
export type SlotReserva = {
  inicio: string;
  fim: string;
  status: 'LIVRE' | 'OCUPADO' | 'BLOQUEADO' | 'PASSADO' | 'ANTECEDENCIA_MINIMA' | 'JA_RESERVADO_POR_VOCE';
  motivo?: string;
  vagas_totais?: number;
  vagas_ocupadas?: number;
  vagas_restantes?: number;
  capacidade_total?: number;
  pessoas_agendadas?: number;
  pessoas_restantes?: number;
};

export type GradeHorarios = {
  dia_semana: string;
  regras: any;
  slots: SlotReserva[];
  bloqueio_usuario?: {
    bloqueado: boolean;
    motivo: string;
    descricao?: string | null;
    data_hora_inicio?: string;
    data_hora_fim?: string | null;
  } | null;
};
