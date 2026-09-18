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
}: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = moradores.find(m => String(m.id) === String(valor));

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

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
      {selecionado && !aberto ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 font-bold text-navy dark:bg-slate-700 dark:text-sky-400">
              <Icone nome="user" className="h-4 w-4" />
            </div>
            <div className="truncate">
              <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{selecionado.nome}</p>
              {formatarUnidade(selecionado) && (
                <p className="text-[11px] font-medium text-navy dark:text-sky-400">
                  {formatarUnidade(selecionado)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setAberto(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={limpar}
              title="Remover seleção"
              className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              <span className="text-sm font-bold leading-none px-1">×</span>
            </button>
          </div>
        </div>
      ) : (
        /* Campo de Busca */
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Icone nome="search" className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-navy focus:outline-hidden focus:ring-2 focus:ring-navy/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500"
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

      {/* Menu suspenso de resultados */}
      {aberto && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-fade-in">
          {filtrados.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              Nenhum morador encontrado para "{busca}".
            </div>
          ) : (
            filtrados.map(m => {
              const eSel = String(m.id) === String(valor);
              const infoApto = formatarUnidade(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selecionar(m.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left text-xs transition-colors cursor-pointer ${
                    eSel
                      ? 'bg-navy-50 text-navy font-bold dark:bg-slate-700 dark:text-sky-300'
                      : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {m.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{m.nome}</span>
                  </div>
                  {infoApto && (
                    <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {infoApto}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
