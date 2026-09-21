import React, { useState } from 'react';

export type PontoEvolucao = {
  mes_rotulo: string;
  mes_chave: string;
  total: number;
};

export type ItemStatusReserva = {
  status: string;
  total: number;
};

export type ItemAreaRanking = {
  id_area_comum?: number;
  nome: string;
  reservas: number;
};

/**
 * Gráfico Moderno de Colunas Mensais (Vertical Bar Chart) em SVG para Evolução de Agendamentos.
 * Substitui a antiga linha spline que gerava flatlines em meses vazios e curvas distorcidas.
 * Oferece colunas com gradiente, cantos arredondados, valores no topo, grid sutil e tooltips interativos.
 */
export function GraficoEvolucaoMensal({ dados }: { dados: PontoEvolucao[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!dados || dados.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-400">
        Nenhum dado de evolução disponível.
      </div>
    );
  }

  const svgWidth = 540;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 25;
  const padTop = 30;
  const padBottom = 40;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const totalGeral = dados.reduce((acc, d) => acc + d.total, 0);
  const maxVal = Math.max(4, ...dados.map(d => d.total));
  // Arredonda para múltiplo conveniente
  const gridMax = maxVal <= 6 ? 6 : Math.ceil(maxVal / 2) * 2;

  const numBars = dados.length;
  const colWidth = chartW / numBars;
  const barWidth = Math.min(42, colWidth * 0.62);

  const gridLines = [0, gridMax / 2, gridMax];

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        {/* Linhas de grade horizontal com rótulos */}
        {gridLines.map((val, idx) => {
          const y = padTop + chartH - (val / gridMax) * chartH;
          return (
            <g key={idx}>
              <line
                x1={padLeft}
                y1={y}
                x2={svgWidth - padRight}
                y2={y}
                className="stroke-slate-200/80 dark:stroke-slate-800"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
                strokeWidth={1}
              />
              <text
                x={padLeft - 10}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono font-medium"
              >
                {Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Colunas mensais com preenchimento sólido institucional (sem fade/gradiente) */}
        {dados.map((d, i) => {
          const xCenter = padLeft + i * colWidth + colWidth / 2;
          const xBar = xCenter - barWidth / 2;
          const isHovered = hoveredIndex === i;
          const isLast = i === dados.length - 1;

          const barHeight = d.total > 0 ? (d.total / gridMax) * chartH : 4;
          const yBar = padTop + chartH - barHeight;
          const percTotal = totalGeral > 0 ? Math.round((d.total / totalGeral) * 100) : 0;

          return (
            <g
              key={d.mes_chave}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Área invisível mais ampla para facilitar o hover */}
              <rect
                x={xCenter - colWidth / 2}
                y={padTop}
                width={colWidth}
                height={chartH + padBottom}
                fill="transparent"
              />

              {/* Barra da coluna sólida (sem fade/gradiente) */}
              {d.total > 0 ? (
                <rect
                  x={xBar}
                  y={yBar}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={isHovered ? '#1e40af' : '#1f3864'}
                  className="transition-colors duration-150 dark:fill-sky-500 dark:hover:fill-sky-400"
                />
              ) : (
                /* Barra sutil sólida para meses com zero reservas */
                <rect
                  x={xBar}
                  y={padTop + chartH - 4}
                  width={barWidth}
                  height={4}
                  rx={2}
                  className="fill-slate-200 dark:fill-slate-700 transition-colors group-hover:fill-slate-300 dark:group-hover:fill-slate-600"
                />
              )}

              {/* Rótulo de valor sobre a barra */}
              <text
                x={xCenter}
                y={d.total > 0 ? yBar - 7 : padTop + chartH - 10}
                textAnchor="middle"
                className={`text-[11px] font-extrabold transition-colors ${
                  d.total > 0
                    ? isLast
                      ? 'fill-navy dark:fill-sky-400 font-black'
                      : 'fill-slate-700 dark:fill-slate-300'
                    : 'fill-slate-400 dark:fill-slate-600 text-[10px]'
                }`}
              >
                {d.total > 0 ? d.total : '—'}
              </text>

              {/* Rótulo do Mês no eixo X */}
              <text
                x={xCenter}
                y={padTop + chartH + 20}
                textAnchor="middle"
                className={`text-[11px] font-bold transition-colors ${
                  isHovered || isLast
                    ? 'fill-navy font-black dark:fill-sky-400'
                    : 'fill-slate-500 dark:fill-slate-400'
                }`}
              >
                {d.mes_rotulo}
              </text>

              {/* Tooltip flutuante no hover */}
              {isHovered && (
                <g transform={`translate(${xCenter}, ${Math.max(padTop - 12, yBar - 24)})`}>
                  <rect
                    x={-42}
                    y={-18}
                    width={84}
                    height={22}
                    rx={6}
                    className="fill-slate-900 dark:fill-sky-500 shadow-md"
                  />
                  <text
                    x={0}
                    y={-3.5}
                    textAnchor="middle"
                    className="fill-white dark:fill-slate-950 text-[10px] font-bold"
                  >
                    {d.total} res. ({percTotal}%)
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Gráfico Donut (Rosca) em SVG de Alta Precisão para Distribuição de Status.
 * Utiliza fatias separadas com gap limpo (eliminando artefatos de sobreposição do strokeLinecap="round"),
 * centro informativo com totalizador e cartões de status interativos com barras proporcionais.
 */
export function GraficoDonutStatus({
  dados,
  statusAtivo,
  onSelectStatus,
}: {
  dados: ItemStatusReserva[];
  statusAtivo?: string;
  onSelectStatus?: (status: string) => void;
}) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const total = dados.reduce((acc, d) => acc + Number(d.total), 0);

  const configStatus: Record<
    string,
    { rotulo: string; cor: string; classeBg: string; classeTexto: string; classeBorda: string }
  > = {
    CONCLUIDA: {
      rotulo: 'Concluídas',
      cor: '#10b981',
      classeBg: 'bg-emerald-500',
      classeTexto: 'text-emerald-700 dark:text-emerald-400',
      classeBorda: 'border-emerald-200 dark:border-emerald-900/60',
    },
    ATIVA: {
      rotulo: 'Ativas',
      cor: '#0284c7',
      classeBg: 'bg-sky-500',
      classeTexto: 'text-sky-700 dark:text-sky-400',
      classeBorda: 'border-sky-200 dark:border-sky-900/60',
    },
    CANCELADA: {
      rotulo: 'Canceladas',
      cor: '#ef4444',
      classeBg: 'bg-rose-500',
      classeTexto: 'text-rose-700 dark:text-rose-400',
      classeBorda: 'border-rose-200 dark:border-rose-900/60',
    },
  };

  const raio = 54;
  const circunferencia = 2 * Math.PI * raio;
  const gapPixel = total > 1 ? 4 : 0; // Gap nítido entre fatias

  let acumulado = 0;
  const fatias = dados.map(item => {
    const qtd = Number(item.total);
    const perc = total > 0 ? (qtd / total) * 100 : 0;
    const comprimentoBruto = (perc / 100) * circunferencia;
    const comprimento = Math.max(0, comprimentoBruto - gapPixel);
    const offset = (acumulado / 100) * circunferencia + gapPixel / 2;
    acumulado += perc;

    const conf = configStatus[item.status] || {
      rotulo: item.status,
      cor: '#94a3b8',
      classeBg: 'bg-slate-400',
      classeTexto: 'text-slate-600 dark:text-slate-400',
      classeBorda: 'border-slate-200 dark:border-slate-800',
    };

    return {
      status: item.status,
      rotulo: conf.rotulo,
      cor: conf.cor,
      classeBg: conf.classeBg,
      classeTexto: conf.classeTexto,
      classeBorda: conf.classeBorda,
      qtd,
      perc: Math.round(perc),
      comprimento,
      offset,
    };
  });

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full">
      {/* Donut SVG sem sobreposição de bordas arredondadas */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="156" height="156" viewBox="0 0 156 156" className="transform -rotate-90">
          {/* Anel de fundo */}
          <circle
            cx="78"
            cy="78"
            r={raio}
            fill="transparent"
            strokeWidth="16"
            className="stroke-slate-100 dark:stroke-slate-800"
          />

          {total > 0 ? (
            fatias.map(f => {
              const isSelected = statusAtivo === f.status || hoveredStatus === f.status;
              return (
                <circle
                  key={f.status}
                  cx="78"
                  cy="78"
                  r={raio}
                  fill="transparent"
                  stroke={f.cor}
                  strokeWidth={isSelected ? 20 : 16}
                  strokeDasharray={`${f.comprimento} ${circunferencia - f.comprimento}`}
                  strokeDashoffset={-f.offset}
                  strokeLinecap="butt" // Garante extremidades limpas e precisas
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredStatus(f.status)}
                  onMouseLeave={() => setHoveredStatus(null)}
                  onClick={() => onSelectStatus && onSelectStatus(f.status)}
                />
              );
            })
          ) : (
            <circle
              cx="78"
              cy="78"
              r={raio}
              fill="transparent"
              stroke="#cbd5e1"
              strokeWidth="16"
              strokeDasharray={`${circunferencia} 0`}
            />
          )}
        </svg>

        {/* Texto centralizador */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">
            {total}
          </span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
            {total === 1 ? 'Reserva' : 'Reservas'}
          </span>
        </div>
      </div>

      {/* Cartões Interativos de Status com Largura 100% sem cortes */}
      <div className="space-y-2 w-full">
        {fatias.map(f => {
          const isSelected = statusAtivo === f.status || hoveredStatus === f.status;
          return (
            <div
              key={f.status}
              onClick={() => onSelectStatus && onSelectStatus(f.status)}
              onMouseEnter={() => setHoveredStatus(f.status)}
              onMouseLeave={() => setHoveredStatus(null)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-100/90 dark:bg-slate-800 shadow-xs ring-1 ring-slate-300 dark:ring-slate-700'
                  : 'bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border-slate-100 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${f.classeBg} shadow-2xs`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {f.rotulo}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                    {f.qtd}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    ({f.perc}%)
                  </span>
                </div>
              </div>

              {/* Mini barra de progresso do status */}
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60">
                <div
                  className={`h-full rounded-full ${f.classeBg} transition-all duration-500`}
                  style={{ width: `${f.perc}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Gráfico comparativo de barras horizontais para ranking de áreas mais utilizadas.
 * Inclui barras com gradiente de alta precisão, percentual relativo e estados interativos.
 */
export function GraficoBarrasAreas({ dados }: { dados: ItemAreaRanking[] }) {
  if (!dados || dados.length === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-slate-400">
        Nenhum dado de área disponível.
      </div>
    );
  }

  const max = Math.max(1, ...dados.map(a => Number(a.reservas)));
  const total = dados.reduce((acc, a) => acc + Number(a.reservas), 0);

  return (
    <div className="space-y-3.5">
      {dados.map(a => {
        const reservas = Number(a.reservas);
        const percBarra = Math.round((reservas / max) * 100);
        const percTotal = total > 0 ? Math.round((reservas / total) * 100) : 0;

        return (
          <div key={a.nome} className="group cursor-default">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-navy dark:group-hover:text-sky-400 transition-colors">
                {a.nome}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-navy dark:text-sky-400">
                  {reservas} {reservas === 1 ? 'reserva' : 'reservas'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  ({percTotal}%)
                </span>
              </div>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy via-brand-blue to-sky-400 dark:from-sky-600 dark:via-cyan-500 dark:to-teal-400 transition-all duration-500 group-hover:opacity-90 shadow-2xs"
                style={{ width: `${percBarra}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

