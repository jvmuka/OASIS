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
 * Gráfico de Área / Linha suave vetorial em SVG para Evolução Mensal.
 * Inclui gradientes dinâmicos, grid sutil, pontos de ancoragem e suporte nativo a Dark Mode.
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

  const svgWidth = 500;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(5, ...dados.map(d => d.total));
  // Arredonda para múltiplo de 2 ou 5
  const gridMax = Math.ceil(maxVal / 2) * 2;

  const stepX = dados.length > 1 ? chartW / (dados.length - 1) : chartW;

  const points = dados.map((d, i) => {
    const x = padLeft + i * stepX;
    const y = padTop + chartH - (d.total / gridMax) * chartH;
    return { x, y, ...d };
  });

  // Constrói curva Bezier cúbica suave
  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = linePath
    ? `${linePath} L ${lastPoint.x} ${padTop + chartH} L ${firstPoint.x} ${padTop + chartH} Z`
    : '';

  const gridLines = [0, gridMax / 2, gridMax];

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1f3864" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Linhas de grade horizontal */}
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

        {/* Área preenchida */}
        {areaPath && (
          <path d={areaPath} fill="url(#areaGradient)" className="transition-all duration-300" />
        )}

        {/* Linha principal com gradiente */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="filter drop-shadow-xs"
          />
        )}

        {/* Rótulos dos meses no eixo X e pontos */}
        {points.map((p, i) => {
          const isHovered = hoveredIndex === i;
          return (
            <g key={i} className="group cursor-pointer">
              {/* Linha vertical indicadora no hover */}
              {isHovered && (
                <line
                  x1={p.x}
                  y1={padTop}
                  x2={p.x}
                  y2={padTop + chartH}
                  className="stroke-sky-400/60 dark:stroke-sky-500/40"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              )}

              {/* Ponto na curva */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : 4}
                className={`transition-all duration-150 ${
                  isHovered
                    ? 'fill-white stroke-sky-500 stroke-[3px] dark:fill-slate-900 dark:stroke-sky-400'
                    : 'fill-white stroke-navy stroke-[2.5px] dark:fill-slate-950 dark:stroke-sky-400'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Rótulo do Mês */}
              <text
                x={p.x}
                y={padTop + chartH + 18}
                textAnchor="middle"
                className={`text-[11px] transition-colors font-bold ${
                  isHovered
                    ? 'fill-navy font-extrabold dark:fill-sky-400'
                    : 'fill-slate-500 dark:fill-slate-400'
                }`}
              >
                {p.mes_rotulo}
              </text>

              {/* Badge/Tooltip com valor */}
              {isHovered && (
                <g transform={`translate(${p.x}, ${p.y - 14})`}>
                  <rect
                    x={-24}
                    y={-18}
                    width={48}
                    height={20}
                    rx={6}
                    className="fill-slate-900 dark:fill-sky-500"
                  />
                  <text
                    x={0}
                    y={-4.5}
                    textAnchor="middle"
                    className="fill-white dark:fill-slate-950 text-[10px] font-bold"
                  >
                    {p.total} res.
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
 * Gráfico Donut (Rosca) em SVG para distribuição de status das reservas.
 * Fatias calculadas geometricamente com cores semânticas e centro informativo.
 */
export function GraficoDonutStatus({ dados }: { dados: ItemStatusReserva[] }) {
  const total = dados.reduce((acc, d) => acc + Number(d.total), 0);

  const configStatus: Record<string, { rotulo: string; cor: string; classeBg: string; classeTexto: string }> = {
    CONCLUIDA: {
      rotulo: 'Concluídas',
      cor: '#10b981',
      classeBg: 'bg-emerald-500',
      classeTexto: 'text-emerald-700 dark:text-emerald-400',
    },
    ATIVA: {
      rotulo: 'Ativas',
      cor: '#0284c7',
      classeBg: 'bg-sky-500',
      classeTexto: 'text-sky-700 dark:text-sky-400',
    },
    CANCELADA: {
      rotulo: 'Canceladas',
      cor: '#ef4444',
      classeBg: 'bg-rose-500',
      classeTexto: 'text-rose-700 dark:text-rose-400',
    },
  };

  const raio = 62;
  const circunferencia = 2 * Math.PI * raio;

  let acumulado = 0;
  const fatias = dados.map(item => {
    const qtd = Number(item.total);
    const perc = total > 0 ? (qtd / total) * 100 : 0;
    const comprimento = (perc / 100) * circunferencia;
    const offset = (acumulado / 100) * circunferencia;
    acumulado += perc;

    const conf = configStatus[item.status] || {
      rotulo: item.status,
      cor: '#94a3b8',
      classeBg: 'bg-slate-400',
      classeTexto: 'text-slate-600 dark:text-slate-400',
    };

    return {
      status: item.status,
      rotulo: conf.rotulo,
      cor: conf.cor,
      classeBg: conf.classeBg,
      classeTexto: conf.classeTexto,
      qtd,
      perc: Math.round(perc),
      comprimento,
      offset,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
      {/* Donut SVG */}
      <div className="relative flex items-center justify-center">
        <svg width="180" height="180" viewBox="0 0 180 180" className="transform -rotate-90">
          {/* Anel de fundo suave */}
          <circle
            cx="90"
            cy="90"
            r={raio}
            fill="transparent"
            strokeWidth="20"
            className="stroke-slate-100 dark:stroke-slate-800"
          />

          {total > 0 ? (
            fatias.map(f => (
              <circle
                key={f.status}
                cx="90"
                cy="90"
                r={raio}
                fill="transparent"
                stroke={f.cor}
                strokeWidth="20"
                strokeDasharray={`${f.comprimento} ${circunferencia - f.comprimento}`}
                strokeDashoffset={-f.offset}
                strokeLinecap="round"
                className="transition-all duration-500 hover:opacity-85 cursor-pointer"
              />
            ))
          ) : (
            <circle
              cx="90"
              cy="90"
              r={raio}
              fill="transparent"
              stroke="#cbd5e1"
              strokeWidth="20"
              strokeDasharray={`${circunferencia} 0`}
            />
          )}
        </svg>

        {/* Texto no centro da rosca */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 leading-none">
            {total}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 uppercase tracking-wider">
            {total === 1 ? 'Reserva' : 'Reservas'}
          </span>
        </div>
      </div>

      {/* Legenda Lateral com Percentuais */}
      <div className="space-y-3 w-full sm:w-auto min-w-[160px]">
        {fatias.map(f => (
          <div
            key={f.status}
            className="flex items-center justify-between gap-4 p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className={`h-3 w-3 rounded-full ${f.classeBg} shadow-2xs`} />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {f.rotulo}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                {f.qtd}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5 font-medium">
                ({f.perc}%)
              </span>
            </div>
          </div>
        ))}
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
