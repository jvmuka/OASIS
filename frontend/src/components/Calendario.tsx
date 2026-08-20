import { useState } from 'react';
import { Icone } from './ui';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

type Props = {
  dataSelecionada: string; // formato AAAA-MM-DD
  onChange: (data: string) => void;
  minDate?: string;
  maxDate?: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function fmt(ano: number, mes: number, dia: number) {
  return `${ano}-${pad(mes + 1)}-${pad(dia)}`;
}

/**
 * Calendário mensal visual do OASIS (UI/UX Pro Max).
 * Grade de 7 colunas, navegação fluida, bloqueio de dias fora da janela e destaque de hoje/selecionado.
 */
export default function Calendario({ dataSelecionada, onChange, minDate, maxDate }: Props) {
  const hoje = new Date();
  const [ano, setAno] = useState(dataSelecionada ? Number(dataSelecionada.slice(0, 4)) : hoje.getFullYear());
  const [mes, setMes] = useState(dataSelecionada ? Number(dataSelecionada.slice(5, 7)) - 1 : hoje.getMonth());

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  function navegar(dir: -1 | 1) {
    let novoMes = mes + dir;
    let novoAno = ano;
    if (novoMes < 0) {
      novoMes = 11;
      novoAno--;
    }
    if (novoMes > 11) {
      novoMes = 0;
      novoAno++;
    }
    setMes(novoMes);
    setAno(novoAno);
  }

  function diaClicavel(dia: number): boolean {
    const d = fmt(ano, mes, dia);
    if (minDate && d < minDate) return false;
    if (maxDate && d > maxDate) return false;
    return true;
  }

  const hojeStr = fmt(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const celulas: React.ReactNode[] = [];
  for (let i = 0; i < primeiroDia; i++) {
    celulas.push(<div key={`v${i}`} className="h-9 w-9" />);
  }

  for (let dia = 1; dia <= totalDias; dia++) {
    const d = fmt(ano, mes, dia);
    const sel = d === dataSelecionada;
    const eHoje = d === hojeStr;
    const ativo = diaClicavel(dia);

    celulas.push(
      <button
        key={dia}
        type="button"
        disabled={!ativo}
        onClick={() => onChange(d)}
        className={
          'flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ' +
          (sel
            ? 'bg-navy text-white shadow-sm ring-2 ring-navy/30'
            : eHoje
            ? 'border-2 border-navy text-navy font-bold hover:bg-navy-50'
            : ativo
            ? 'text-slate-700 hover:bg-slate-100 hover:text-navy active:scale-95'
            : 'cursor-not-allowed text-slate-300')
        }
      >
        {dia}
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-soft">
      {/* Cabeçalho de navegação */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navegar(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Icone nome="chevronLeft" className="h-4 w-4" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
          {MESES[mes]} {ano}
        </span>
        <button
          type="button"
          onClick={() => navegar(1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <Icone nome="chevronRight" className="h-4 w-4" />
        </button>
      </div>

      {/* Dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="flex h-7 items-center justify-center text-[10px] font-bold uppercase text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grade de dias */}
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {celulas}
      </div>
    </div>
  );
}
