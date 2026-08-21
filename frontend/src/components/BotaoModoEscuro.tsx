import { useState, useEffect } from 'react';
import { Icone } from './ui';

export function useModoEscuro() {
  const [escuro, setEscuro] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('oasis_theme');
      if (salvo) return salvo === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (escuro) {
      root.classList.add('dark');
      localStorage.setItem('oasis_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('oasis_theme', 'light');
    }
  }, [escuro]);

  const alternar = () => setEscuro(prev => !prev);

  return { escuro, alternar };
}

export default function BotaoModoEscuro({ className = '' }: { className?: string }) {
  const { escuro, alternar } = useModoEscuro();

  return (
    <button
      type="button"
      onClick={alternar}
      title={escuro ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      aria-label={escuro ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-600 shadow-xs transition-all duration-200 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-amber-300 cursor-pointer ${className}`}
    >
      <div className="transition-transform duration-300 group-hover:scale-110">
        {escuro ? (
          <Icone nome="sun" className="h-4 w-4 text-amber-400 transition-colors" />
        ) : (
          <Icone nome="moon" className="h-4 w-4 text-slate-600 group-hover:text-navy transition-colors" />
        )}
      </div>
    </button>
  );
}
