import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Cartao, Titulo, Icone, Badge, EmptyState } from '../../components/ui';

type Aviso = {
  id_aviso: number;
  id_aviso_perfil: number;
  titulo: string;
  conteudo: string;
  autor: string;
  fixado: boolean;
  lido: boolean;
  data_hora_publicacao: string;
  escopo: string;
  categoria?: 'ADMINISTRADOR' | 'ENCOMENDA';
};

/** UC05 - Mural de Avisos com comunicados da administração (UI/UX Pro Max) */
export default function Mural() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'TODOS' | 'ADMINISTRADOR' | 'ENCOMENDA' | 'NAO_LIDOS'>('TODOS');

  const carregar = () => {
    setCarregando(true);
    api
      .get<Aviso[]>('/avisos/meus')
      .then(setAvisos)
      .finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  async function abrir(a: Aviso) {
    const jaAberto = aberto === a.id_aviso;
    setAberto(jaAberto ? null : a.id_aviso);
    if (!a.lido) {
      await api.patch(`/avisos/${a.id_aviso}/lido`).catch(() => {});
      // Atualiza localmente o status de lido
      setAvisos(prev =>
        prev.map(item =>
          item.id_aviso === a.id_aviso ? { ...item, lido: true } : item
        )
      );
    }
  }

  const countAdmin = avisos.filter(a => a.categoria === 'ADMINISTRADOR').length;
  const countEncomenda = avisos.filter(a => a.categoria === 'ENCOMENDA').length;
  const countNaoLidos = avisos.filter(a => !a.lido).length;

  const avisosFiltrados = avisos.filter(a => {
    if (filtro === 'NAO_LIDOS') return !a.lido;
    if (filtro === 'ADMINISTRADOR') return a.categoria === 'ADMINISTRADOR';
    if (filtro === 'ENCOMENDA') return a.categoria === 'ENCOMENDA';
    return true;
  });

  return (
    <div className="space-y-6">
      <Titulo
        sub="Fique por dentro das novidades, comunicados e manutenções do condomínio."
        icone={<Icone nome="megaphone" className="h-5 w-5" />}
      >
        Mural de Avisos
      </Titulo>

      {/* Abas e Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFiltro('TODOS')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'TODOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          Todos ({avisos.length})
        </button>

        <button
          type="button"
          onClick={() => setFiltro('ADMINISTRADOR')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'ADMINISTRADOR'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="megaphone" className="h-3.5 w-3.5" />
          Administração ({countAdmin})
        </button>

        <button
          type="button"
          onClick={() => setFiltro('ENCOMENDA')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'ENCOMENDA'
              ? 'bg-amber-600 text-white shadow-xs dark:bg-amber-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="package" className="h-3.5 w-3.5" />
          Encomendas ({countEncomenda})
        </button>

        <button
          type="button"
          onClick={() => setFiltro('NAO_LIDOS')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            filtro === 'NAO_LIDOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          Não Lidos ({countNaoLidos})
        </button>
      </div>

      {carregando ? (
        <div className="flex h-40 items-center justify-center text-xs text-slate-400">
          <Icone nome="clock" className="mr-2 h-4 w-4 animate-spin text-navy dark:text-sky-400" />
          Carregando comunicados...
        </div>
      ) : avisosFiltrados.length === 0 ? (
        <Cartao>
          <EmptyState
            icone={filtro === 'ENCOMENDA' ? 'package' : 'megaphone'}
            titulo={
              filtro === 'ENCOMENDA'
                ? 'Nenhum aviso de encomenda'
                : filtro === 'ADMINISTRADOR'
                ? 'Nenhum comunicado da administração'
                : filtro === 'NAO_LIDOS'
                ? 'Nenhum aviso não lido'
                : 'Nenhum comunicado encontrado'
            }
            descricao={
              filtro === 'NAO_LIDOS'
                ? 'Você já leu todos os comunicados recentes.'
                : filtro === 'ENCOMENDA'
                ? 'Você não possui avisos de encomenda pendentes na portaria.'
                : 'Não há avisos cadastrados no mural no momento.'
            }
          />
        </Cartao>
      ) : (
        <div className="space-y-3.5">
          {avisosFiltrados.map(a => {
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
        </div>
      )}
    </div>
  );
}
