/** Componentes visuais reutilizados pelas telas. */
export function Titulo({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold text-navy">{children}</h1>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function Cartao({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'rounded-xl border bg-white p-5 shadow-sm ' + className}>{children}</div>;
}

export function Botao(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'claro' | 'perigo' }) {
  const { variante = 'primario', className = '', ...rest } = props;
  const estilos = {
    primario: 'bg-navy text-white hover:bg-navy-light',
    claro: 'border bg-white text-navy hover:bg-slate-50',
    perigo: 'bg-red-600 text-white hover:bg-red-700',
  }[variante];
  return <button {...rest}
    className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40 ${estilos} ${className}`} />;
}

export function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-500">{rotulo}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30';

export function Mensagem({ texto, tipo }: { texto: string; tipo: 'erro' | 'ok' }) {
  if (!texto) return null;
  return (
    <div className={'mt-3 rounded-lg px-4 py-2 text-sm ' +
      (tipo === 'erro' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
      {texto}
    </div>
  );
}
