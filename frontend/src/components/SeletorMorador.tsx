import React, { useState, useRef, useEffect } from 'react';
import { Icone } from './ui';

export type MoradorOpcao = {
  id: string | number;
  nome: string;
  unidades?: { bloco?: string; apartamento?: string }[];
};

type Props = {
  moradores: MoradorOpcao[];
  valor: string | number;
  onChange: (id: string) => void;
  placeholder?: string;
  obrigatorio?: boolean;
  menuEstatico?: boolean;
};

function normalizar(txt: string) {
  return (txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Seletor de morador com busca instantânea por Nome, Apartamento ou Bloco.
 * Permite ao porteiro localizar o morador digitando número do apartamento ou parte do nome.
 */
export default function SeletorMorador({
  moradores,
  valor,
  onChange,
  placeholder = 'Buscar por nome ou número do apartamento...',
  obrigatorio = false,
  menuEstatico = false,
}: Props) {
  const [aberto, setAberto] = useState(menuEstatico ? !valor : false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = moradores.find(m => String(m.id) === String(valor));

  // Fecha o dropdown ao clicar fora se houver valor ou se não for menu estático
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (!menuEstatico || valor) {
          setAberto(false);
        }
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, [menuEstatico, valor]);

  const buscaNorm = normalizar(busca);

  // Filtra por nome, número do apartamento ou bloco
  const filtrados = moradores.filter(m => {
    if (!buscaNorm) return true;
    const nomeNorm = normalizar(m.nome);
    if (nomeNorm.includes(buscaNorm)) return true;

    if (m.unidades && m.unidades.length > 0) {
      return m.unidades.some(u => {
        const apto = normalizar(u.apartamento || '');
        const bloco = normalizar(u.bloco || '');
        return (
          apto.includes(buscaNorm) ||
          bloco.includes(buscaNorm) ||
          `apto ${apto}`.includes(buscaNorm) ||
          `bloco ${bloco}`.includes(buscaNorm) ||
          `${bloco} ${apto}`.includes(buscaNorm)
        );
      });
    }
    return false;
  });

  function selecionar(id: string | number) {
    onChange(String(id));
    setAberto(false);
    setBusca('');
  }

  function limpar() {
    onChange('');
    setBusca('');
    setAberto(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function formatarUnidade(m: MoradorOpcao) {
    if (!m.unidades || m.unidades.length === 0) return null;
    return m.unidades
      .map(u => (u.bloco ? `Bloco ${u.bloco}, Apto ${u.apartamento}` : `Apto ${u.apartamento}`))
      .join(' | ');
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Visualização de Selecionado */}
      {selecionado && !aberto ? (() => {
        const matchPrestadorSel = selecionado.nome.match(/\((Prestador(?::\s*[^)]+)?|Prestador de Serviço)\)/);
        const ehPrestadorSel = Boolean(matchPrestadorSel);
        const rotuloBadgeSel = matchPrestadorSel ? matchPrestadorSel[1] : 'Prestador';
        const nomeExibicaoSel = selecionado.nome.replace(/\s*\((Prestador(?::\s*[^)]+)?|Prestador de Serviço)\)/, '');

        return (
          <div className="flex items-center justify-between gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 sm:p-3 text-xs shadow-2xs dark:border-emerald-800/50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg font-bold ${
                  ehPrestadorSel
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                }`}
              >
                <Icone nome={ehPrestadorSel ? 'wrench' : 'user'} className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{nomeExibicaoSel}</p>
                  {ehPrestadorSel && (
                    <span className="shrink-0 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {rotuloBadgeSel}
                    </span>
                  )}
                </div>
                {formatarUnidade(selecionado) && (
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 truncate">
                    {formatarUnidade(selecionado)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAberto(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white bg-white/80 border border-slate-200/80 dark:text-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={limpar}
                title="Remover seleção"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <Icone nome="x" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })() : (
        /* Campo de Busca */
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-400">
            <Icone nome="search" className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-navy focus:outline-hidden focus:ring-2 focus:ring-navy/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400 dark:focus:border-sky-500"
            placeholder={placeholder}
            value={busca}
            onFocus={() => setAberto(true)}
            onChange={e => {
              setBusca(e.target.value);
              setAberto(true);
            }}
            required={obrigatorio && !valor}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <span className="text-xs font-bold leading-none">×</span>
            </button>
          )}
        </div>
      )}

      {/* Menu suspenso ou lista estática de resultados */}
      {aberto && (
        <div
          className={
            menuEstatico
              ? 'relative mt-2 max-h-56 sm:max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800/95 animate-fade-in'
              : 'absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-fade-in'
          }
        >
          {filtrados.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Nenhum morador ou prestador encontrado para "{busca}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtrados.map(m => {
                const eSel = String(m.id) === String(valor);
                const infoApto = formatarUnidade(m);
                const matchPrestador = m.nome.match(/\((Prestador(?::\s*[^)]+)?|Prestador de Serviço)\)/);
                const ehPrestador = Boolean(matchPrestador);
                const rotuloBadge = matchPrestador ? matchPrestador[1] : 'Prestador';
                const nomeExibicao = m.nome.replace(/\s*\((Prestador(?::\s*[^)]+)?|Prestador de Serviço)\)/, '');

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selecionar(m.id)}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-lg p-2.5 text-left text-xs transition-colors cursor-pointer ${
                      eSel
                        ? 'bg-navy-50 text-navy font-bold dark:bg-slate-700 dark:text-sky-300'
                        : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          ehPrestador
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-navy-50 text-navy dark:bg-slate-700 dark:text-sky-400'
                        }`}
                      >
                        {ehPrestador ? '🔧' : nomeExibicao.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold truncate text-slate-900 dark:text-slate-100">
                            {nomeExibicao}
                          </span>
                          {ehPrestador && (
                            <span className="shrink-0 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                              {rotuloBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {infoApto && (
                      <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-700/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {infoApto}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
