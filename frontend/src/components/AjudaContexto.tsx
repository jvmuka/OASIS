import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { obterAjudaPorRota, AjudaTela } from '../config/ajudaContextoConfig';
import { Icone } from './ui';
import { SimuladorAnimadoUniversal, OverlayTourGuiado } from './GuiaInterativoReserva';

interface BotaoAjudaContextoProps {
  ajudaKey?: string;
  className?: string;
}

export function BotaoAjudaContexto({ ajudaKey, className = '' }: BotaoAjudaContextoProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [tourAtivo, setTourAtivo] = useState(false);
  const [passoTour, setPassoTour] = useState(1);
  const location = useLocation();

  const dadosAjuda: AjudaTela | null = obterAjudaPorRota(location.pathname, ajudaKey);

  // Efeito para destacar elementos durante o Tour Guiado na tela real
  useEffect(() => {
    if (!tourAtivo || !dadosAjuda?.passoAPasso) return;

    const passoInfo = dadosAjuda.passoAPasso[passoTour - 1];
    if (passoInfo?.alvoSelector) {
      const el = document.querySelector(passoInfo.alvoSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tour-spotlight-active');
      }
    }

    return () => {
      document.querySelectorAll('.tour-spotlight-active').forEach((el) => {
        el.classList.remove('tour-spotlight-active');
      });
    };
  }, [tourAtivo, passoTour, dadosAjuda]);

  // Escuta cliques reais do usuário na tela para avançar o tour automaticamente
  useEffect(() => {
    if (!tourAtivo) return;

    const handleAvancar = (e: any) => {
      const passoConcluido = e.detail?.passoConcluido;
      if (passoConcluido === passoTour) {
        if (dadosAjuda?.passoAPasso && passoTour < dadosAjuda.passoAPasso.length) {
          setPassoTour((p) => p + 1);
        } else {
          setTourAtivo(false);
        }
      } else if (passoConcluido && passoConcluido > 0) {
        setPassoTour(Math.min(dadosAjuda?.passoAPasso?.length || 4, passoConcluido + 1));
      }
    };

    const handleConcluir = () => {
      setTourAtivo(false);
    };

    const handleVoltarInicio = () => {
      setPassoTour(1);
    };

    window.addEventListener('oasis:tour-avancar', handleAvancar);
    window.addEventListener('oasis:tour-concluir', handleConcluir);
    window.addEventListener('oasis:tour-voltar-inicio', handleVoltarInicio);

    return () => {
      window.removeEventListener('oasis:tour-avancar', handleAvancar);
      window.removeEventListener('oasis:tour-concluir', handleConcluir);
      window.removeEventListener('oasis:tour-voltar-inicio', handleVoltarInicio);
    };
  }, [tourAtivo, passoTour, dadosAjuda]);

  if (!dadosAjuda) return null;

  const iniciarTour = () => {
    setModalAberto(false);
    setPassoTour(1);
    setTourAtivo(true);
  };

  const proximoPassoTour = () => {
    if (dadosAjuda?.passoAPasso && passoTour < dadosAjuda.passoAPasso.length) {
      setPassoTour((p) => p + 1);
    } else {
      setTourAtivo(false);
    }
  };

  const anteriorPassoTour = () => {
    if (passoTour > 1) {
      setPassoTour((p) => p - 1);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        title="Ajuda desta tela (Como navegar e usar)"
        aria-label="Ajuda desta tela"
        className={`group relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/80 bg-sky-50 text-sky-700 shadow-sm transition-all duration-200 hover:scale-110 hover:border-sky-500 hover:bg-sky-500 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-sky-600/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white cursor-pointer ${className}`}
      >
        <span className="text-sm font-extrabold select-none">?</span>
        <span className="absolute -inset-0.5 rounded-full border border-sky-400/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100 animate-pulse pointer-events-none" />
      </button>

      {modalAberto && (
        <ModalAjudaContexto
          dados={dadosAjuda}
          rota={location.pathname}
          fechar={() => setModalAberto(false)}
          onIniciarTour={dadosAjuda.passoAPasso && dadosAjuda.passoAPasso.length > 0 ? iniciarTour : undefined}
        />
      )}

      {tourAtivo && dadosAjuda.passoAPasso && (
        <OverlayTourGuiado
          passoAtual={passoTour}
          totalPassos={dadosAjuda.passoAPasso.length}
          titulo={dadosAjuda.passoAPasso[passoTour - 1]?.titulo || 'Passo a Passo'}
          descricao={dadosAjuda.passoAPasso[passoTour - 1]?.descricao || ''}
          onProximo={proximoPassoTour}
          onAnterior={anteriorPassoTour}
          onFinalizar={() => setTourAtivo(false)}
        />
      )}
    </>
  );
}

interface ModalAjudaContextoProps {
  dados: AjudaTela;
  rota?: string;
  fechar: () => void;
  onIniciarTour?: () => void;
}

export function ModalAjudaContexto({ dados, rota = '', fechar, onIniciarTour }: ModalAjudaContextoProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', handleKeyDown);
    const scrollOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = scrollOriginal;
    };
  }, [fechar]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={fechar}
    >
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-soft">
              <span className="text-xl font-black">?</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold tracking-wider text-sky-800 uppercase dark:bg-sky-950 dark:text-sky-300">
                  Como Usar o Sistema
                </span>
                {dados.temTourAnimado && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                    ★ Com Animação Interativa
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {dados.titulo}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {dados.subtitulo}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fechar}
            title="Fechar ajuda (ESC)"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Icone nome="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem interna suave */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-6">
          {/* Card de Resumo */}
          <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
            <p className="leading-relaxed">{dados.resumo}</p>
          </div>

          {/* Simulador Interativo Universal */}
          {dados.passoAPasso && dados.passoAPasso.length > 0 && (
            <div className="space-y-3">
              <SimuladorAnimadoUniversal passos={dados.passoAPasso} tituloTela={dados.titulo} rota={rota} />
              {onIniciarTour && (
                <button
                  type="button"
                  onClick={onIniciarTour}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:from-sky-600 hover:to-indigo-700 transition-transform active:scale-[0.99] cursor-pointer"
                >
                  <span>👆</span>
                  <span>Ver Onde Clicar na Tela Real (Iniciar Demonstração Guiada)</span>
                </button>
              )}
            </div>
          )}

          {/* Passo a Passo Ilustrado */}
          {dados.passoAPasso && dados.passoAPasso.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                  ✓
                </span>
                Passo a Passo Detalhado
              </h3>
              <div className="mt-3 space-y-3">
                {dados.passoAPasso.map((p) => (
                  <div
                    key={p.passo}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-colors hover:border-slate-200 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-xs font-bold text-white dark:bg-sky-600">
                      {p.passo}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {p.titulo}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {p.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dicas Úteis */}
          {dados.dicas && dados.dicas.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  ★
                </span>
                Dicas Importantes
              </h3>
              <ul className="mt-3 space-y-2">
                {dados.dicas.map((dica, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-amber-100 bg-amber-50/50 p-2.5 text-xs text-amber-900 dark:border-amber-950/50 dark:bg-amber-950/20 dark:text-amber-200"
                  >
                    <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{dica}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dúvidas Frequentes */}
          {dados.duvidasFrequentes && dados.duvidasFrequentes.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                  ?
                </span>
                Perguntas Frequentes
              </h3>
              <div className="mt-3 space-y-2.5">
                {dados.duvidasFrequentes.map((df, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-800"
                  >
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {df.pergunta}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {df.resposta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800 shrink-0">
          <span className="text-[11px] text-slate-400">
            Dica: pressione <kbd className="rounded border border-slate-300 px-1 py-0.5 text-[10px] font-mono dark:border-slate-700">ESC</kbd> para fechar a qualquer momento
          </span>
          <button
            type="button"
            onClick={fechar}
            className="rounded-xl bg-navy px-5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-navy-light active:scale-[0.98] dark:bg-sky-600 dark:hover:bg-sky-500 cursor-pointer"
          >
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
