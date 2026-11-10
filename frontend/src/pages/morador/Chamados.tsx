import React, { useState, useEffect, useRef } from 'react';
import { api, sessaoAtual } from '../../api';
import { Titulo, Cartao, Botao, Badge, Icone, inputCls, Mensagem, Paginacao } from '../../components/ui';
import { useSync } from '../../hooks/useSync';

export interface Chamado {
  id_chamado: number;
  id_unidade: number;
  id_pessoa_autor: number;
  categoria: 'LIMPEZA' | 'AVARIA_QUEBRADO' | 'MANUTENCAO' | 'CONVIVENCIA_BARULHO' | 'OUTROS';
  titulo: string;
  descricao: string;
  local_especifico?: string;
  status: 'EM_ANALISE' | 'EM_ANDAMENTO' | 'REALIZADA' | 'ARQUIVADA';
  imagem_url?: string;
  data_hora_abertura: string;
  data_hora_fechamento?: string;
  data_hora_atualizacao: string;
  numero_apartamento: string;
  bloco: string;
  autor_nome: string;
  total_mensagens: number;
  ultima_mensagem_em?: string;
}

export interface MensagemChamado {
  id_chamado_mensagem: number;
  id_chamado: number;
  id_pessoa: number;
  id_perfil: number;
  origem: 'MORADOR' | 'ADMINISTRACAO';
  mensagem: string;
  anexo_url?: string;
  data_hora: string;
  autor_nome: string;
  tipo_perfil: string;
}

export interface ChamadoDetalhado extends Chamado {
  mensagens: MensagemChamado[];
}

const CATEGORIAS_CONFIG = {
  LIMPEZA: {
    rotulo: 'Limpeza',
    icone: 'sparkles' as const,
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
    descricao: 'Lixeiras, corredores, halls, calçadas e áreas comuns',
  },
  AVARIA_QUEBRADO: {
    rotulo: 'Avaria / Quebrado',
    icone: 'wrench' as const,
    corBadge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    descricao: 'Portões, lâmpadas queimadas, maçanetas, vidros e interfones',
  },
  MANUTENCAO: {
    rotulo: 'Manutenção',
    icone: 'building' as const,
    corBadge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    descricao: 'Elevadores, bombas d’água, elétrica e hidráulica geral',
  },
  CONVIVENCIA_BARULHO: {
    rotulo: 'Convivência / Barulho',
    icone: 'bell' as const,
    corBadge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
    descricao: 'Ruídos excessivos, animais, uso irregular de áreas comuns',
  },
  OUTROS: {
    rotulo: 'Outros Assuntos',
    icone: 'info' as const,
    corBadge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    descricao: 'Sugestões, dúvidas administrativas e comunicados gerais',
  },
};

const STATUS_CONFIG = {
  EM_ANALISE: {
    rotulo: 'Em Análise',
    tipoBadge: 'aviso' as const,
    corBg: 'bg-amber-500',
    descricao: 'Aguardando avaliação da administração do condomínio',
  },
  EM_ANDAMENTO: {
    rotulo: 'Em Andamento',
    tipoBadge: 'info' as const,
    corBg: 'bg-blue-500',
    descricao: 'Chamado acolhido e providências em execução',
  },
  REALIZADA: {
    rotulo: 'Realizada',
    tipoBadge: 'sucesso' as const,
    corBg: 'bg-emerald-500',
    descricao: 'Solicitação ou reparo concluído com sucesso',
  },
  ARQUIVADA: {
    rotulo: 'Arquivada',
    tipoBadge: 'neutro' as const,
    corBg: 'bg-slate-500',
    descricao: 'Chamado finalizado e arquivado para histórico',
  },
};

