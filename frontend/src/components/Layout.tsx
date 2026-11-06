import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { painelInicial, sessaoAtual, sair, alternarCondominio } from '../api';
import { useModulos } from '../contexts/ModulosContext';
import { Icone, Badge } from './ui';
import BotaoModoEscuro from './BotaoModoEscuro';

/**
 * Layout Principal do Sistema OASIS
 * Inspirado no Design System do Lettly (Rental Property Management SaaS)
 * - Sidebar estruturada (270px) com Workspace Switcher e grupos temáticos colapsáveis
 * - Topbar limpa com breadcrumbs, status do condomínio e busca
 * - Rodapé com card de perfil de usuário e atalhos rápidos
 */
export default function Layout() {
  const nav = useNavigate();
  const location = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const { temModulo } = useModulos();
  const s = sessaoAtual();

  // Estado para recolher/expandir os grupos de módulos de cada tipo de perfil
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({
    visaoGeral: true,
    superadmin: true,
    morador: true,
    portaria: true,
    gestaoPredial: true,
    comunicacao: true,
  });

  const alternarSecao = (chave: string) => {
    setSecoesAbertas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  // Garante que o grupo da rota ativa esteja sempre visível e expandido automaticamente
  useEffect(() => {
    const p = location.pathname;
    if (p.startsWith('/superadmin')) {
      setSecoesAbertas((prev) => ({ ...prev, superadmin: true }));
    } else if (p.startsWith('/morador')) {
      setSecoesAbertas((prev) => ({ ...prev, morador: true }));
    } else if (p.startsWith('/portaria')) {
      setSecoesAbertas((prev) => ({ ...prev, portaria: true, gestaoPredial: true }));
    } else if (p.startsWith('/sindico')) {
      setSecoesAbertas((prev) => ({ ...prev, gestaoPredial: true }));
    } else if (p.startsWith('/mural')) {
      setSecoesAbertas((prev) => ({ ...prev, comunicacao: true, morador: true }));
    }
  }, [location.pathname]);

  if (!s) return null;
  const tipos = s.perfis.map((p) => p.tipo);
  const rotaInicial = painelInicial(s);

  // Iniciais do nome para avatar
  const iniciais = s.pessoa.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const textoApto =
    s.unidades && s.unidades.length > 0
      ? s.unidades
          .map((u) =>
            u.bloco ? `Apto ${u.numero_apartamento} • Bloco ${u.bloco}` : `Apto ${u.numero_apartamento}`
          )
          .join(', ')
      : null;

  // Renderizador de item de menu padronizado (Lettly style: 40px, cantos suaves, icones vibrantes)
  const item = (to: string, rotulo: string, icone: React.ComponentProps<typeof Icone>['nome']) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMenuAberto(false)}
      className={({ isActive }) =>
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-150 ' +
        (isActive
          ? 'bg-navy text-white shadow-xs font-bold dark:bg-sky-600 dark:text-white'
          : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100')
      }
    >
      {({ isActive }) => (
        <>
          <Icone
            nome={icone}
            className={`h-4 w-4 shrink-0 transition-colors ${
              isActive
                ? 'text-white'
                : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
            }`}
          />
          <span className="truncate">{rotulo}</span>
        </>
      )}
    </NavLink>
  );

  // Cabeçalho de seção interativo (expande e recolhe ao clique)
  const CabecalhoSecao = ({
    chave,
    rotulo,
    icone,
    corBadge,
  }: {
    chave: string;
    rotulo: string;
    icone?: React.ComponentProps<typeof Icone>['nome'];
    corBadge?: string;
  }) => {
    const aberto = secoesAbertas[chave] ?? true;
    return (
      <button
        type="button"
        onClick={() => alternarSecao(chave)}
        className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 hover:bg-[#f6f7f9] dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer select-none group"
      >
        <span className={`flex items-center gap-1.5 ${corBadge || ''}`}>
          {icone && <Icone nome={icone} className="w-3.5 h-3.5" />}
          <span>{rotulo}</span>
        </span>
        <Icone
          nome="chevronDown"
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            aberto ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
    );
  };

  // Mapeamento de títulos para o Breadcrumb do Topbar
  const obterTituloPagina = () => {
    const p = location.pathname;
    if (p.includes('/sindico/painel')) return 'Painel Geral';
    if (p.includes('/sindico/chamados')) return 'Gestão de Chamados & Ocorrências';
    if (p.includes('/morador/chamados')) return 'Abrir Chamado & Ocorrências';
    if (p.includes('/sindico/avisos')) return 'Mural de Avisos & Comunicados';
    if (p.includes('/mural')) return 'Mural de Avisos do Condomínio';
    if (p.includes('/sindico/pessoas')) return 'Pessoas & Unidades';
    if (p.includes('/sindico/areas')) return 'Áreas Comuns & Regras';
    if (p.includes('/morador/reservar')) return 'Nova Reserva';
    if (p.includes('/morador/reservas')) return 'Minhas Reservas';
    if (p.includes('/portaria/painel')) return 'Painel da Portaria';
    if (p.includes('/superadmin/condominios')) return 'Gestão de Condomínios';
    if (p.includes('/superadmin/estrutura')) return 'Estrutura Física & Vagas';
    return 'Visão Geral';
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] dark:bg-[#0b1830] flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <div className="flex flex-1">
        {/* Backdrop Mobile */}
        {menuAberto && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setMenuAberto(false)}
          />
        )}

        {/* SIDEBAR (Lettly Style: 270px, Workspace Switcher, Seções Agrupadas, Perfil Ancorado) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[270px] shrink-0 border-r border-[#e2e6ec] bg-white flex flex-col justify-between transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-[#0e1525] ${
            menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } lg:sticky lg:top-0 lg:h-screen`}
        >
          {/* Topo da Sidebar: Logo Centralizada + Workspace Switcher */}
          <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="relative flex items-center justify-center py-1">
              <Link to={rotaInicial} className="flex items-center justify-center group" title="Ir para o início">
                <img
                  src="/logos/logo-deitada-navy.png"
                  alt="OASIS"
                  className="h-8 w-auto object-contain dark:hidden transition-transform duration-150 group-hover:scale-[1.02]"
                />
                <img
                  src="/logos/logo-deitada-sky.png"
                  alt="OASIS"
                  className="h-8 w-auto object-contain hidden dark:block transition-transform duration-150 group-hover:scale-[1.02]"
                />
              </Link>

              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Fechar menu"
              >
                <Icone nome="x" className="w-5 h-5" />
              </button>
            </div>

            {/* WORKSPACE SWITCHER CARD (Lettly style) */}
            <div className="mt-3.5 p-2 rounded-xl bg-[#f6f7f9] dark:bg-slate-800/70 border border-[#e2e6ec] dark:border-slate-700/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy dark:bg-sky-600 text-white shadow-2xs font-bold">
                  <Icone nome="building" className="h-4 w-4" />
                </div>

                <div className="flex-1 min-w-0">
                  {tipos.includes('SUPERADMIN') ? (
                    <div className="relative">
                      <select
                        value={s.condominio?.id_condominio || 1}
                        onChange={async (e) => {
                          const id = parseInt(e.target.value, 10);
                          await alternarCondominio(id);
                          window.location.reload();
                        }}
                        className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer truncate pr-4 focus:ring-0"
                        title="Alternar condomínio ativo"
                      >
                        {(
                          s.condominiosDisponiveis || [
                            s.condominio || { id_condominio: 1, nome: 'Condomínio Residencial OASIS' },
                          ]
                        ).map((c: any) => (
                          <option
                            key={c.id_condominio}
                            value={c.id_condominio}
                            className="text-slate-900 bg-white dark:bg-slate-800 dark:text-slate-100"
                          >
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold leading-tight">
                        Superadmin • Alternar
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                        {s.condominio?.nome || 'Condomínio OASIS'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                        {textoApto || 'Condomínio Ativo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Navegação Agrupada e Colapsável (Scrollável) */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {/* GRUPO 1: VISÃO GERAL */}
            <div>
              <CabecalhoSecao chave="visaoGeral" rotulo="Visão Geral" />
              {secoesAbertas.visaoGeral && (
                <div className="space-y-0.5 mt-1">{item(rotaInicial, 'Início', 'home')}</div>
              )}
            </div>

            {/* GRUPO 2: SUPERADMIN */}
            {tipos.includes('SUPERADMIN') && (
              <div>
                <CabecalhoSecao
                  chave="superadmin"
                  rotulo="Superadmin Master"
                  icone="shield"
                  corBadge="text-purple-600 dark:text-purple-400"
                />
                {secoesAbertas.superadmin && (
                  <div className="space-y-0.5 mt-1">
                    {item('/superadmin/condominios', 'Condomínios & Módulos', 'building')}
                    {item('/superadmin/estrutura', 'Estrutura Física & Vagas', 'layers')}
                    {item('/superadmin/pessoas', 'Pessoas & Administradoras', 'users')}
                  </div>
                )}
              </div>
            )}

            {/* GRUPO 3: MORADOR */}
            {tipos.includes('MORADOR') && (
              <div>
                <CabecalhoSecao chave="morador" rotulo="Área do Morador" icone="users" />
                {secoesAbertas.morador && (
                  <div className="space-y-0.5 mt-1">
                    {temModulo('RESERVAS_AREAS') && item('/morador/reservar', 'Nova Reserva', 'calendar')}
                    {temModulo('RESERVAS_AREAS') && item('/morador/reservas', 'Minhas Reservas', 'clock')}
                    {temModulo('CHAMADOS_OCORRENCIAS') && item('/morador/chamados', 'Abrir Chamado', 'wrench')}
                    {temModulo('ENCOMENDAS_PACOTES') && item('/morador/encomendas', 'Minhas Encomendas', 'package')}
                    {temModulo('DEPENDENTES_FAMILIA') && item('/morador/familia', 'Minha Família', 'users')}
                    {temModulo('MURAL_AVISOS') && item('/mural', 'Mural de Avisos', 'pin')}
                  </div>
                )}
              </div>
            )}

            {/* GRUPO 4: PORTARIA */}
            {tipos.includes('PORTEIRO') && (
              <div>
                <CabecalhoSecao chave="portaria" rotulo="Operações da Portaria" icone="building" />
                {secoesAbertas.portaria && (
                  <div className="space-y-0.5 mt-1">
                    {item('/portaria/painel', 'Painel da Portaria', 'building')}
                    {temModulo('AREAS_LIVRES') && item('/portaria/areas-livres', 'Áreas de Uso Livre', 'clock')}
                    {temModulo('ENCOMENDAS_PACOTES') && item('/portaria/encomendas', 'Encomendas & Pacotes', 'package')}
                    {temModulo('CONTROLE_CHAVES') && item('/portaria/chaves', 'Controle de Chaves', 'key')}
                    {item('/sindico/pessoas', 'Pessoas & Cadastros', 'users')}
                  </div>
                )}
              </div>
            )}

            {/* GRUPO 5: ADMINISTRAÇÃO & GESTÃO PREDIAL */}
            {(tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR') || tipos.includes('SUPERADMIN')) && (
              <div>
                <CabecalhoSecao chave="gestaoPredial" rotulo="Gestão Predial" icone="building" />
                {secoesAbertas.gestaoPredial && (
                  <div className="space-y-0.5 mt-1">
                    {item('/sindico/painel', 'Painel Geral', 'home')}
                    {temModulo('CHAMADOS_OCORRENCIAS') && item('/sindico/chamados', 'Gestão de Chamados', 'wrench')}
                    {!tipos.includes('PORTEIRO') && item('/portaria/painel', 'Painel da Portaria', 'building')}
                    {!tipos.includes('PORTEIRO') &&
                      temModulo('AREAS_LIVRES') &&
                      item('/portaria/areas-livres', 'Áreas de Uso Livre', 'clock')}
                    {temModulo('CONTROLE_CHAVES') && item('/portaria/chaves', 'Controle de Chaves', 'key')}
                    {temModulo('RESERVAS_AREAS') && item('/sindico/areas', 'Áreas Comuns', 'building')}
                    {item('/sindico/pessoas', 'Pessoas & Unidades', 'users')}
                    {temModulo('MURAL_AVISOS') && item('/sindico/avisos', 'Publicar Avisos', 'megaphone')}
                  </div>
                )}
              </div>
            )}

            {/* GRUPO 6: COMUNICAÇÃO GERAL */}
            {!tipos.includes('MORADOR') && temModulo('MURAL_AVISOS') && (
              <div>
                <CabecalhoSecao chave="comunicacao" rotulo="Comunicação" icone="megaphone" />
                {secoesAbertas.comunicacao && (
                  <div className="space-y-0.5 mt-1">{item('/mural', 'Mural do Condomínio', 'pin')}</div>
                )}
              </div>
            )}
          </div>

          {/* RODAPÉ DA SIDEBAR: Perfil do Usuário + Dark Mode + Sair */}
          <div className="p-3 border-t border-[#e2e6ec] dark:border-slate-800 bg-white dark:bg-[#0e1525]">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#f6f7f9] dark:bg-slate-800/60 border border-[#e2e6ec]/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[11px] font-bold shadow-2xs">
                  {iniciais}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {s.pessoa.nome}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                    {tipos[0] === 'SUPERADMIN' ? 'Superadmin' : tipos[0] === 'SINDICO' ? 'Síndica' : tipos[0] === 'PORTEIRO' ? 'Porteiro' : 'Morador'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <BotaoModoEscuro />
                <button
                  type="button"
                  onClick={() => {
                    sair();
                    nav('/login');
                  }}
                  title="Sair do sistema"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <Icone nome="logout" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL E CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TOPBAR (Lettly Style: Breadcrumb, Status e Ações Rápidas) */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e2e6ec] bg-white/90 px-4 sm:px-6 backdrop-blur-md dark:border-slate-800 dark:bg-[#0e1525]/90">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuAberto(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e6ec] text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
                aria-label="Abrir menu lateral"
              >
                <Icone nome="menu" className="h-4 w-4" />
              </button>

              <div>
                <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <span>OASIS</span>
                  <span>/</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {obterTituloPagina()}
                  </span>
                </nav>
              </div>
            </div>

            {/* Indicador do Condomínio e Status em Tempo Real */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Badge tipo="sucesso" className="hidden sm:inline-flex text-[11px] py-0.5">
                {s.condominio?.nome || 'Condomínio OASIS'}
              </Badge>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </span>
            </div>
          </header>

          {/* Canvas de Conteúdo da Tela */}
          <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
