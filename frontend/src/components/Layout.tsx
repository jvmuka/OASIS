import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { painelInicial, sessaoAtual, sair } from '../api';
import { Icone, Badge } from './ui';
import BotaoModoEscuro from './BotaoModoEscuro';

/**
 * Casca comum de todas as telas internas:
 * Topo com identificação do usuário + menu lateral com ícones e suporte a mobile drawer.
 */
export default function Layout() {
  const nav = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const s = sessaoAtual();
  if (!s) return null;
  const tipos = s.perfis.map(p => p.tipo);
  const rotaInicial = painelInicial(s);

  // Iniciais do nome para avatar
  const iniciais = s.pessoa.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('');

  const textoApto = s.unidades && s.unidades.length > 0
    ? s.unidades.map(u => (u.bloco ? `Apto ${u.numero_apartamento} (${u.bloco})` : `Apto ${u.numero_apartamento}`)).join(', ')
    : null;

  const item = (to: string, rotulo: string, icone: React.ComponentProps<typeof Icone>['nome']) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMenuAberto(false)}
      className={({ isActive }) =>
        'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ' +
        (isActive
          ? 'bg-navy-50 text-navy font-semibold shadow-xs ring-1 ring-navy/10 dark:bg-slate-800 dark:text-sky-400 dark:ring-slate-700'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100')
      }
    >
      {({ isActive }) => (
        <>
          <Icone
            nome={icone}
            className={`h-4 w-4 transition-colors ${isActive ? 'text-navy dark:text-sky-400' : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
              }`}
          />
          <span className="truncate">{rotulo}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Header Superior */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Abrir menu"
          >
            <Icone nome={menuAberto ? 'x' : 'filter'} className="h-5 w-5" />
          </button>

          <Link to={rotaInicial} className="flex items-center gap-2 group" title="Ir para o painel inicial">
            <div className="flex items-center">
              <img
                src="/logos/logo-deitada-navy.png"
                alt="OASIS"
                className="h-7 sm:h-8 w-auto object-contain dark:hidden transition-transform duration-150 group-hover:scale-[1.02]"
              />
              <img
                src="/logos/logo-deitada-sky.png"
                alt="OASIS"
                className="h-7 sm:h-8 w-auto object-contain hidden dark:block transition-transform duration-150 group-hover:scale-[1.02]"
              />
            </div>
            <span className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-block tracking-wider uppercase">
              Condomínio
            </span>
          </Link>
        </div>

        {/* Informações do Usuário & Alternador de Tema & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy ring-2 ring-white dark:bg-slate-800 dark:text-sky-400 dark:ring-slate-700">
              {iniciais}
            </div>
            <div className="hidden text-left sm:block">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{s.pessoa.nome}</p>
                {textoApto && (
                  <span className="rounded-md bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-300 px-1.5 py-0.5 text-[10px] font-bold border border-navy/10 dark:border-sky-800/60">
                    {textoApto}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {tipos.map(t => (t === 'SINDICO' || t === 'ADMINISTRADOR' ? 'Administrador' : t === 'PORTEIRO' ? 'Porteiro' : 'Morador')).join(' • ')}
              </p>
            </div>
          </div>

          <BotaoModoEscuro />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <button
            onClick={() => {
              sair();
              nav('/login');
            }}
            title="Sair do sistema"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Icone nome="logout" className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal com Sidebar */}
      <div className="flex flex-1">
        {/* Backdrop Mobile */}
        {menuAberto && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 transform border-r border-slate-200/80 bg-white p-4 transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${menuAberto ? 'translate-x-0 top-16' : '-translate-x-full lg:translate-x-0'
            }`}
        >
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            <div className="space-y-1">
              {item(rotaInicial, 'Início', 'home')}
            </div>

            {tipos.includes('MORADOR') && (
              <div>
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Morador
                </p>
                <div className="space-y-1">
                  {item('/morador/reservar', 'Nova Reserva', 'calendar')}
                  {item('/morador/reservas', 'Minhas Reservas', 'clock')}
                  {item('/morador/encomendas', 'Minhas Encomendas', 'package')}
                  {item('/morador/familia', 'Minha Família', 'users')}
                </div>
              </div>
            )}

            {tipos.includes('PORTEIRO') && (
              <div>
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Portaria
                </p>
                <div className="space-y-1">
                  {item('/portaria/painel', 'Painel da Portaria', 'building')}
                  {item('/portaria/areas-livres', 'Áreas de Uso Livre', 'clock')}
                  {item('/portaria/encomendas', 'Encomendas', 'package')}
                  {item('/portaria/chaves', 'Controle de Chaves', 'key')}
                </div>
              </div>
            )}

            {(tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR')) && (
              <div>
                <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Administração
                </p>
                <div className="space-y-1">
                  {item('/sindico/painel', 'Painel Geral', 'home')}
                  {!tipos.includes('PORTEIRO') && item('/portaria/painel', 'Painel da Portaria', 'building')}
                  {!tipos.includes('PORTEIRO') && item('/portaria/areas-livres', 'Áreas de Uso Livre', 'clock')}
                  {item('/portaria/chaves', 'Controle de Chaves', 'key')}
                  {item('/sindico/areas', 'Áreas Comuns', 'building')}
                  {item('/sindico/pessoas', 'Pessoas & Unidades', 'users')}
                  {item('/sindico/avisos', 'Publicar Avisos', 'megaphone')}
                </div>
              </div>
            )}

            <div>
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Comunicação
              </p>
              <div className="space-y-1">
                {item('/mural', 'Mural de Avisos', 'pin')}
              </div>
            </div>
          </div>
        </aside>

        {/* Área Central das Telas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