export default function MoradorChamados() {
  const sessao = sessaoAtual();
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtroAba, setFiltroAba] = useState<'ABERTOS' | 'CONCLUIDOS' | 'ARQUIVADOS' | 'TODOS'>('ABERTOS');
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 9;

  const mudarFiltroAba = (novaAba: 'ABERTOS' | 'CONCLUIDOS' | 'ARQUIVADOS' | 'TODOS') => {
    setFiltroAba(novaAba);
    setPagina(1);
  };

  // Modal Novo Chamado
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [formTitulo, setFormTitulo] = useState('');
  const [formCategoria, setFormCategoria] = useState<keyof typeof CATEGORIAS_CONFIG>('AVARIA_QUEBRADO');
  const [formDescricao, setFormDescricao] = useState('');
  const [formLocal, setFormLocal] = useState('');
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Modal / Gaveta de Detalhes e Mensagens
  const [chamadoSelecionadoId, setChamadoSelecionadoId] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState<ChamadoDetalhado | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const finalMensagensRef = useRef<HTMLDivElement>(null);

  const carregarChamados = async () => {
    try {
      setCarregando(true);
      const dados = await api.get<Chamado[]>('/chamados/meus');
      setChamados(dados);
      setErro('');
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar seus chamados.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarDetalhes = async (id: number) => {
    try {
      setCarregandoDetalhes(true);
      const dados = await api.get<ChamadoDetalhado>(`/chamados/${id}`);
      setDetalhes(dados);
      setTimeout(() => {
        finalMensagensRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (e: any) {
      setErro(e.message || 'Não foi possível carregar os detalhes do chamado.');
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  useEffect(() => {
    carregarChamados();
  }, []);

  // Sincronização em tempo real (SSE + BroadcastChannel)
  useSync('CHAMADOS', () => {
    carregarChamados();
    if (chamadoSelecionadoId) {
      carregarDetalhes(chamadoSelecionadoId);
    }
  });

  const abrirModalNovo = () => {
    setFormTitulo('');
    setFormCategoria('AVARIA_QUEBRADO');
    setFormDescricao('');
    setFormLocal('');
    setArquivoFoto(null);
    setPreviewFoto(null);
    setModalAberto(true);
  };

  const selecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoFoto(file);
    setPreviewFoto(URL.createObjectURL(file));
  };

  const removerFoto = () => {
    setArquivoFoto(null);
    setPreviewFoto(null);
    if (inputFotoRef.current) inputFotoRef.current.value = '';
  };

  const handleSubmeterChamado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim()) {
      alert('Por favor, informe o título do chamado.');
      return;
    }
    if (!formDescricao.trim()) {
      alert('Por favor, descreva detalhadamente o problema ou solicitação.');
      return;
    }

    try {
      setEnviando(true);
      let imagem_url: string | undefined = undefined;

      if (arquivoFoto) {
        setUploadandoFoto(true);
        const upRes = await api.upload<{ imagem_url: string }>('/chamados/upload-foto', 'foto', arquivoFoto);
        imagem_url = upRes.imagem_url;
        setUploadandoFoto(false);
      }

      await api.post('/chamados', {
        titulo: formTitulo.trim(),
        categoria: formCategoria,
        descricao: formDescricao.trim(),
        local_especifico: formLocal.trim() || undefined,
        imagem_url,
      });

      setModalAberto(false);
      await carregarChamados();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar chamado.');
    } finally {
      setEnviando(false);
      setUploadandoFoto(false);
    }
  };

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !detalhes) return;

    try {
      setEnviandoMensagem(true);
      await api.post(`/chamados/${detalhes.id_chamado}/mensagens`, {
        mensagem: novaMensagem.trim(),
      });
      setNovaMensagem('');
      await carregarDetalhes(detalhes.id_chamado);
      await carregarChamados();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar mensagem.');
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const chamadosFiltrados = chamados.filter((c) => {
    if (filtroAba === 'ABERTOS') return c.status === 'EM_ANALISE' || c.status === 'EM_ANDAMENTO';
    if (filtroAba === 'CONCLUIDOS') return c.status === 'REALIZADA';
    if (filtroAba === 'ARQUIVADOS') return c.status === 'ARQUIVADA';
    return true;
  });

  const totalPaginas = Math.ceil(chamadosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const chamadosPaginados = chamadosFiltrados.slice(
    (paginaValida - 1) * ITENS_POR_PAGINA,
    paginaValida * ITENS_POR_PAGINA
  );

  const totalAbertos = chamados.filter((c) => c.status === 'EM_ANALISE' || c.status === 'EM_ANDAMENTO').length;
  const totalConcluidos = chamados.filter((c) => c.status === 'REALIZADA').length;

  const estadoTourRef = useRef({ chamados, chamadosFiltrados, chamadosPaginados });
  estadoTourRef.current = { chamados, chamadosFiltrados, chamadosPaginados };
  const abriuModalViaTourRef = useRef(false);
  const abriuGavetaViaTourRef = useRef(false);

  useEffect(() => {
    const fecharPreviewsTour = () => {
      if (abriuModalViaTourRef.current) {
        setModalAberto(false);
        abriuModalViaTourRef.current = false;
      }
      if (abriuGavetaViaTourRef.current) {
        setChamadoSelecionadoId(null);
        setDetalhes(null);
        abriuGavetaViaTourRef.current = false;
      }
    };

    const onTourEtapa = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.rota !== '/morador/chamados') return;
      const { chamados: todos, chamadosFiltrados: filtrados, chamadosPaginados: paginados } = estadoTourRef.current;

      if (detail.passo === 1 || detail.passo === 3) {
        fecharPreviewsTour();
      } else if (detail.passo === 2) {
        if (abriuGavetaViaTourRef.current) {
          setChamadoSelecionadoId(null);
          setDetalhes(null);
          abriuGavetaViaTourRef.current = false;
        }
        setModalAberto(true);
        abriuModalViaTourRef.current = true;
      } else if (detail.passo === 4) {
        fecharPreviewsTour();
        if (filtrados.length === 0 && todos.length > 0) {
          mudarFiltroAba('TODOS');
        }
      } else if (detail.passo === 5) {
        if (abriuModalViaTourRef.current) {
          setModalAberto(false);
          abriuModalViaTourRef.current = false;
        }
        const alvo = paginados[0] || filtrados[0] || todos[0];
        if (alvo) {
          if (filtrados.length === 0 && todos.length > 0) {
            mudarFiltroAba('TODOS');
          }
          setChamadoSelecionadoId(alvo.id_chamado);
          carregarDetalhes(alvo.id_chamado);
          abriuGavetaViaTourRef.current = true;
        }
      }
    };

    const onTourEncerrar = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.rota !== '/morador/chamados') return;
      fecharPreviewsTour();
    };

    window.addEventListener('oasis:tour-etapa', onTourEtapa);
    window.addEventListener('oasis:tour-encerrar', onTourEncerrar);
    return () => {
      window.removeEventListener('oasis:tour-etapa', onTourEtapa);
      window.removeEventListener('oasis:tour-encerrar', onTourEncerrar);
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Titulo
        icone={<Icone nome="wrench" className="h-6 w-6" />}
        sub="Registre avarias, serviços de limpeza e solicitações com privacidade garantida para o seu apartamento."
        ajudaKey="/morador/chamados"
        acao={
          <Botao
            id="tour-chamados-btn-novo"
            variante="primario"
            onClick={abrirModalNovo}
            className="flex items-center gap-2 shadow-sm"
          >
            <Icone nome="plus" className="w-4 h-4" />
            <span>Abrir Novo Chamado</span>
          </Botao>
        }
      >
        Chamados & Ocorrências
      </Titulo>

      {erro && <Mensagem tipo="erro" texto={erro} aoFechar={() => setErro('')} />}

      {/* Cartão de Informação de Privacidade */}
      <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-4 text-sm text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300 flex items-start gap-3">
        <Icone nome="shield" className="w-5 h-5 mt-0.5 text-sky-600 dark:text-sky-400 shrink-0" />
        <div>
          <span className="font-semibold">Privacidade Particular:</span> Todos os chamados registrados aqui pertencem
          exclusivamente à sua unidade residencial (
          <span className="font-medium underline">
            {sessao?.unidades?.[0]
              ? `Bloco ${sessao.unidades[0].bloco}, Apto ${sessao.unidades[0].numero_apartamento}`
              : 'sua unidade'}
          </span>
          ). Nenhum outro morador ou vizinho tem acesso aos seus chamados ou às respostas enviadas pela administração.
        </div>
      </div>

      {/* Abas de Navegação / Filtros (Padrão Lettly SaaS) */}
      <div id="tour-chamados-kpis" className="flex items-center gap-2 border-b border-[#e2e6ec] dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => mudarFiltroAba('ABERTOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filtroAba === 'ABERTOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600 dark:text-white'
              : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Em Aberto</span>
          {totalAbertos > 0 && (
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              filtroAba === 'ABERTOS'
                ? 'bg-white/20 text-white'
                : 'bg-[#fdf0d9] text-[#b26a00] border border-[#f8dcab]'
            }`}>
              {totalAbertos}
            </span>
          )}
        </button>

        <button
          onClick={() => mudarFiltroAba('CONCLUIDOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filtroAba === 'CONCLUIDOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600 dark:text-white'
              : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Concluídos</span>
          {totalConcluidos > 0 && (
            <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
              filtroAba === 'CONCLUIDOS'
                ? 'bg-white/20 text-white'
                : 'bg-[#e3f4eb] text-[#1e8e5a] border border-[#bfe4d2]'
            }`}>
              {totalConcluidos}
            </span>
          )}
        </button>

        <button
          onClick={() => mudarFiltroAba('ARQUIVADOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filtroAba === 'ARQUIVADOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600 dark:text-white'
              : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Arquivados</span>
        </button>

        <button
          onClick={() => mudarFiltroAba('TODOS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            filtroAba === 'TODOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600 dark:text-white'
              : 'text-slate-600 hover:bg-[#f6f7f9] hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Todos ({chamados.length})</span>
        </button>
      </div>

      {/* Grid de Chamados */}
      {carregando ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-3" />
          <p className="text-sm">Carregando seus chamados...</p>
        </div>
      ) : chamadosFiltrados.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-[#e2e6ec] dark:border-slate-800 p-8">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <Icone nome="wrench" className="w-6 h-6 text-[#1e8e5a]" />
          </div>
          <h3 className="text-base font-bold text-[#0b1830] dark:text-slate-200">
            Nenhum chamado encontrado nesta aba
          </h3>
          <p className="text-xs text-[#525d6e] dark:text-slate-400 mt-1 max-w-md mx-auto">
            {filtroAba === 'ABERTOS'
              ? 'Você não possui nenhum chamado em aberto no momento. Tudo parece estar funcionando perfeitamente!'
              : 'Não há registros nesta categoria no momento.'}
          </p>
          {filtroAba === 'ABERTOS' && (
            <Botao variante="primario" onClick={abrirModalNovo} className="mt-4 inline-flex items-center gap-2">
              <Icone nome="plus" className="w-4 h-4" />
              <span>Abrir Novo Chamado</span>
            </Botao>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div id="tour-chamados-lista" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chamadosPaginados.map((c) => {
              const cat = CATEGORIAS_CONFIG[c.categoria] || CATEGORIAS_CONFIG.OUTROS;
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.EM_ANALISE;
              const dataFormatada = new Date(c.data_hora_abertura).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Cartao
                  key={c.id_chamado}
                  className="flex flex-col justify-between hover:shadow-card hover:-translate-y-0.5 transition-all cursor-pointer border border-[#e2e6ec] dark:border-slate-800 bg-white dark:bg-[#0e1525] p-5 rounded-2xl shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cat.corBadge}`}
                      >
                        <Icone nome={cat.icone} className="w-3 h-3" />
                        {cat.rotulo}
                      </span>
                      <Badge tipo={st.tipoBadge}>{st.rotulo}</Badge>
                    </div>

                    <h3 className="font-bold text-[#0b1830] dark:text-slate-100 text-sm line-clamp-1 mb-1">
                      {c.titulo}
                    </h3>

                    {c.local_especifico && (
                      <p className="text-xs font-semibold text-[#525d6e] dark:text-slate-400 flex items-center gap-1 mb-2">
                        <Icone nome="building" className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.local_especifico}</span>
                      </p>
                    )}

                    <p className="text-xs text-[#525d6e] dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                      {c.descricao}
                    </p>

                    {c.imagem_url && (
                      <div className="relative mb-3 rounded-xl overflow-hidden h-28 bg-[#f6f7f9] dark:bg-slate-800 border border-[#e2e6ec] dark:border-slate-700">
                        <img
                          src={c.imagem_url}
                          alt="Anexo do chamado"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#e2e6ec] dark:border-slate-800/80 flex items-center justify-between text-xs text-[#525d6e] dark:text-slate-400">
                    <span className="text-[11px] font-medium">{dataFormatada}</span>
                    <button
                      onClick={() => {
                        setChamadoSelecionadoId(c.id_chamado);
                        carregarDetalhes(c.id_chamado);
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-navy hover:underline dark:text-sky-400 transition-colors"
                    >
                      <span>{c.total_mensagens > 0 ? `${c.total_mensagens} msg(s)` : 'Ver conversa'}</span>
                      <Icone nome="chevronRight" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Cartao>
              );
            })}
          </div>

          <Paginacao
            paginaAtual={paginaValida}
            totalPaginas={totalPaginas}
            totalRegistros={chamadosFiltrados.length}
            itensPorPagina={ITENS_POR_PAGINA}
            onMudarPagina={setPagina}
          />
        </div>
      )}

      {/* Modal: Abertura de Novo Chamado */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div id="tour-chamados-modal-form" className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400 rounded-lg">
                  <Icone nome="wrench" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Abrir Novo Chamado</h3>
                  <p className="text-xs text-slate-500">Notifique a administração sobre problemas ou manutenções</p>
                </div>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icone nome="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmeterChamado} className="space-y-4">
              {/* Seletor de Categoria */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Categoria do Chamado *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CATEGORIAS_CONFIG) as (keyof typeof CATEGORIAS_CONFIG)[]).map((catKey) => {
                    const cat = CATEGORIAS_CONFIG[catKey];
                    const selecionado = formCategoria === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setFormCategoria(catKey)}
                        className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-all ${
                          selecionado
                            ? 'border-navy bg-navy-50/70 text-navy font-semibold ring-2 ring-navy/20 dark:border-sky-500 dark:bg-slate-800 dark:text-sky-400'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-0.5">
                          <Icone nome={cat.icone} className="w-3.5 h-3.5" />
                          <span>{cat.rotulo}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {cat.descricao}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Título Resumido *
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTitulo(e.target.value)}
                  placeholder="Ex.: Lâmpada queimada no corredor do 5º andar"
                  className={inputCls}
                  required
                />
              </div>

              {/* Local Específico */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Local Exato / Referência (Opcional)
                </label>
                <input
                  type="text"
                  value={formLocal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormLocal(e.target.value)}
                  placeholder="Ex.: Corredor em frente ao Apto 52, Hall Social"
                  className={inputCls}
                />
              </div>

              {/* Descrição Detalhada */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Descrição Detalhada *
                </label>
                <textarea
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  rows={3}
                  required
                  placeholder="Descreva o que ocorreu, horários, se há risco de dano maior ou outras informações importantes..."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Anexo de Foto Opcional */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Foto ou Evidência (Opcional)
                </label>
                <input
                  type="file"
                  ref={inputFotoRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selecionarFoto}
                  className="hidden"
                />

                {previewFoto ? (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden dark:border-slate-700 h-36 bg-slate-100">
                    <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={removerFoto}
                      className="absolute top-2 right-2 bg-slate-900/70 hover:bg-slate-900 text-white p-1.5 rounded-lg text-xs flex items-center gap-1 backdrop-blur-xs"
                    >
                      <Icone nome="x" className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputFotoRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-500"
                  >
                    <Icone nome="image" className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                    <span className="text-xs font-medium">Clique para selecionar uma foto (JPG, PNG ou WebP)</span>
                  </button>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => setModalAberto(false)}
                  disabled={enviando}
                >
                  Cancelar
                </Botao>
                <Botao type="submit" variante="primario" disabled={enviando}>
                  {uploadandoFoto
                    ? 'Enviando foto...'
                    : enviando
                    ? 'Registrando chamado...'
                    : 'Confirmar & Abrir Chamado'}
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Gaveta de Conversa e Detalhes */}
      {chamadoSelecionadoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div id="tour-chamados-gaveta" className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
            {/* Header da Gaveta */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400 rounded-lg">
                  <Icone nome="wrench" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Chamado #{detalhes?.id_chamado || chamadoSelecionadoId}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhamento e respostas particulares da administração
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setChamadoSelecionadoId(null);
                  setDetalhes(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Icone nome="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Chamado e Histórico */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {carregandoDetalhes || !detalhes ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-2" />
                  <p className="text-xs">Carregando detalhes do chamado...</p>
                </div>
              ) : (
                <>
                  {/* Bloco de Resumo do Chamado */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                          CATEGORIAS_CONFIG[detalhes.categoria]?.corBadge
                        }`}
                      >
                        <Icone
                          nome={CATEGORIAS_CONFIG[detalhes.categoria]?.icone || 'info'}
                          className="w-3.5 h-3.5"
                        />
                        {CATEGORIAS_CONFIG[detalhes.categoria]?.rotulo}
                      </span>
                      <Badge tipo={STATUS_CONFIG[detalhes.status]?.tipoBadge}>
                        {STATUS_CONFIG[detalhes.status]?.rotulo}
                      </Badge>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                      {detalhes.titulo}
                    </h4>

                    {detalhes.local_especifico && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Icone nome="building" className="w-3.5 h-3.5" />
                        <span>Local: {detalhes.local_especifico}</span>
                      </p>
                    )}

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800 whitespace-pre-wrap">
                      {detalhes.descricao}
                    </p>

                    {detalhes.imagem_url && (
                      <div>
                        <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                          Foto Anexa:
                        </span>
                        <a
                          href={detalhes.imagem_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-48 group relative"
                        >
                          <img
                            src={detalhes.imagem_url}
                            alt="Foto do chamado"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                          />
                        </a>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                      <span>
                        Aberto em{' '}
                        {new Date(detalhes.data_hora_abertura).toLocaleString('pt-BR')}
                      </span>
                      {detalhes.data_hora_fechamento && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Concluído em{' '}
                          {new Date(detalhes.data_hora_fechamento).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thread de Conversa / Respostas */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icone nome="shield" className="w-4 h-4 text-slate-400" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Histórico de Respostas Particulares
                      </h4>
                    </div>

                    {detalhes.mensagens.length === 0 ? (
                      <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        Nenhuma mensagem ou orientação adicional enviada ainda. Você pode enviar uma mensagem abaixo.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detalhes.mensagens.map((msg) => {
                          const ehAdmin = msg.origem === 'ADMINISTRACAO';
                          return (
                            <div
                              key={msg.id_chamado_mensagem}
                              className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                                ehAdmin
                                  ? 'bg-blue-50/80 border border-blue-200 text-blue-900 ml-4 dark:bg-blue-950/40 dark:border-blue-800/70 dark:text-blue-200'
                                  : 'bg-slate-100 border border-slate-200 text-slate-800 mr-4 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-semibold text-[11px]">
                                <span className="flex items-center gap-1.5">
                                  {ehAdmin ? (
                                    <>
                                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                                        Administração
                                      </span>
                                      <span>{msg.autor_nome}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-1.5 py-0.2 bg-slate-500 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                                        Você / Morador
                                      </span>
                                      <span>{msg.autor_nome}</span>
                                    </>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(msg.data_hora).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>
                            </div>
                          );
                        })}
                        <div ref={finalMensagensRef} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Input de Envio de Nova Mensagem */}
            {detalhes && detalhes.status !== 'ARQUIVADA' && (
              <form
                onSubmit={handleEnviarMensagem}
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  placeholder="Escreva uma mensagem para a administração..."
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Botao
                  type="submit"
                  variante="primario"
                  disabled={enviandoMensagem || !novaMensagem.trim()}
                  className="shrink-0"
                >
                  {enviandoMensagem ? '...' : 'Enviar'}
                </Botao>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
