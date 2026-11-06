import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PassoAjuda } from '../config/ajudaContextoConfig';

interface SimuladorProps {
  passoAtivo?: number;
}

/**
 * Simulador visual animado específico para a tela de Nova Reserva.
 */
export function SimuladorAnimadoReserva({ passoAtivo: passoForcado }: SimuladorProps) {
  const [passo, setPasso] = useState(passoForcado || 1);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setPasso((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 3200);
    return () => clearInterval(interval);
  }, [autoPlay]);

  const irParaPasso = (n: number) => {
    setAutoPlay(false);
    setPasso(n);
  };

  return (
    <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-b from-sky-50/60 to-white p-4 shadow-sm dark:border-sky-800/80 dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-center justify-between border-b border-sky-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white shadow-xs">
            ▶
          </span>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300">
            Animação: Onde Clicar para Reservar
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-xs border border-sky-200 hover:bg-sky-50 dark:bg-slate-800 dark:border-slate-700 dark:text-sky-300 cursor-pointer"
          >
            {autoPlay ? '⏸ Pausar' : '▶ Reproduzir'}
          </button>
        </div>
      </div>

      {/* Seletor de Etapas da Animação */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
        {[
          { n: 1, label: '1. Espaço' },
          { n: 2, label: '2. Data' },
          { n: 3, label: '3. Horário' },
          { n: 4, label: '4. Confirmar' },
        ].map((item) => (
          <button
            key={item.n}
            type="button"
            onClick={() => irParaPasso(item.n)}
            className={`rounded-lg py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
              passo === item.n
                ? 'bg-navy text-white shadow-sm ring-2 ring-sky-400 dark:bg-sky-600'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Palco da Animação Interativa */}
      <div className="relative mt-3 h-56 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900/95 p-4 text-white shadow-inner flex flex-col justify-between select-none">
        {/* Passo 1: Card de Área Comum */}
        {passo === 1 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Etapa 1: Escolha a Área Comum</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">1 de 4</span>
            </div>

            <div className="relative mx-auto my-auto w-64 rounded-xl border-2 border-sky-400 bg-slate-800 p-3 shadow-lg ring-4 ring-sky-500/30 transform transition-transform animate-pulse">
              <div className="h-16 w-full rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-xs">
                🏢 Salão de Festas
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
                <span>Capacidade: 50 pessoas</span>
                <span className="text-emerald-400 font-bold">• Livre</span>
              </div>

              {/* Cursor animado com clique */}
              <div className="absolute -bottom-3 -right-3 flex items-center gap-1.5 bg-sky-500 text-white px-2 py-1 rounded-full text-xs font-black shadow-lg animate-bounce">
                <span>👆</span>
                <span className="text-[10px]">Clique aqui!</span>
              </div>
            </div>

            <p className="text-center text-xs text-sky-200 font-medium">
              Clique no card do espaço que deseja reservar.
            </p>
          </div>
        )}

        {/* Passo 2: Seleção de Data no Calendário */}
        {passo === 2 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Etapa 2: Selecione o Dia</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">2 de 4</span>
            </div>

            <div className="mx-auto my-auto w-64 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-md relative">
              <div className="text-center text-xs font-bold text-slate-300 mb-2">Calendário de Reservas</div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                <span className="text-slate-500">D</span>
                <span className="text-slate-500">S</span>
                <span className="text-slate-500">T</span>
                <span className="text-slate-500">Q</span>
                <span className="text-slate-500">Q</span>
                <span className="text-slate-500">S</span>
                <span className="text-slate-500">S</span>
                {[10, 11, 12, 13, 14].map(d => (
                  <span key={d} className="rounded p-1 text-slate-400">{d}</span>
                ))}
                {/* Dia Selecionado com destaque */}
                <div className="relative rounded bg-sky-500 p-1 font-extrabold text-white ring-2 ring-white">
                  <span>15</span>
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 h-1 w-1 bg-amber-400 rounded-full" />
                </div>
                {[16, 17, 18, 19, 20].map(d => (
                  <span key={d} className="rounded p-1 text-slate-400">{d}</span>
                ))}
              </div>

              {/* Cursor animado */}
              <div className="absolute top-1/2 left-2/3 flex items-center gap-1.5 bg-sky-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg animate-bounce">
                <span>👆</span>
                <span className="text-[10px]">Escolha a data</span>
              </div>
            </div>

            <p className="text-center text-xs text-sky-200 font-medium">
              Clique no dia desejado. Dias com bolinha possuem ocupação.
            </p>
          </div>
        )}

        {/* Passo 3: Escolha do Horário Livre */}
        {passo === 3 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Etapa 3: Escolha o Horário</span>
              <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">3 de 4</span>
            </div>

            <div className="mx-auto my-auto w-64 space-y-1.5">
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-xs opacity-60">
                <span>08:00 - 12:00</span>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px]">Ocupado</span>
              </div>

              {/* Slot Verde Selecionado */}
              <div className="relative flex items-center justify-between rounded-lg border-2 border-emerald-400 bg-emerald-950/80 p-2 text-xs font-bold text-white shadow-lg ring-2 ring-emerald-500/50">
                <span>13:00 - 17:00</span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white">✓ LIVRE</span>

                {/* Cursor animado */}
                <div className="absolute -right-2 -bottom-2 flex items-center gap-1 bg-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-lg animate-bounce">
                  <span>👆</span>
                  <span className="text-[10px]">Selecione!</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/80 p-2 text-xs opacity-60">
                <span>18:00 - 22:00</span>
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px]">Ocupado</span>
              </div>
            </div>

            <p className="text-center text-xs text-emerald-300 font-medium">
              Clique no botão verde com o horário livre desejado.
            </p>
          </div>
        )}

        {/* Passo 4: Confirmação */}
        {passo === 4 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">Etapa 4: Confirmação</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300 font-bold">Conclusão</span>
            </div>

            <div className="mx-auto my-auto w-64 rounded-xl border border-emerald-500/60 bg-emerald-950/40 p-3 text-center shadow-lg">
              <div className="text-emerald-400 text-2xl font-black mb-1">✓</div>
              <div className="text-xs font-bold text-white">Resumo Pronto!</div>
              <div className="text-[11px] text-slate-300 mt-1">Salão de Festas • 15/11 • 13h às 17h</div>

              <div className="relative mt-2.5 inline-block">
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md ring-2 ring-emerald-300 animate-pulse"
                >
                  Confirmar Reserva
                </button>
                <div className="absolute -bottom-2 -right-3 flex items-center gap-1 bg-white text-slate-900 px-1.5 py-0.5 rounded-full text-[10px] font-black shadow-lg animate-bounce">
                  <span>👆</span>
                  <span>Clique aqui!</span>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-emerald-300 font-bold">
              Pronto! Sua reserva é registrada instantaneamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// SIMULADOR UNIVERSAL PARA QUALQUER MÓDULO / ABA
// ----------------------------------------------------
export interface SimuladorUniversalProps {
  passos: PassoAjuda[];
  tituloTela?: string;
  rota?: string;
}

export function SimuladorAnimadoUniversal({ passos, tituloTela, rota = '' }: SimuladorUniversalProps) {
  // Se for a tela de reservas de morador, usa a simulação hiper-específica adorada pelo usuário
  if (rota.includes('/morador/reservar') || rota.includes('nova-reserva')) {
    return <SimuladorAnimadoReserva />;
  }

  const listaPassos = passos && passos.length > 0 ? passos : [
    { passo: 1, titulo: 'Navegar na Tela', descricao: 'Localize os botões e informações principais.' }
  ];

  const [passo, setPasso] = useState(1);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay || listaPassos.length <= 1) return;
    const interval = setInterval(() => {
      setPasso((prev) => (prev >= listaPassos.length ? 1 : prev + 1));
    }, 3400);
    return () => clearInterval(interval);
  }, [autoPlay, listaPassos.length]);

  const irParaPasso = (n: number) => {
    setAutoPlay(false);
    setPasso(n);
  };

  const passoAtual = listaPassos[passo - 1] || listaPassos[0];

  // Renderiza mockup interativo de acordo com o contexto do passo
  const renderMockupVisual = (p: PassoAjuda) => {
    const t = (p.titulo + ' ' + p.descricao).toLowerCase();

    // 1. Botão de Ação / Cadastro / Novo
    if (t.includes('clique') || t.includes('novo') || t.includes('cadastrar') || t.includes('adicionar') || t.includes('abrir') || t.includes('publicar') || t.includes('registrar')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-lg flex flex-col items-center justify-center text-center">
          <div className="text-[11px] text-slate-400 mb-2">Painel de Ações Rápidas</div>
          <div className="relative inline-block">
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md ring-4 ring-sky-500/30 animate-pulse flex items-center gap-1.5"
            >
              <span>+</span>
              <span>{p.titulo.replace(/^(Clique em|Abra o|Cadastre|Adicione)\s+/i, '').slice(0, 22) || 'Ação Principal'}</span>
            </button>
            <div className="absolute -bottom-3 -right-3 flex items-center gap-1 bg-white text-slate-900 px-2 py-0.5 rounded-full text-[10px] font-black shadow-lg animate-bounce">
              <span>👆</span>
              <span>Clique aqui!</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. Filtros, Abas ou Triagem de Status
    if (t.includes('filtro') || t.includes('aba') || t.includes('triagem') || t.includes('status') || t.includes('categoria')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg">
          <div className="text-[10px] text-slate-400 mb-2 font-semibold">Seleção de Filtro / Status:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-lg bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs ring-2 ring-white/50">
              ● Ativo / Em Análise
            </span>
            <span className="rounded-lg bg-slate-700 px-2 py-1 text-[11px] text-slate-300">
              Concluídas
            </span>
            <span className="rounded-lg bg-slate-700 px-2 py-1 text-[11px] text-slate-300">
              Todos
            </span>
          </div>
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-sky-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-bounce">
            <span>👆</span>
            <span>Alterne aqui!</span>
          </div>
        </div>
      );
    }

    // 3. Formulário / Preenchimento de Dados
    if (t.includes('preencha') || t.includes('dados') || t.includes('formulário') || t.includes('informe') || t.includes('redigir') || t.includes('foto')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg space-y-2">
          <div className="h-6 w-full rounded bg-slate-700/80 px-2 flex items-center text-[10px] text-slate-300 border border-slate-600">
            <span>Título / Descrição...</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-6 flex-1 rounded bg-slate-700/80 px-2 flex items-center text-[10px] text-slate-300 border border-slate-600">
              <span>Categoria</span>
            </div>
            <div className="h-6 w-16 rounded bg-slate-700/80 px-1 flex items-center justify-center text-[10px] text-slate-300 border border-slate-600">
              <span>📷 Foto</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-indigo-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-bounce">
            <span>👆</span>
            <span>Preencha os campos</span>
          </div>
        </div>
      );
    }

    // 4. Confirmação / Aprovação / Baixa / Conclusão
    if (t.includes('confirmar') || t.includes('aprovar') || t.includes('concluir') || t.includes('finalizar') || t.includes('entregar') || t.includes('devolução') || t.includes('responder')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-emerald-500/60 bg-emerald-950/40 p-3.5 text-center shadow-lg">
          <div className="text-emerald-400 text-2xl font-black mb-1">✓</div>
          <div className="text-xs font-bold text-white">Confirmação da Operação</div>
          <p className="text-[10px] text-slate-300 mt-0.5">Validação registrada com sucesso</p>
          <div className="relative mt-2 inline-block">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-md ring-2 ring-emerald-300 animate-pulse"
            >
              Confirmar & Salvar
            </button>
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-white text-slate-900 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-lg animate-bounce">
              <span>👆</span>
              <span>Clique!</span>
            </div>
          </div>
        </div>
      );
    }

    // 5. Tabela / Listagem / Histórico Geral
    return (
      <div className="relative mx-auto my-auto w-64 rounded-xl border border-slate-700 bg-slate-800 p-3 shadow-lg space-y-1.5">
        <div className="flex items-center justify-between text-[11px] border-b border-slate-700 pb-1 text-slate-400">
          <span>Item / Registro</span>
          <span>Status</span>
        </div>
        <div className="flex items-center justify-between rounded bg-slate-700/60 p-1.5 text-xs ring-1 ring-sky-400">
          <span className="font-semibold text-[11px] text-slate-200">#01 • Em Andamento</span>
          <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">✓ Ativo</span>
        </div>
        <div className="flex items-center justify-between rounded bg-slate-700/30 p-1.5 text-xs opacity-60">
          <span className="text-[11px] text-slate-400">#02 • Histórico</span>
          <span className="text-[9px] text-slate-500">Concluído</span>
        </div>
        <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-sky-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg animate-bounce">
          <span>👆</span>
          <span>Veja os dados</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-b from-sky-50/60 to-white p-4 shadow-sm dark:border-sky-800/80 dark:from-slate-900 dark:to-slate-950">
      <div className="flex items-center justify-between border-b border-sky-100 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500 text-xs font-bold text-white shadow-xs">
            ▶
          </span>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-900 dark:text-sky-300">
            Animação: {passoAtual.titulo}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-xs border border-sky-200 hover:bg-sky-50 dark:bg-slate-800 dark:border-slate-700 dark:text-sky-300 cursor-pointer"
          >
            {autoPlay ? '⏸ Pausar' : '▶ Reproduzir'}
          </button>
        </div>
      </div>

      {/* Seletor de Etapas da Animação */}
      <div
        className="mt-3 grid gap-1.5 text-center"
        style={{ gridTemplateColumns: `repeat(${listaPassos.length}, minmax(0, 1fr))` }}
      >
        {listaPassos.map((item) => (
          <button
            key={item.passo}
            type="button"
            onClick={() => irParaPasso(item.passo)}
            className={`rounded-lg py-1.5 px-1 text-[11px] font-bold transition-all cursor-pointer truncate ${
              passo === item.passo
                ? 'bg-navy text-white shadow-sm ring-2 ring-sky-400 dark:bg-sky-600'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title={`Passo ${item.passo}: ${item.titulo}`}
          >
            {item.passo}. {item.titulo.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Palco da Animação Interativa */}
      <div className="relative mt-3 h-56 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900/95 p-4 text-white shadow-inner flex flex-col justify-between select-none">
        <div className="animate-fade-in flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              Etapa {passo}: {passoAtual.titulo}
            </span>
            <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-300 font-bold">
              {passo} de {listaPassos.length}
            </span>
          </div>

          {/* Elemento visual simulado dinâmico */}
          {renderMockupVisual(passoAtual)}

          <p className="text-center text-xs text-sky-200 font-medium">
            {passoAtual.descricao}
          </p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TOUR GUIADO ANIMADO NA TELA REAL
// ----------------------------------------------------
interface TourGuiadoProps {
  passoAtual: number;
  totalPassos: number;
  titulo: string;
  descricao: string;
  onProximo: () => void;
  onAnterior: () => void;
  onFinalizar: () => void;
}

export function OverlayTourGuiado({
  passoAtual,
  totalPassos,
  titulo,
  descricao,
  onProximo,
  onAnterior,
  onFinalizar,
}: TourGuiadoProps) {
  const [posicaoForcada, setPosicaoForcada] = useState<'topo' | 'rodape' | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinalizar();
      if (e.key === 'ArrowRight') onProximo();
      if (e.key === 'ArrowLeft') onAnterior();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onProximo, onAnterior, onFinalizar]);

  const posEfetiva = posicaoForcada || (passoAtual >= 4 || passoAtual === totalPassos ? 'topo' : 'rodape');

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Barra de Controle com posicionamento dinâmico inteligente */}
      <div
        className={`fixed left-1/2 transform -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto transition-all duration-300 ease-out z-[100] ${
          posEfetiva === 'topo' ? 'top-6' : 'bottom-6'
        }`}
      >
        <div className="rounded-2xl border-2 border-sky-400 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md ring-4 ring-sky-500/20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500 text-xs font-black text-white">
                {passoAtual}
              </span>
              <h4 className="text-xs font-black uppercase tracking-wider text-sky-400">
                Tour Guiado: {titulo}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">
                Passo {passoAtual} de {totalPassos}
              </span>
              <button
                type="button"
                onClick={() => setPosicaoForcada(posEfetiva === 'topo' ? 'rodape' : 'topo')}
                title={posEfetiva === 'topo' ? 'Mover painel para baixo' : 'Mover painel para o topo'}
                className="rounded-lg px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
              >
                {posEfetiva === 'topo' ? '⬇ Baixo' : '⬆ Topo'}
              </button>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-slate-200 leading-relaxed">
            {descricao}
          </p>

          {/* Dica de clique interativo automático */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sky-300 font-medium">
            <span>✨</span>
            <span>O elemento correspondente está destacado na tela em azul brilhante.</span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onFinalizar}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Pular / Encerrar
            </button>

            <div className="flex items-center gap-2">
              {passoAtual > 1 && (
                <button
                  type="button"
                  onClick={onAnterior}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  ← Anterior
                </button>
              )}
              {passoAtual < totalPassos ? (
                <button
                  type="button"
                  onClick={onProximo}
                  className="rounded-xl bg-sky-500 px-4 py-1.5 text-xs font-extrabold text-white shadow-md hover:bg-sky-400 transition-transform active:scale-95 cursor-pointer"
                >
                  Próximo Passo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinalizar}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-500 transition-transform active:scale-95 cursor-pointer"
                >
                  ✓ Concluir Tour
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
