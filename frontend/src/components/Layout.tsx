import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { painelInicial, sessaoAtual, sair, alternarCondominio } from '../api';
import { useModulos } from '../contexts/ModulosContext';
import { Icone, Badge } from './ui';
import BotaoModoEscuro from './BotaoModoEscuro';

const STORAGE_SECOES_KEY = 'oasis_sidebar_secoes';
const STORAGE_SIDEBAR_VISIVEL_KEY = 'oasis_sidebar_visivel';

/**
 * Layout Principal do Sistema OASIS
 * Inspirado no Design System do Lettly (Rental Property Management SaaS)
 * - Sidebar estruturada (305px) com Workspace Switcher e gavetas colapsáveis com animação fluida
 * - Topbar limpa com breadcrumbs, status do condomínio e busca
 * - Rodapé com card de perfil de usuário e atalhos rápidos
 */
export default function Layout() {
  const nav = useNavigate();
  const location = useLocation();
  const { temModulo } = useModulos();
  const s = sessaoAtual();

  // Controle de visibilidade da sidebar inteira (efeito gaveta para desktop e mobile)
  const [sidebarAberta, setSidebarAberta] = useState(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_SIDEBAR_VISIVEL_KEY);
      return salvo !== null ? JSON.parse(salvo) : true;
    } catch {
      return true;
    }
  });

  const alternarSidebar = () => {
    setSidebarAberta((prev: boolean) => {
      const novo = !prev;
      try {
        localStorage.setItem(STORAGE_SIDEBAR_VISIVEL_KEY, JSON.stringify(novo));
      } catch {}
      return novo;
    });
  };

  // Estado para recolher/expandir as gavetas de módulos da sidebar (com persistência no localStorage)
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>(() => {
    try {
      const salvo = localStorage.getItem(STORAGE_SECOES_KEY);
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch {
      // fallback
    }
    return {
      visaoGeral: true,
      superadmin: true,
      morador: true,
      portaria: true,
      gestaoPredial: true,
      comunicacao: true,
    };
  });

  const alternarSecao = (chave: string) => {
    setSecoesAbertas((prev) => {
      const novo = {
        ...prev,
        [chave]: !prev[chave],
      };
      try {
        localStorage.setItem(STORAGE_SECOES_KEY, JSON.stringify(novo));
      } catch {
        // silencioso
      }
      return novo;
    });
  };

  // Garante que o grupo da rota ativa seja expandido quando o usuário navega entre páginas
  const ultimaRotaRef = useRef(location.pathname);
  useEffect(() => {
    const p = location.pathname;
    if (ultimaRotaRef.current !== p) {
      ultimaRotaRef.current = p;
      setSecoesAbertas((prev) => {
        let mudou = false;
        const novo = { ...prev };
        if (p.startsWith('/superadmin') && !novo.superadmin) {
          novo.superadmin = true;
          mudou = true;
        } else if (p.startsWith('/morador') && !novo.morador) {
          novo.morador = true;
          mudou = true;
        } else if (p.startsWith('/portaria') && (!novo.portaria || !novo.gestaoPredial)) {
          novo.portaria = true;
          novo.gestaoPredial = true;
          mudou = true;
        } else if (p.startsWith('/sindico') && !novo.gestaoPredial) {
          novo.gestaoPredial = true;
          mudou = true;
        } else if (p.startsWith('/mural') && !novo.comunicacao && !novo.morador) {
          novo.comunicacao = true;
          mudou = true;
        }
        if (mudou) {
          try {
            localStorage.setItem(STORAGE_SECOES_KEY, JSON.stringify(novo));
          } catch {}
          return novo;
        }
        return prev;
      });
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

  // Renderizador de item de menu padronizado (Lettly style: botões amplos e confortáveis, 44px, ícones 20px nítidos)
  const item = (to: string, rotulo: string, icone: React.ComponentProps<typeof Icone>['nome']) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setSidebarAberta(false);
        }
      }}
      className={({ isActive }) =>
        'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold min-h-[44px] transition-all duration-150 ' +
        (isActive
          ? 'bg-navy text-white shadow-xs font-bold dark:bg-sky-600 dark:text-white'
          : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100')
      }
    >
      {({ isActive }) => (
        <>
          <Icone
            nome={icone}
            className={`h-5 w-5 shrink-0 transition-colors ${
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

  // Componente de gaveta/acordeão da sidebar com animação fluida CSS Grid
  const SecaoGaveta = ({
    chave,
    rotulo,
    icone,
    corBadge,
    children,
  }: {
    chave: string;
    rotulo: string;
    icone?: React.ComponentProps<typeof Icone>['nome'];
    corBadge?: string;
    children: React.ReactNode;
  }) => {
    const aberto = secoesAbertas[chave] ?? true;
    return (
      <div className="transition-all">
        <button
          type="button"
          onClick={() => alternarSecao(chave)}
          aria-expanded={aberto}
          className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-[#f0f2f5] dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all duration-150 cursor-pointer select-none group"
        >
          <span className={`flex items-center gap-2 ${corBadge || ''}`}>
            {icone && <Icone nome={icone} className="w-4 h-4 transition-transform group-hover:scale-110" />}
            <span>{rotulo}</span>
          </span>
          <Icone
            nome="chevronDown"
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform duration-300 ease-in-out ${
              aberto ? 'rotate-0' : '-rotate-90'
            }`}
          />
        </button>

        {/* Efeito Gaveta: Transição suave de altura e opacidade via CSS Grid */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${
            aberto
              ? 'grid-rows-[1fr] opacity-100 mt-1.5'
              : 'grid-rows-[0fr] opacity-0 mt-0 pointer-events-none'
          }`}
          style={{ gridTemplateRows: aberto ? '1fr' : '0fr' }}
        >
          <div className="min-h-0 overflow-hidden space-y-1">
            {children}
          </div>
        </div>
      </div>
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
        {sidebarAberta && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden transition-opacity"
            onClick={() => setSidebarAberta(false)}
          />
        )}

        {/* SIDEBAR GAVETA (Lettly Style: 305px, Gaveta Retrátil com Transição Fluida no Desktop e Mobile) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[305px] shrink-0 border-r border-[#e2e6ec] bg-white flex flex-col justify-between transition-all duration-300 ease-in-out dark:border-slate-800 dark:bg-[#0e1525] lg:sticky lg:top-0 lg:h-screen ${
            sidebarAberta
              ? 'translate-x-0 lg:ml-0'
              : '-translate-x-full lg:-ml-[305px] pointer-events-none'
          }`}
        >
          {/* Topo da Sidebar: Logo Centralizada + Botão para Recolher Gaveta */}
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

              {/* Botão para fechar a gaveta (ancorado à direita sem deslocar a logo centralizada) */}
              <button
                type="button"
                onClick={alternarSidebar}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Recolher barra lateral"
                aria-label="Recolher barra lateral"
              >
                <Icone nome="chevronLeft" className="w-5 h-5" />
              </button>
            </div>

            {/* WORKSPACE SWITCHER CARD (Lettly style - nome completo sem cortes) */}
            <div className="mt-3.5 p-2.5 rounded-xl bg-[#f6f7f9] dark:bg-slate-800/70 border border-[#e2e6ec] dark:border-slate-700/80">
              <div className="flex items-start gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy dark:bg-sky-600 text-white shadow-2xs font-bold mt-0.5">
                  <Icone nome="building" className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  {tipos.includes('SUPERADMIN') ? (
                    <div className="relative group">
                      <div className="flex items-center justify-between gap-1 pr-1">
                        <p
                          className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug break-words"
                          title={s.condominio?.nome || 'Condomínio Residencial OASIS'}
                        >
                          {s.condominio?.nome || 'Condomínio Residencial OASIS'}
                        </p>
                        <Icone
                          nome="chevronDown"
                          className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors"
                        />
                      </div>
                      <select
                        value={s.condominio?.id_condominio || 1}
                        onChange={async (e) => {
                          const id = parseInt(e.target.value, 10);
                          await alternarCondominio(id);
                          window.location.reload();
                        }}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        title="Clique para alternar o condomínio ativo"
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
                      <p className="text-[10px] text-navy dark:text-sky-400 font-semibold leading-tight mt-0.5">
                        Superadmin • Clique para alternar
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p
                        className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug break-words"
                        title={s.condominio?.nome || 'Condomínio Residencial OASIS'}
                      >
                        {s.condominio?.nome || 'Condomínio Residencial OASIS'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 break-words">
                        {textoApto || 'Condomínio Ativo'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Navegação Agrupada e Colapsável (Scrollável) */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5">
            {/* GRUPO 1: VISÃO GERAL */}
            <SecaoGaveta chave="visaoGeral" rotulo="Visão Geral">
              {item(rotaInicial, 'Início', 'home')}
            </SecaoGaveta>

            {/* GRUPO 2: SUPERADMIN */}
            {tipos.includes('SUPERADMIN') && (
              <SecaoGaveta
                chave="superadmin"
                rotulo="Superadmin Master"
                icone="shield"
                corBadge="text-navy dark:text-sky-400"
              >
                {item('/superadmin/condominios', 'Condomínios & Módulos', 'building')}
                {item('/superadmin/estrutura', 'Estrutura Física & Vagas', 'layers')}
                {item('/superadmin/pessoas', 'Pessoas & Administradoras', 'users')}
              </SecaoGaveta>
            )}

            {/* GRUPO 3: MORADOR */}
            {tipos.includes('MORADOR') && (
              <SecaoGaveta chave="morador" rotulo="Área do Morador" icone="users">
                {temModulo('RESERVAS_AREAS') && item('/morador/reservar', 'Nova Reserva', 'calendar')}
                {temModulo('RESERVAS_AREAS') && item('/morador/reservas', 'Minhas Reservas', 'clock')}
                {temModulo('CHAMADOS_OCORRENCIAS') && item('/morador/chamados', 'Abrir Chamado', 'wrench')}
                {temModulo('ENCOMENDAS_PACOTES') && item('/morador/encomendas', 'Minhas Encomendas', 'package')}
                {temModulo('DEPENDENTES_FAMILIA') && item('/morador/familia', 'Minha Família', 'users')}
                {temModulo('MURAL_AVISOS') && item('/mural', 'Mural de Avisos', 'pin')}
              </SecaoGaveta>
            )}

            {/* GRUPO 4: PORTARIA */}
            {tipos.includes('PORTEIRO') && (
              <SecaoGaveta chave="portaria" rotulo="Operações da Portaria" icone="building">
                {item('/portaria/painel', 'Painel da Portaria', 'building')}
                {temModulo('AREAS_LIVRES') && item('/portaria/areas-livres', 'Áreas de Uso Livre', 'clock')}
                {temModulo('ENCOMENDAS_PACOTES') && item('/portaria/encomendas', 'Encomendas & Pacotes', 'package')}
                {temModulo('CONTROLE_CHAVES') && item('/portaria/chaves', 'Controle de Chaves', 'key')}
                {item('/sindico/pessoas', 'Pessoas & Cadastros', 'users')}
              </SecaoGaveta>
            )}

            {/* GRUPO 5: ADMINISTRAÇÃO & GESTÃO CONDOMINIAL */}
            {(tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR') || tipos.includes('SUPERADMIN')) && (
              <SecaoGaveta chave="gestaoPredial" rotulo="Gestão Condominial" icone="building">
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
              </SecaoGaveta>
            )}

            {/* GRUPO 6: COMUNICAÇÃO GERAL */}
            {!tipos.includes('MORADOR') && temModulo('MURAL_AVISOS') && (
              <SecaoGaveta chave="comunicacao" rotulo="Comunicação" icone="megaphone">
                {item('/mural', 'Mural do Condomínio', 'pin')}
              </SecaoGaveta>
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
              {/* Botão Gaveta: Alterna a barra lateral com clique no desktop e mobile */}
              <button
                type="button"
                onClick={alternarSidebar}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e2e6ec] text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-2xs"
                title={sidebarAberta ? 'Ocultar menu lateral' : 'Mostrar menu lateral'}
                aria-label="Alternar menu lateral"
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
