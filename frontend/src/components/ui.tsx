import React, { useEffect } from 'react';

/** Biblioteca de ícones SVG limpos do sistema OASIS (UI/UX Pro Max) */
export function Icone({
  nome,
  className = 'w-4 h-4',
}: {
  nome:
    | 'home'
    | 'calendar'
    | 'clock'
    | 'key'
    | 'package'
    | 'users'
    | 'megaphone'
    | 'check'
    | 'alert'
    | 'info'
    | 'trash'
    | 'edit'
    | 'eye'
    | 'filter'
    | 'search'
    | 'chevronDown'
    | 'chevronLeft'
    | 'chevronRight'
    | 'plus'
    | 'logout'
    | 'building'
    | 'pin'
    | 'shield'
    | 'x'
    | 'image'
    | 'upload'
    | 'sun'
    | 'moon'
    | 'user'
    | 'sparkles'
    | 'box'
    | 'wrench';
  className?: string;
}) {
  switch (nome) {
    case 'wrench':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'sun':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'moon':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    case 'home':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'key':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    case 'package':
    case 'box':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'check':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'alert':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'info':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'trash':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    case 'edit':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'eye':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case 'search':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'filter':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      );
    case 'plus':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'logout':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      );
    case 'pin':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-2 2H7a2 2 0 01-2-2V5zm7 4v12m-4-6h8" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case 'x':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'image':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'upload':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      );
    case 'user':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      );
    case 'chevronLeft':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      );
    default:
      return null;
  }
}

