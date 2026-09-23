/**
 * Utilitários centralizados de data, hora e fuso horário (America/Sao_Paulo).
 * Elimina duplicações entre Portaria, Chaves, Mural, Encomendas, MinhasReservas, Areas e Inicio.
 */

/** Retorna a data atual no fuso horário de São Paulo no formato YYYY-MM-DD. */
export function hojeSP(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 10);
}

/** Formata data e hora no padrão pt-BR (ex: 22/09/2026 14:30 ou 22/09 14:30). */
export function formatarDataHora(iso: string | Date | null | undefined, incluirAno = true): string {
  if (!iso) return '-';
  try {
    if (incluirAno) {
      return new Date(iso).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/** Formata apenas a hora no padrão pt-BR (ex: 14:30). */
export function formatarHora(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/** Formata apenas a data no padrão pt-BR (ex: 22/09/2026). */
export function formatarData(iso: string | Date | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/** Formata minutos para exibição amigável em horas e minutos (ex: 2h 30min, 45min). */
export function formatarDuracao(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Formata minutos para exibição com unidade textual (ex: 45 min, 2h 30min, 2h). */
export function minutosTexto(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** Formata horas para exibição amigável em dias e horas (ex: 2d 4h, 3d, 12h). */
export function formatarHoras(horasTotal: number): string {
  const d = Math.floor(horasTotal / 24);
  const h = horasTotal % 24;
  if (d > 0 && h > 0) return `${d}d ${h}h`;
  if (d > 0) return `${d}d`;
  return `${h}h`;
}

export const MESES_ROTULOS: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

/** Gera lista de meses (passados e futuros próximos) para seleção em filtros de relatórios e agendas. */
export function gerarOpcoesMeses(): { valor: string; rotulo: string }[] {
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const mesAtualNum = agora.getMonth() + 1;
  const meses: { valor: string; rotulo: string }[] = [];

  for (let offset = 2; offset >= -6; offset--) {
    const d = new Date(anoAtual, mesAtualNum - 1 + offset, 1);
    const ano = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const chave = `${ano}-${mm}`;
    const rotulo = `${MESES_ROTULOS[mm] || mm}/${ano}`;
    meses.push({ valor: chave, rotulo });
  }
  return meses;
}
