import { useEffect, useState } from 'react';
import { api, sessaoAtual } from '../../api';
import { Cartao, Titulo, Icone, Badge, EmptyState, Paginacao } from '../../components/ui';

type Aviso = {
  id_aviso: number;
  id_aviso_perfil: number;
  titulo: string;
  conteudo: string;
  autor: string;
  fixado: boolean;
  lido: boolean;
  lidoInicial?: boolean;
  data_hora_publicacao: string;
  escopo: string;
  categoria?: 'ADMINISTRADOR' | 'ENCOMENDA';
  anexo_url?: string | null;
  anexo_nome?: string | null;
  anexo_tipo?: 'IMAGEM' | 'PDF' | null;
};

const ITENS_POR_PAGINA = 20;

/** UC05 - Mural de Avisos com comunicados da administração (UI/UX Pro Max) */
export default function Mural() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'NAO_LIDOS' | 'TODOS' | 'ADMINISTRADOR' | 'ENCOMENDA'>('NAO_LIDOS');
  const [pagina, setPagina] = useState(1);

  const sessao = sessaoAtual();
  const tiposPerfis = (sessao?.perfis || []).map(p => p.tipo);
  const temMorador = tiposPerfis.includes('MORADOR');
  const temUnidade = Boolean(sessao?.unidades && sessao.unidades.length > 0);
  const ehApenasAdmin = !temMorador && !temUnidade && (tiposPerfis.includes('SINDICO') || tiposPerfis.includes('ADMINISTRADOR'));

  const carregar = () => {
    setCarregando(true);
    api
      .get<Aviso[]>('/avisos/meus')
      .then(res => {
        // Se for exclusivamente administrador, desconsidera qualquer aviso de encomenda
        const dados = ehApenasAdmin ? res.filter(a => a.categoria !== 'ENCOMENDA') : res;
        setAvisos(dados.map(a => ({ ...a, lidoInicial: a.lido })));
      })
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  async function abrir(a: Aviso) {
    const jaAberto = aberto === a.id_aviso;
    setAberto(jaAberto ? null : a.id_aviso);
    if (!a.lido) {
      // Dispara em background para registrar no banco que o aviso foi lido
      api.patch(`/avisos/${a.id_aviso}/lido`).catch(() => {});
      // Atualiza localmente o status de lido para refletir dentro do card,
      // mas mantem lidoInicial inalterado para não sumir da lista nem pular de posição enquanto o usuário lê
      setAvisos(prev =>
        prev.map(item =>
          item.id_aviso === a.id_aviso ? { ...item, lido: true } : item
        )
      );
    }
  }

  const countAdmin = avisos.filter(a => a.categoria === 'ADMINISTRADOR').length;
  const countEncomenda = avisos.filter(a => a.categoria === 'ENCOMENDA').length;
  // A contagem de não lidos na aba reflete o estado inicial da página para não alterar a listagem bruscamente
  const countNaoLidos = avisos.filter(a => !(a.lidoInicial ?? a.lido)).length;

  const avisosFiltrados = avisos
    .filter(a => {
      if (ehApenasAdmin && a.categoria === 'ENCOMENDA') return false;
      // Permanece na listagem de não lidos enquanto estiver na mesma visualização da página
      if (filtro === 'NAO_LIDOS') return !(a.lidoInicial ?? a.lido);
      if (filtro === 'ADMINISTRADOR') return a.categoria === 'ADMINISTRADOR';
      if (filtro === 'ENCOMENDA') return a.categoria === 'ENCOMENDA';
      return true;
    })
    .sort((a, b) => {
      // 1. Fixados primeiro
      if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
      // 2. Não lidos na carga inicial primeiro (para não reordenar nem pular de posição ao abrir)
      const lidoA = a.lidoInicial ?? a.lido;
      const lidoB = b.lidoInicial ?? b.lido;
      if (lidoA !== lidoB) return lidoA ? 1 : -1;
      // 3. Mais recentes primeiro
      return new Date(b.data_hora_publicacao).getTime() - new Date(a.data_hora_publicacao).getTime();
    });

  const totalPaginas = Math.ceil(avisosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const avisosPaginados = avisosFiltrados.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );

  const mudarFiltro = (novoFiltro: 'NAO_LIDOS' | 'TODOS' | 'ADMINISTRADOR' | 'ENCOMENDA') => {
    setFiltro(novoFiltro);
    setPagina(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Titulo
          sub="Fique por dentro das novidades, comunicados e manutenções do condomínio."
          icone={<Icone nome="megaphone" className="h-5 w-5" />}
        >
          Mural de Avisos
        </Titulo>

        <button
          type="button"
          onClick={carregar}
          disabled={carregando}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
          title="Recarregar avisos do mural"
        >
          <svg
            className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Atualizar</span>
        </button>
      </div>

      {/* Abas e Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => mudarFiltro('NAO_LIDOS')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'NAO_LIDOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="bell" className="h-3.5 w-3.5" />
          Não Lidos ({countNaoLidos})
        </button>

        <button
          type="button"
          onClick={() => mudarFiltro('TODOS')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'TODOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          Todos os Avisos ({avisos.length})
        </button>

        <button
          type="button"
          onClick={() => mudarFiltro('ADMINISTRADOR')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'ADMINISTRADOR'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="megaphone" className="h-3.5 w-3.5" />
          Administração ({countAdmin})
        </button>

        {!ehApenasAdmin && (
          <button
            type="button"
            onClick={() => mudarFiltro('ENCOMENDA')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              filtro === 'ENCOMENDA'
                ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-600'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
            }`}
          >
            <Icone nome="package" className="h-3.5 w-3.5" />
            Encomendas ({countEncomenda})
          </button>
        )}
      </div>

      {carregando ? (
        <div className="flex h-40 items-center justify-center text-xs text-slate-400">
          <Icone nome="clock" className="mr-2 h-4 w-4 animate-spin text-navy dark:text-sky-400" />
          Carregando comunicados...
        </div>
      ) : avisosFiltrados.length === 0 ? (
        <Cartao>
          <EmptyState
            icone={filtro === 'ENCOMENDA' ? 'package' : filtro === 'NAO_LIDOS' ? 'check' : 'megaphone'}
            titulo={
              filtro === 'ENCOMENDA'
                ? 'Nenhum aviso de encomenda'
                : filtro === 'ADMINISTRADOR'
                ? 'Nenhum comunicado da administração'
                : filtro === 'NAO_LIDOS'
                ? 'Nenhum aviso não lido pendente'
                : 'Nenhum comunicado encontrado'
            }
            descricao={
              filtro === 'NAO_LIDOS'
                ? 'Você está em dia! Todos os comunicados recentes já foram lidos.'
                : filtro === 'ENCOMENDA'
                ? 'Você não possui avisos de encomenda pendentes na portaria.'
                : 'Não há avisos cadastrados no mural no momento.'
            }
          />
          {filtro === 'NAO_LIDOS' && avisos.length > 0 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => mudarFiltro('TODOS')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <Icone nome="eye" className="h-4 w-4" />
                Ver todos os comunicados ({avisos.length})
              </button>
            </div>
          )}
        </Cartao>
      ) : (
        <div className="space-y-3.5">
          {avisosPaginados.map(a => {
            const eAberto = aberto === a.id_aviso;
            const isEncomenda = a.categoria === 'ENCOMENDA';
            return (
              <Cartao
                key={a.id_aviso}
                className={`cursor-pointer transition-all duration-200 hover:shadow-card-hover ${
                  isEncomenda
                    ? 'border-amber-200/80 bg-amber-50/10 dark:border-amber-900/40 dark:bg-amber-950/10'
                    : a.fixado
                    ? 'border-amber-200/90 bg-amber-50/20 dark:border-amber-900/60 dark:bg-amber-950/20'
                    : ''
                } ${!a.lido ? 'ring-1 ring-navy/15 dark:ring-sky-500/30' : ''}`}
              >
                <div onClick={() => abrir(a)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                          isEncomenda
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : a.fixado
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : !a.lido
                            ? 'bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <Icone
                          nome={isEncomenda ? 'package' : a.fixado ? 'pin' : 'megaphone'}
                          className="h-5 w-5"
                        />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {isEncomenda && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              <Icone nome="package" className="h-3 w-3" />
                              ENCOMENDA NA PORTARIA
                            </span>
                          )}
                          {a.fixado && !isEncomenda && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                              <Icone nome="pin" className="h-3 w-3" />
                              FIXADO
                            </span>
                          )}
                          {!a.lido && (
                            <span className="rounded-md bg-navy dark:bg-sky-600 px-2 py-0.5 text-[10px] font-bold text-white tracking-wider animate-pulse">
                              NOVO
                            </span>
                          )}
                          {a.lido && !a.lidoInicial && (
                            <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wider">
                              LIDO
                            </span>
                          )}
                          {a.anexo_url && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                              <Icone nome={a.anexo_tipo === 'PDF' ? 'fileText' : 'paperclip'} className="h-3 w-3 text-navy dark:text-sky-400" />
                              {a.anexo_tipo === 'PDF' ? 'PDF' : 'ANEXO'}
                            </span>
                          )}
                          <h3 className={`text-base font-bold leading-tight ${a.lido ? 'text-slate-700 dark:text-slate-200' : 'text-navy dark:text-sky-400'}`}>
                            {a.titulo}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          {isEncomenda ? 'Recebido por ' : 'Publicado por '}<b>{a.autor}</b> em{' '}
                          {new Date(a.data_hora_publicacao).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                      title={eAberto ? 'Recolher' : 'Expandir'}
                    >
                      <Icone
                        nome="chevronDown"
                        className={`h-4 w-4 transform transition-transform ${eAberto ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {eAberto && (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-sm text-slate-700 dark:text-slate-300 space-y-3 animate-fade-in">
                      <p className="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">
                        {a.conteudo}
                      </p>

                      {/* Anexo */}
                      {a.anexo_url && (
                        <div className="pt-2 space-y-2">
                          <div>
                            <a
                              href={a.anexo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Icone
                                nome={a.anexo_tipo === 'PDF' ? 'fileText' : 'image'}
                                className="h-4 w-4 text-navy dark:text-sky-400"
                              />
                              <span className="truncate max-w-[220px] sm:max-w-xs">
                                {a.anexo_nome || (a.anexo_tipo === 'PDF' ? 'Documento PDF' : 'Imagem em anexo')}
                              </span>
                              <Icone nome="download" className="h-3.5 w-3.5 text-slate-400" />
                            </a>
                          </div>

                          {a.anexo_tipo === 'IMAGEM' && (
                            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 max-w-md">
                              <img
                                src={a.anexo_url}
                                alt={a.titulo}
                                className="w-full max-h-72 object-contain bg-slate-900/5 dark:bg-slate-900/50"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100/60 dark:border-slate-800 pt-2">
                        <span>Escopo: {a.escopo}</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Icone nome="check" className="h-3 w-3" />
                          Mensagem lida
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Cartao>
            );
          })}

          <Paginacao
            paginaAtual={pagina}
            totalPaginas={totalPaginas}
            totalRegistros={avisosFiltrados.length}
            itensPorPagina={ITENS_POR_PAGINA}
            onMudarPagina={setPagina}
          />
        </div>
      )}
    </div>
  );
}