/** Título padronizado de página com hierarquia visual e suporte a ações */
export function Titulo({
  children,
  sub,
  icone,
  acao,
}: {
  children: React.ReactNode;
  sub?: string;
  icone?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icone && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400">
            {icone}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">{children}</h1>
          {sub && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 font-normal">{sub}</p>}
        </div>
      </div>
      {acao && <div className="flex shrink-0 items-center gap-2">{acao}</div>}
    </div>
  );
}

/** Cartão moderno com borda refinada e sombra suave */
export function Cartao({
  children,
  className = '',
  destaque = false,
}: {
  children: React.ReactNode;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white dark:bg-slate-900 dark:text-slate-200 p-5 transition-all duration-200 ${
        destaque
          ? 'border-navy/20 shadow-card ring-1 ring-navy/5 dark:border-sky-500/30 dark:ring-sky-500/10'
          : 'border-slate-200/80 shadow-soft hover:border-slate-300/80 dark:border-slate-800 dark:hover:border-slate-700'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Botão estilizado com variantes, estados de loading e micro-interação */
export function Botao(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variante?: 'primario' | 'secundario' | 'claro' | 'perigo' | 'sucesso' | 'fantasma';
    tamanho?: 'sm' | 'md' | 'lg';
    carregando?: boolean;
    icone?: React.ReactNode;
  }
) {
  const {
    variante = 'primario',
    tamanho = 'md',
    carregando = false,
    icone,
    className = '',
    children,
    disabled,
    ...rest
  } = props;

  const tamanhos = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }[tamanho];

  const estilos = {
    primario:
      'bg-navy text-white hover:bg-navy-light shadow-sm hover:shadow active:scale-[0.98] border border-transparent dark:bg-sky-600 dark:hover:bg-sky-500',
    secundario:
      'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 active:scale-[0.98] border border-slate-200/60 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-700 dark:hover:text-white',
    claro:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-navy hover:border-slate-300 shadow-sm active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white dark:hover:border-slate-600',
    perigo:
      'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow active:scale-[0.98] border border-transparent dark:bg-rose-600 dark:hover:bg-rose-500',
    sucesso:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow active:scale-[0.98] border border-transparent dark:bg-emerald-600 dark:hover:bg-emerald-500',
    fantasma:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98] border border-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  }[variante];

  return (
    <button
      disabled={disabled || carregando}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${tamanhos} ${estilos} ${className}`}
      {...rest}
    >
      {carregando ? (
        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        icone
      )}
      {children}
    </button>
  );
}

/** Campo de formulário com rótulo, indicador obrigatório e texto auxiliar */
export function Campo({
  rotulo,
  obrigatorio,
  ajuda,
  children,
  className = '',
}: {
  rotulo: string;
  obrigatorio?: boolean;
  ajuda?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span>
          {rotulo} {obrigatorio && <span className="text-red-500 dark:text-rose-400">*</span>}
        </span>
        {ajuda && <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{ajuda}</span>}
      </span>
      {children}
    </label>
  );
}

/** Classe padrão moderna para inputs de formulário */
export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 transition-all duration-150 outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-slate-600 dark:focus:border-sky-500 dark:focus:ring-sky-500/20 dark:disabled:bg-slate-800/40 dark:disabled:text-slate-500';

/** Badge / Pílula de status semântica com indicador colorido */
export function Badge({
  tipo = 'neutro',
  children,
  className = '',
}: {
  tipo?: 'sucesso' | 'aviso' | 'perigo' | 'info' | 'neutro' | 'primario';
  children: React.ReactNode;
  className?: string;
}) {
  const estilos = {
    sucesso: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    aviso: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    perigo: 'bg-red-50 text-red-700 border-red-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    primario: 'bg-navy-50 text-navy border-navy-200/80 dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700',
    neutro: 'bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  }[tipo];

  const dot = {
    sucesso: 'bg-emerald-500',
    aviso: 'bg-amber-500',
    perigo: 'bg-red-500 dark:bg-rose-500',
    info: 'bg-sky-500',
    primario: 'bg-navy dark:bg-sky-400',
    neutro: 'bg-slate-400 dark:bg-slate-500',
  }[tipo];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${estilos} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

/** Estado vazio (Empty State) elegante e comunicativo */
export function EmptyState({
  icone = 'info',
  titulo,
  descricao,
  acao,
}: {
  icone?: React.ComponentProps<typeof Icone>['nome'];
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-400">
        <Icone nome={icone} className="h-6 w-6" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{titulo}</h3>
      {descricao && <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

/** Modal dialog acessível e responsivo */
export function Modal({
  aberto,
  fechar,
  titulo,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean;
  fechar: () => void;
  titulo: string;
  children: React.ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    if (aberto) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [aberto, fechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in" onClick={fechar} />

      {/* Card */}
      <div
        className={`relative z-10 w-full ${largura} max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 dark:text-slate-100 p-6 shadow-modal border border-slate-100 dark:border-slate-800 animate-scale-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titulo}</h3>
          <button
            onClick={fechar}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Icone nome="x" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Modal padronizado de Confirmação e Validação de Ações (UI/UX Pro Max) */
export function ModalConfirmacao({
  aberto,
  fechar,
  confirmar,
  titulo,
  mensagem,
  textoBotaoConfirmar = 'Confirmar',
  textoBotaoCancelar = 'Cancelar',
  variante = 'perigo',
  icone = 'alert',
  carregando = false,
}: {
  aberto: boolean;
  fechar: () => void;
  confirmar: () => void;
  titulo: string;
  mensagem: React.ReactNode;
  textoBotaoConfirmar?: string;
  textoBotaoCancelar?: string;
  variante?: 'perigo' | 'primario' | 'sucesso';
  icone?: React.ComponentProps<typeof Icone>['nome'];
  carregando?: boolean;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    if (aberto) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [aberto, fechar]);

  if (!aberto) return null;

  const coresIcone = {
    perigo: 'bg-red-100 text-red-600 dark:bg-rose-950/60 dark:text-rose-400 ring-8 ring-red-50 dark:ring-rose-950/30',
    primario: 'bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-400 ring-8 ring-navy-50/50 dark:ring-sky-950/30',
    sucesso: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/30',
  }[variante];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-fade-in" onClick={fechar} />

      {/* Card Dialog */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 dark:text-slate-100 p-6 shadow-modal border border-slate-100 dark:border-slate-800 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${coresIcone}`}>
            <Icone nome={icone} className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titulo}</h3>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{mensagem}</div>
        </div>

        <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Botao type="button" variante="claro" onClick={fechar} disabled={carregando}>
            {textoBotaoCancelar}
          </Botao>
          <Botao
            type="button"
            variante={variante}
            onClick={confirmar}
            carregando={carregando}
          >
            {textoBotaoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}

/** Pop-up / Toast flutuante moderno de validação, notificação e feedback da ação */
export function Mensagem({
  texto,
  tipo = 'ok',
  aoFechar,
}: {
  texto: string;
  tipo?: 'erro' | 'ok' | 'aviso' | 'info';
  aoFechar?: () => void;
}) {
  const [visivel, setVisivel] = React.useState(Boolean(texto));

  React.useEffect(() => {
    if (texto) {
      setVisivel(true);
      const timer = setTimeout(() => {
        setVisivel(false);
        if (aoFechar) aoFechar();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisivel(false);
    }
  }, [texto, aoFechar]);

  if (!visivel || !texto) return null;

  const estilos = {
    erro: 'border-red-200/90 bg-white/95 text-red-950 dark:border-rose-800/80 dark:bg-slate-900/95 dark:text-rose-200 shadow-2xl ring-1 ring-red-500/10',
    ok: 'border-emerald-200/90 bg-white/95 text-emerald-950 dark:border-emerald-800/80 dark:bg-slate-900/95 dark:text-emerald-200 shadow-2xl ring-1 ring-emerald-500/10',
    aviso: 'border-amber-200/90 bg-white/95 text-amber-950 dark:border-amber-800/80 dark:bg-slate-900/95 dark:text-amber-200 shadow-2xl ring-1 ring-amber-500/10',
    info: 'border-sky-200/90 bg-white/95 text-sky-950 dark:border-sky-800/80 dark:bg-slate-900/95 dark:text-sky-200 shadow-2xl ring-1 ring-sky-500/10',
  }[tipo] || 'border-emerald-200/90 bg-white/95 text-emerald-950 dark:border-emerald-800/80 dark:bg-slate-900/95 dark:text-emerald-200';

  const badgeIcone = {
    erro: 'bg-red-500 text-white shadow-xs',
    ok: 'bg-emerald-500 text-white shadow-xs',
    aviso: 'bg-amber-500 text-white shadow-xs',
    info: 'bg-sky-500 text-white shadow-xs',
  }[tipo] || 'bg-emerald-500 text-white';

  const tituloTipo = {
    erro: 'Atenção / Erro',
    ok: 'Sucesso',
    aviso: 'Aviso',
    info: 'Informação',
  }[tipo] || 'Sucesso';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm sm:max-w-md animate-slide-in-right">
      <div className={`flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-md transition-all ${estilos}`}>
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${badgeIcone}`}>
          <Icone nome={tipo === 'erro' ? 'alert' : tipo === 'aviso' ? 'wrench' : 'check'} className="h-4 w-4" />
        </div>
        <div className="flex-1 pr-2">
          <h4 className="text-xs font-bold uppercase tracking-wider opacity-75">{tituloTipo}</h4>
          <p className="mt-0.5 text-xs font-medium leading-relaxed">{texto}</p>
        </div>
        <button
          onClick={() => {
            setVisivel(false);
            if (aoFechar) aoFechar();
          }}
          className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          title="Fechar notificação"
        >
          <Icone nome="x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
