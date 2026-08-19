import { useState } from 'react';

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

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmt(ano: number, mes: number, dia: number) { return `${ano}-${pad(mes + 1)}-${pad(dia)}`; }

/**
 * Calendario mensal visual, sem dependencias externas.
 * Exibe os dias do mes em grade 7 colunas (Dom–Sab),
 * com navegacao entre meses e destaque do dia selecionado.
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
    if (novoMes < 0) { novoMes = 11; novoAno--; }
    if (novoMes > 11) { novoMes = 0; novoAno++; }
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
  // Celulas vazias antes do primeiro dia
  for (let i = 0; i < primeiroDia; i++) {
    celulas.push(<div key={`v${i}`} />);
  }
  // Dias do mês
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
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors ' +
          (sel
            ? 'bg-navy text-white shadow-md'
            : eHoje
              ? 'border-2 border-navy text-navy hover:bg-navy/10'
              : ativo
                ? 'text-slate-700 hover:bg-slate-100'
                : 'cursor-not-allowed text-slate-300')
        }
      >
        {dia}
      </button>,
    );
  }

  return (
    <div className="w-full max-w-xs">
      {/* Cabeçalho de navegação */}
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => navegar(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          ‹
        </button>
        <span className="text-sm font-semibold text-navy">
          {MESES[mes]} {ano}
        </span>
        <button type="button" onClick={() => navegar(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
          ›
        </button>
      </div>

      {/* Nomes dos dias da semana */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="flex h-8 items-center justify-center text-xs font-semibold uppercase text-slate-400">
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
