/**
 * Utilitários compartilhados para manipulação de horários e dias da semana.
 * Elimina duplicação entre Areas.tsx e NovaReserva.tsx.
 */
import type { DiaSemana, JanelaHorario, HorarioForm, ConflitoTurnoInfo } from '../types/areas';
import { DIAS_SEMANA_CONFIG, NOMES_CURTOS_DIA } from '../types/areas';

/** Converte string de horário "HH:MM" em minutos desde meia-noite. */
export function toMinutos(hStr: string, isFim = false): number {
  const [h, m] = (hStr || '00:00').split(':').map(Number);
  if (isFim && (h === 24 || (h === 23 && m === 59))) return 1440;
  return (h || 0) * 60 + (m || 0);
}

/** Converte minutos desde meia-noite para string "HH:MM". */
export function minutosParaHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Cria configuração padrão de horários para 7 dias da semana (08:00 às 22:00, todos ativos). */
export function criarHorariosPadrao(): HorarioForm[] {
  return DIAS_SEMANA_CONFIG.map(d => ({
    dia_semana: d.dia,
    ativo: true,
    turnos: [{ hora_inicio: '08:00', hora_fim: '22:00' }],
  }));
}

/**
 * Formata um resumo legível dos dias da semana ativos.
 * Retorna textos como "Todos os dias", "Seg a Sex", etc.
 */
export function formatarDiasSemana(horarios?: { dia_semana: string }[]): string {
  if (!horarios || horarios.length === 0) return 'Sem horários definidos';
  const diasAtivos = new Set(horarios.map(h => h.dia_semana));
  if (diasAtivos.size === 7) return 'Todos os dias';
  const semana = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const fimDeSemana = ['SABADO', 'DOMINGO'];
  const sexADom = ['SEXTA', 'SABADO', 'DOMINGO'];

  if (semana.every(d => diasAtivos.has(d)) && diasAtivos.size === 5) return 'Seg a Sex';
  if (fimDeSemana.every(d => diasAtivos.has(d)) && diasAtivos.size === 2) return 'Fim de Semana (Sáb e Dom)';
  if (sexADom.every(d => diasAtivos.has(d)) && diasAtivos.size === 3) return 'Sex a Dom';

  const ordem: DiaSemana[] = ['DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO'];
  return ordem
    .filter(d => diasAtivos.has(d))
    .map(d => NOMES_CURTOS_DIA[d])
    .join(', ');
}

/**
 * Analisa em tempo real se os turnos do dia possuem término <= início ou sobreposição entre si.
 * Retorna mapa de conflitos por índice de turno e flag booleana.
 */
export function analisarConflitosDia(turnos: JanelaHorario[]): {
  conflitosPorTurno: Map<number, ConflitoTurnoInfo>;
  temConflito: boolean;
} {
  const conflitosPorTurno = new Map<number, ConflitoTurnoInfo>();
  if (!turnos || turnos.length === 0) return { conflitosPorTurno, temConflito: false };

  // 1. Validar término > início em cada turno individualmente
  for (let i = 0; i < turnos.length; i++) {
    const ini = toMinutos(turnos[i].hora_inicio, false);
    const fim = toMinutos(turnos[i].hora_fim, true);
    if (fim <= ini) {
      conflitosPorTurno.set(i, {
        tipo: 'INVALIDO',
        mensagem: 'O horário de término deve ser posterior ao horário de início.',
      });
    }
  }

  // 2. Validar sobreposição entre quaisquer turnos no mesmo dia
  for (let i = 0; i < turnos.length; i++) {
    const iniA = toMinutos(turnos[i].hora_inicio, false);
    const fimA = toMinutos(turnos[i].hora_fim, true);
    if (fimA <= iniA) continue; // já com erro

    for (let j = i + 1; j < turnos.length; j++) {
      const iniB = toMinutos(turnos[j].hora_inicio, false);
      const fimB = toMinutos(turnos[j].hora_fim, true);
      if (fimB <= iniB) continue;

      // Sobreposição: iniA < fimB && fimA > iniB
      if (iniA < fimB && fimA > iniB) {
        if (!conflitosPorTurno.has(i)) {
          conflitosPorTurno.set(i, {
            tipo: 'CONFLITO',
            mensagem: `Conflito de horário com o Turno ${j + 1} (${turnos[j].hora_inicio} às ${turnos[j].hora_fim}).`,
          });
        }
        if (!conflitosPorTurno.has(j)) {
          conflitosPorTurno.set(j, {
            tipo: 'CONFLITO',
            mensagem: `Conflito de horário com o Turno ${i + 1} (${turnos[i].hora_inicio} às ${turnos[i].hora_fim}).`,
          });
        }
      }
    }
  }

  return {
    conflitosPorTurno,
    temConflito: conflitosPorTurno.size > 0,
  };
}
