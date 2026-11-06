import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PassoAjuda } from '../config/ajudaContextoConfig';
import { Icone } from './ui';

// ----------------------------------------------------
// SIMULADOR ESPECÍFICO DE NOVA RESERVA (/morador/reservar)
// ----------------------------------------------------
export function SimuladorAnimadoReserva() {
  const [passo, setPasso] = useState(1);
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
    <div className="rounded-2xl border border-[#e2e6ec] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0e1525]">
      <div className="flex items-center justify-between border-b border-[#e2e6ec] pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0b1830] text-xs font-bold text-white shadow-2xs dark:bg-sky-600">
            <Icone nome="play" className="h-3 w-3" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b1830] dark:text-slate-100">
            Animação: Onde Clicar para Reservar
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1"
          >
            <Icone nome={autoPlay ? 'clock' : 'play'} className="h-3 w-3 text-slate-500" />
            <span>{autoPlay ? 'Pausar' : 'Reproduzir'}</span>
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
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 hover:bg-[#f6f7f9] border border-[#e2e6ec] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Palco da Animação Interativa (Padrão Lettly SaaS UI limpo) */}
      <div className="relative mt-3 h-56 w-full overflow-hidden rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] dark:bg-[#0b1830] dark:border-slate-800 p-4 text-slate-800 dark:text-slate-200 shadow-inner flex flex-col justify-between select-none">
        {/* Passo 1: Card de Área Comum */}
        {passo === 1 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Etapa 1: Escolha a Área Comum</span>
              <span className="rounded bg-sky-100 text-[#2548a0] dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold">1 de 4</span>
            </div>

            <div className="relative mx-auto my-auto w-64 rounded-xl border-2 border-navy bg-white dark:bg-[#0e1525] p-3 shadow-card ring-2 ring-navy/15 dark:border-sky-500 dark:ring-sky-500/20 transform transition-transform">
              <div className="h-16 w-full rounded-lg bg-[#0b1830] text-white flex items-center justify-center font-bold text-sm shadow-2xs gap-2">
                <Icone nome="building" className="h-4 w-4 text-sky-400" />
                <span>Salão de Festas</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                <span>Capacidade: 50 pessoas</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">• Disponível</span>
              </div>

              {/* Cursor discreto e profissional */}
              <div className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1.5 bg-navy text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md dark:bg-sky-600">
                <Icone nome="chevronRight" className="h-3 w-3 text-sky-300" />
                <span className="text-[10px]">Clique aqui</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Clique no card do espaço que deseja reservar.
            </p>
          </div>
        )}

        {/* Passo 2: Seleção de Data no Calendário */}
        {passo === 2 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Etapa 2: Selecione o Dia</span>
              <span className="rounded bg-sky-100 text-[#2548a0] dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold">2 de 4</span>
            </div>

            <div className="mx-auto my-auto w-64 rounded-xl border border-[#e2e6ec] bg-white dark:bg-[#0e1525] dark:border-slate-800 p-3 shadow-2xs relative">
              <div className="text-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Calendário de Reservas</div>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                <span className="text-slate-400 font-bold">D</span>
                <span className="text-slate-400 font-bold">S</span>
                <span className="text-slate-400 font-bold">T</span>
                <span className="text-slate-400 font-bold">Q</span>
                <span className="text-slate-400 font-bold">Q</span>
                <span className="text-slate-400 font-bold">S</span>
                <span className="text-slate-400 font-bold">S</span>
                {[10, 11, 12, 13, 14].map(d => (
                  <span key={d} className="rounded p-1 text-slate-400">{d}</span>
                ))}
                {/* Dia Selecionado com destaque */}
                <div className="relative rounded bg-navy dark:bg-sky-600 p-1 font-extrabold text-white">
                  <span>15</span>
                  <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 h-1 w-1 bg-amber-400 rounded-full" />
                </div>
                {[16, 17, 18, 19, 20].map(d => (
                  <span key={d} className="rounded p-1 text-slate-400">{d}</span>
                ))}
              </div>

              {/* Cursor animado */}
              <div className="absolute top-1/2 left-2/3 flex items-center gap-1 bg-navy text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-md dark:bg-sky-600">
                <Icone nome="chevronRight" className="h-3 w-3 text-sky-300" />
                <span className="text-[10px]">Escolha a data</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Clique no dia desejado. Dias com bolinha possuem ocupação.
            </p>
          </div>
        )}

        {/* Passo 3: Escolha do Horário Livre */}
        {passo === 3 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Etapa 3: Escolha o Horário</span>
              <span className="rounded bg-sky-100 text-[#2548a0] dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold">3 de 4</span>
            </div>

            <div className="mx-auto my-auto w-64 space-y-1.5">
              <div className="flex items-center justify-between rounded-lg border border-[#e2e6ec] bg-white dark:bg-[#0e1525] p-2 text-xs opacity-50">
                <span>08:00 - 12:00</span>
                <span className="rounded bg-slate-100 text-slate-500 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold">Ocupado</span>
              </div>

              {/* Slot Verde Selecionado */}
              <div className="relative flex items-center justify-between rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 dark:border-emerald-500 p-2 text-xs font-bold text-emerald-900 dark:text-emerald-100 shadow-2xs">
                <span>13:00 - 17:00</span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] text-white">LIVRE</span>

                {/* Cursor animado */}
                <div className="absolute -right-2 -bottom-2 flex items-center gap-1 bg-emerald-700 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-md">
                  <Icone nome="chevronRight" className="h-3 w-3" />
                  <span className="text-[10px]">Selecione</span>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#e2e6ec] bg-white dark:bg-[#0e1525] p-2 text-xs opacity-50">
                <span>18:00 - 22:00</span>
                <span className="rounded bg-slate-100 text-slate-500 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold">Ocupado</span>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
              Clique no botão com o horário livre desejado.
            </p>
          </div>
        )}

        {/* Passo 4: Confirmação */}
        {passo === 4 && (
          <div className="animate-fade-in flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold">Etapa 4: Confirmação</span>
              <span className="rounded bg-emerald-100 text-[#1e8e5a] dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">Conclusão</span>
            </div>

            <div className="mx-auto my-auto w-64 rounded-xl border border-emerald-200 bg-white dark:bg-[#0e1525] dark:border-emerald-800 p-3.5 text-center shadow-2xs">
              <div className="flex justify-center mb-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                  <Icone nome="check" className="h-4 w-4" />
                </span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Resumo da Reserva</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Salão de Festas • 15/11 • 13h às 17h</div>

              <div className="relative mt-2.5 inline-block">
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors"
                >
                  Confirmar Reserva
                </button>
                <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-[#0b1830] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
                  <Icone nome="chevronRight" className="h-3 w-3 text-sky-400" />
                  <span>Confirmar</span>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-emerald-700 dark:text-emerald-400 font-bold">
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
  // Se for a tela de reservas de morador, usa a simulação especializada
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
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-[#e2e6ec] bg-white dark:bg-[#0e1525] dark:border-slate-800 p-4 shadow-2xs flex flex-col items-center justify-center text-center">
          <div className="text-[11px] font-semibold text-slate-400 mb-2.5">Painel de Ações Rápidas</div>
          <div className="relative inline-block">
            <button
              type="button"
              className="rounded-xl bg-navy text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-navy/90 dark:bg-sky-600 flex items-center gap-1.5"
            >
              <Icone nome="plus" className="h-3.5 w-3.5" />
              <span>{p.titulo.replace(/^(Clique em|Abra o|Cadastre|Adicione)\s+/i, '').slice(0, 22) || 'Ação Principal'}</span>
            </button>
            <div className="absolute -bottom-2.5 -right-2.5 flex items-center gap-1 bg-[#0b1830] text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md">
              <Icone nome="chevronRight" className="h-3 w-3 text-sky-400" />
              <span>Clique</span>
            </div>
          </div>
        </div>
      );
    }

    // 2. Filtros, Abas ou Triagem de Status
    if (t.includes('filtro') || t.includes('aba') || t.includes('triagem') || t.includes('status') || t.includes('categoria')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-[#e2e6ec] bg-white dark:bg-[#0e1525] dark:border-slate-800 p-3 shadow-2xs">
          <div className="text-[10px] text-slate-500 font-semibold mb-2">Seleção de Filtro / Status:</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="rounded-lg bg-navy px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs dark:bg-sky-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Ativos</span>
            </span>
            <span className="rounded-lg bg-[#f6f7f9] border border-[#e2e6ec] px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              Concluídas
            </span>
            <span className="rounded-lg bg-[#f6f7f9] border border-[#e2e6ec] px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
              Todos
            </span>
          </div>
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-navy text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md dark:bg-sky-600">
            <Icone nome="chevronRight" className="h-3 w-3 text-sky-400" />
            <span>Alterne</span>
          </div>
        </div>
      );
    }

    // 3. Formulário / Preenchimento de Dados
    if (t.includes('preencha') || t.includes('dados') || t.includes('formulário') || t.includes('informe') || t.includes('redigir') || t.includes('foto')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-[#e2e6ec] bg-white dark:bg-[#0e1525] dark:border-slate-800 p-3.5 shadow-2xs space-y-2">
          <div className="h-6 w-full rounded-lg bg-[#f6f7f9] dark:bg-slate-800 px-2 flex items-center text-[10px] text-slate-500 border border-[#e2e6ec] dark:border-slate-700">
            <span>Título / Descrição...</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-6 flex-1 rounded-lg bg-[#f6f7f9] dark:bg-slate-800 px-2 flex items-center text-[10px] text-slate-500 border border-[#e2e6ec] dark:border-slate-700">
              <span>Categoria</span>
            </div>
            <div className="h-6 w-20 rounded-lg bg-[#f6f7f9] dark:bg-slate-800 px-1 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 border border-[#e2e6ec] dark:border-slate-700 gap-1">
              <Icone nome="fileText" className="h-3 w-3 text-slate-400" />
              <span>Anexo</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-navy text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md dark:bg-sky-600">
            <Icone nome="chevronRight" className="h-3 w-3 text-sky-400" />
            <span>Preencha</span>
          </div>
        </div>
      );
    }

    // 4. Confirmação / Aprovação / Baixa / Conclusão
    if (t.includes('confirmar') || t.includes('aprovar') || t.includes('concluir') || t.includes('finalizar') || t.includes('entregar') || t.includes('devolução') || t.includes('responder')) {
      return (
        <div className="relative mx-auto my-auto w-64 rounded-xl border border-emerald-200 bg-white dark:bg-[#0e1525] dark:border-emerald-800/80 p-3.5 text-center shadow-2xs">
          <div className="flex justify-center mb-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
              <Icone nome="check" className="h-4 w-4" />
            </span>
          </div>
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Confirmação da Operação</div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Validação registrada com sucesso</p>
          <div className="relative mt-2 inline-block">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
            >
              Confirmar & Salvar
            </button>
            <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-navy text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-md">
              <Icone nome="chevronRight" className="h-2.5 w-2.5 text-sky-300" />
              <span>Salvar</span>
            </div>
          </div>
        </div>
      );
    }

    // 5. Tabela / Listagem / Histórico Geral
    return (
      <div className="relative mx-auto my-auto w-64 rounded-xl border border-[#e2e6ec] bg-white dark:bg-[#0e1525] dark:border-slate-800 p-3 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] border-b border-[#e2e6ec] dark:border-slate-800 pb-1 text-slate-400">
          <span>Item / Registro</span>
          <span>Status</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[#f6f7f9] dark:bg-slate-800 p-1.5 text-xs border border-[#e2e6ec] dark:border-slate-700">
          <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">#01 • Em Andamento</span>
          <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">Ativo</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-[#f6f7f9] dark:bg-slate-800 p-1.5 text-xs opacity-60">
          <span className="text-[11px] text-slate-500">#02 • Histórico</span>
          <span className="text-[9px] text-slate-500">Concluído</span>
        </div>
        <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-navy text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md dark:bg-sky-600">
          <Icone nome="chevronRight" className="h-3 w-3 text-sky-300" />
          <span>Ver dados</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-[#e2e6ec] bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0e1525]">
      <div className="flex items-center justify-between border-b border-[#e2e6ec] pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0b1830] text-xs font-bold text-white shadow-2xs dark:bg-sky-600">
            <Icone nome="play" className="h-3 w-3" />
          </span>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b1830] dark:text-slate-100">
            Animação: {passoAtual.titulo}
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoPlay(!autoPlay)}
            className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1"
          >
            <Icone nome={autoPlay ? 'clock' : 'play'} className="h-3 w-3 text-slate-500" />
            <span>{autoPlay ? 'Pausar' : 'Reproduzir'}</span>
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
                ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                : 'bg-white text-slate-600 hover:bg-[#f6f7f9] border border-[#e2e6ec] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title={`Passo ${item.passo}: ${item.titulo}`}
          >
            {item.passo}. {item.titulo.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Palco da Animação Interativa */}
      <div className="relative mt-3 h-56 w-full overflow-hidden rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] dark:bg-[#0b1830] dark:border-slate-800 p-4 text-slate-800 dark:text-slate-200 shadow-inner flex flex-col justify-between select-none">
        <div className="animate-fade-in flex flex-col justify-between h-full">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Etapa {passo}: {passoAtual.titulo}
            </span>
            <span className="rounded bg-sky-100 text-[#2548a0] dark:bg-sky-950 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold">
              {passo} de {listaPassos.length}
            </span>
          </div>

          {/* Elemento visual simulado dinâmico */}
          {renderMockupVisual(passoAtual)}

          <p className="text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
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
  alvoSelector?: string;
  onProximo: () => void;
  onAnterior: () => void;
  onFinalizar: () => void;
}

export function OverlayTourGuiado({
  passoAtual,
  totalPassos,
  titulo,
  descricao,
  alvoSelector,
  onProximo,
  onAnterior,
  onFinalizar,
}: TourGuiadoProps) {
  const [posicaoForcada, setPosicaoForcada] = useState<'topo' | 'rodape' | null>(null);
  const [alvoRect, setAlvoRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Calcula e acompanha a posição do elemento alvo em tempo real na tela
  useEffect(() => {
    const calcularPosicao = () => {
      if (!alvoSelector) {
        setAlvoRect(null);
        return;
      }
      const el = document.querySelector(alvoSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setAlvoRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          return;
        }
      }
      setAlvoRect(null);
    };

    calcularPosicao();

    // Rastreia durante o scroll suave inicial até o elemento
    let frameId: number;
    const tempoInicio = Date.now();
    const animar = () => {
      calcularPosicao();
      if (Date.now() - tempoInicio < 800) {
        frameId = requestAnimationFrame(animar);
      }
    };
    frameId = requestAnimationFrame(animar);

    window.addEventListener('scroll', calcularPosicao, { passive: true, capture: true });
    window.addEventListener('resize', calcularPosicao);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', calcularPosicao, true);
      window.removeEventListener('resize', calcularPosicao);
    };
  }, [alvoSelector, passoAtual]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinalizar();
      if (e.key === 'ArrowRight') onProximo();
      if (e.key === 'ArrowLeft') onAnterior();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onProximo, onAnterior, onFinalizar]);

  // Posicionamento inteligente automático da barra:
  // Se o elemento estiver na metade inferior da tela, posiciona a barra no topo
  // Se o elemento estiver na metade superior, posiciona no rodapé para nunca cobrir o elemento
  const posAutomatica = alvoRect
    ? (alvoRect.top > (window.innerHeight / 2) ? 'topo' : 'rodape')
    : (passoAtual >= 3 ? 'topo' : 'rodape');

  const posEfetiva = posicaoForcada || posAutomatica;

  const PADDING = 8;
  const RAIO = 12;

  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* 1. Backdrop escuro com recorte (cutout): fora da área escurece, e onde clica fica 100% normal e visível */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none z-[90] transition-opacity duration-300"
        style={{ width: '100vw', height: '100vh' }}
      >
        <defs>
          <mask id="tour-spotlight-cutout" maskUnits="userSpaceOnUse">
            {/* Camada branca = toda a tela escurece */}
            <rect x="0" y="0" width="100%" height="100%" fill="#ffffff" />

            {/* Recorte preto = buraco transparente onde o elemento original permanece 100% visível e normal */}
            {alvoRect && (
              <rect
                x={Math.max(0, alvoRect.left - PADDING)}
                y={Math.max(0, alvoRect.top - PADDING)}
                width={alvoRect.width + PADDING * 2}
                height={alvoRect.height + PADDING * 2}
                rx={RAIO}
                ry={RAIO}
                fill="#000000"
              />
            )}
          </mask>
        </defs>

        {/* Retângulo escuro corporativo (Deep Navy #0b1830 com opacidade suave) aplicado com o recorte */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(11, 24, 48, 0.74)"
          mask="url(#tour-spotlight-cutout)"
        />

        {/* Borda destacada sutil contornando o elemento ativo para máxima clareza */}
        {alvoRect && (
          <rect
            x={Math.max(0, alvoRect.left - PADDING)}
            y={Math.max(0, alvoRect.top - PADDING)}
            width={alvoRect.width + PADDING * 2}
            height={alvoRect.height + PADDING * 2}
            rx={RAIO}
            ry={RAIO}
            fill="none"
            stroke="#0284c7"
            strokeWidth={3}
            className="animate-pulse"
          />
        )}
      </svg>

      {/* 2. Barra de Controle Flutuante com posicionamento dinâmico inteligente */}
      <div
        className={`fixed left-1/2 transform -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto transition-all duration-300 ease-out z-[100] ${
          posEfetiva === 'topo' ? 'top-6' : 'bottom-6'
        }`}
      >
        <div className="rounded-2xl border border-slate-700 bg-[#0b1830] p-4 text-white shadow-2xl dark:bg-[#0e1525] dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#2548a0] text-xs font-bold text-white">
                {passoAtual}
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Tour Guiado: {titulo}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">
                Passo {passoAtual} de {totalPassos}
              </span>
              <button
                type="button"
                onClick={() => setPosicaoForcada(posEfetiva === 'topo' ? 'rodape' : 'topo')}
                title={posEfetiva === 'topo' ? 'Mover painel para baixo' : 'Mover painel para o topo'}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
              >
                <Icone nome="chevronDown" className={`h-3 w-3 ${posEfetiva === 'topo' ? '' : 'rotate-180'}`} />
                <span>{posEfetiva === 'topo' ? 'Rodapé' : 'Topo'}</span>
              </button>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-slate-200 leading-relaxed font-normal">
            {descricao}
          </p>

          {/* Dica de clique interativo automático */}
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sky-300 font-medium">
            <Icone nome="info" className="h-3.5 w-3.5 shrink-0 text-sky-400" />
            <span>A área de ação está normal e destacada; clique diretamente nela para interagir ou avance abaixo.</span>
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
                  className="rounded-xl bg-navy px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-navy/90 dark:bg-sky-600 dark:hover:bg-sky-500 transition-transform active:scale-95 cursor-pointer"
                >
                  Próximo Passo →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinalizar}
                  className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Icone nome="check" className="h-3.5 w-3.5" />
                  <span>Concluir Tour</span>
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
