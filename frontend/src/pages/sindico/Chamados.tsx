import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { Titulo, Cartao, Botao, Badge, Icone, inputCls, Mensagem, Paginacao } from '../../components/ui';
import { useSync } from '../../hooks/useSync';

export interface ChamadoAdmin {
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
  autor_email?: string;
  autor_celular?: string;
  total_mensagens: number;
  total_respostas_admin?: number;
  ultima_mensagem_em?: string;
}

export interface MensagemAdmin {
  id_chamado_mensagem: number;
  id_chamado: number;
  id_pessoa: number;
  id_perfil: number;
  origem: 'MORADOR' | 'ADMINISTRACAO';
  mensagem: string;
  data_hora: string;
  autor_nome: string;
  tipo_perfil: string;
}

export interface ChamadoDetalhadoAdmin extends ChamadoAdmin {
  mensagens: MensagemAdmin[];
}

export interface EstatisticasChamados {
  EM_ANALISE: number;
  EM_ANDAMENTO: number;
  REALIZADA: number;
  ARQUIVADA: number;
  TOTAL: number;
}

const CATEGORIAS_CONFIG = {
  LIMPEZA: {
    rotulo: 'Limpeza',
    icone: 'sparkles' as const,
    corBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
  },
  AVARIA_QUEBRADO: {
    rotulo: 'Avaria / Quebrado',
    icone: 'wrench' as const,
    corBadge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
  },
  MANUTENCAO: {
    rotulo: 'Manutenção',
    icone: 'building' as const,
    corBadge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
  },
  CONVIVENCIA_BARULHO: {
    rotulo: 'Convivência / Som',
    icone: 'bell' as const,
    corBadge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
  },
  OUTROS: {
    rotulo: 'Outros Assuntos',
    icone: 'info' as const,
    corBadge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
};

const STATUS_CONFIG = {
  EM_ANALISE: {
    rotulo: 'Aguardando Análise',
    tipoBadge: 'aviso' as const,
    corBg: 'bg-amber-500',
  },
  EM_ANDAMENTO: {
    rotulo: 'Em Andamento',
    tipoBadge: 'info' as const,
    corBg: 'bg-blue-500',
  },
  REALIZADA: {
    rotulo: 'Realizada',
    tipoBadge: 'sucesso' as const,
    corBg: 'bg-emerald-500',
  },
  ARQUIVADA: {
    rotulo: 'Arquivada',
    tipoBadge: 'neutro' as const,
    corBg: 'bg-slate-500',
  },
};

export default function SindicoChamados() {
  const [chamados, setChamados] = useState<ChamadoAdmin[]>([]);
  const [stats, setStats] = useState<EstatisticasChamados>({
    EM_ANALISE: 0,
    EM_ANDAMENTO: 0,
    REALIZADA: 0,
    ARQUIVADA: 0,
    TOTAL: 0,
  });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Filtros (Padrão: Apenas chamados não respondidos / aguardando análise)
  const [filtroStatus, setFiltroStatus] = useState<string>('EM_ANALISE');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [termoBusca, setTermoBusca] = useState('');

  // Paginação
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  // Gaveta de Atendimento
  const [chamadoSelecionadoId, setChamadoSelecionadoId] = useState<number | null>(null);
  const [detalhes, setDetalhes] = useState<ChamadoDetalhadoAdmin | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  const [respostaOficial, setRespostaOficial] = useState('');
  const [enviandoResposta, setEnviandoResposta] = useState(false);
  const finalMensagensRef = useRef<HTMLDivElement>(null);

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const params = new URLSearchParams();
      if (filtroStatus !== 'TODAS') params.append('status', filtroStatus);
      if (filtroCategoria !== 'TODAS') params.append('categoria', filtroCategoria);
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim) params.append('data_fim', dataFim);
      if (termoBusca.trim()) params.append('busca', termoBusca.trim());

      const [lista, estatisticas] = await Promise.all([
        api.get<ChamadoAdmin[]>(`/chamados?${params.toString()}`),
        api.get<EstatisticasChamados>('/chamados/estatisticas'),
      ]);

      setChamados(lista);
      setStats(estatisticas);
      setErro('');
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar chamados.');
    } finally {
      setCarregando(false);
    }
  };

  const carregarDetalhes = async (id: number) => {
    try {
      setCarregandoDetalhes(true);
      const dados = await api.get<ChamadoDetalhadoAdmin>(`/chamados/${id}`);
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
    setPagina(1);
    carregarDados();
  }, [filtroStatus, filtroCategoria, dataInicio, dataFim, termoBusca]);

  // Sincronização em tempo real (SSE)
  useSync('CHAMADOS', () => {
    carregarDados();
    if (chamadoSelecionadoId) {
      carregarDetalhes(chamadoSelecionadoId);
    }
  });

  const handleMudarStatus = async (novoStatus: string) => {
    if (!detalhes) return;
    try {
      setAtualizandoStatus(true);
      await api.patch(`/chamados/${detalhes.id_chamado}/status`, {
        status: novoStatus,
      });
      await carregarDetalhes(detalhes.id_chamado);
      await carregarDados();
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar o status do chamado.');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  const handleEnviarResposta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respostaOficial.trim() || !detalhes) return;

    try {
      setEnviandoResposta(true);
      await api.post(`/chamados/${detalhes.id_chamado}/mensagens`, {
        mensagem: respostaOficial.trim(),
      });
      setRespostaOficial('');
      await carregarDetalhes(detalhes.id_chamado);
      await carregarDados();
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar resposta ao morador.');
    } finally {
      setEnviandoResposta(false);
    }
  };

  const limparFiltros = () => {
    setFiltroStatus('EM_ANALISE');
    setFiltroCategoria('TODAS');
    setDataInicio('');
    setDataFim('');
    setTermoBusca('');
    setPagina(1);
  };

  const temFiltroAtivo =
    filtroStatus !== 'EM_ANALISE' ||
    filtroCategoria !== 'TODAS' ||
    Boolean(dataInicio) ||
    Boolean(dataFim) ||
    Boolean(termoBusca.trim());

  // Paginação dos chamados na tabela
  const totalPaginas = Math.ceil(chamados.length / ITENS_POR_PAGINA) || 1;
  const chamadosPaginados = chamados.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Titulo
        icone={<Icone nome="wrench" className="h-6 w-6" />}
        sub="Gerenciamento de solicitações e avarias com canal de resposta particular por unidade."
        ajudaKey="/sindico/chamados"
      >
        Gestão de Chamados & Ocorrências
      </Titulo>

      {erro && <Mensagem tipo="erro" texto={erro} aoFechar={() => setErro('')} />}

      {/* Cartões de Indicadores / Métricas do Topo com Seleção Rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFiltroStatus('EM_ANALISE')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filtroStatus === 'EM_ANALISE'
              ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Aguardando Análise</span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.EM_ANALISE}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Exigem resposta inicial</p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroStatus('EM_ANDAMENTO')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filtroStatus === 'EM_ANDAMENTO'
              ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Em Andamento</span>
            <Icone nome="clock" className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.EM_ANDAMENTO}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Serviço ou reparo acionado</p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroStatus('REALIZADA')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filtroStatus === 'REALIZADA'
              ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-500/30'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Realizadas</span>
            <Icone nome="check" className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.REALIZADA}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Concluídas com sucesso</p>
        </button>

        <button
          type="button"
          onClick={() => setFiltroStatus('TODAS')}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            filtroStatus === 'TODAS'
              ? 'border-navy bg-navy-50/70 dark:bg-slate-800 ring-2 ring-navy/20 dark:border-sky-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Chamados</span>
            <Icone nome="wrench" className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.TOTAL}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Histórico completo</p>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <Cartao className="p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status do Chamado
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="EM_ANALISE">Aguardando Análise (Padrão)</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="REALIZADA">Realizadas</option>
              <option value="ARQUIVADA">Arquivadas</option>
              <option value="TODAS">Todos os Status</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Categoria
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="TODAS">Todas as Categorias</option>
              <option value="LIMPEZA">Limpeza</option>
              <option value="AVARIA_QUEBRADO">Avaria / Quebrado</option>
              <option value="MANUTENCAO">Manutenção</option>
              <option value="CONVIVENCIA_BARULHO">Convivência / Som</option>
              <option value="OUTROS">Outros Assuntos</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Data de Abertura (De)
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Data de Abertura (Até)
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Buscar Palavra-chave
            </label>
            <div className="relative">
              <input
                type="text"
                value={termoBusca}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTermoBusca(e.target.value)}
                placeholder="Morador, apto, título..."
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <span className="absolute left-2.5 top-2.5 text-slate-400">
                <Icone nome="search" className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>

        {temFiltroAtivo && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500">
              Filtro ativo: {filtroStatus === 'EM_ANALISE' ? 'Aguardando Análise' : filtroStatus}
              {dataInicio ? ` • a partir de ${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
              {dataFim ? ` • até ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
            </span>
            <button
              type="button"
              onClick={limparFiltros}
              className="font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
            >
              Restaurar filtros padrão
            </button>
          </div>
        )}
      </Cartao>

      {/* Tabela Padronizada de Chamados */}
      <Cartao className="p-0 overflow-hidden rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {filtroStatus === 'EM_ANALISE'
                ? 'Chamados Aguardando Análise (Não Respondidos)'
                : filtroStatus === 'EM_ANDAMENTO'
                ? 'Chamados Em Andamento'
                : filtroStatus === 'REALIZADA'
                ? 'Chamados Concluídos / Realizados'
                : filtroStatus === 'ARQUIVADA'
                ? 'Chamados Arquivados'
                : 'Todos os Chamados Registrados'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {chamados.length} ocorrência(s) encontrada(s) no condomínio
            </p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Página {pagina} de {totalPaginas}
          </span>
        </div>

        {carregando ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-3" />
            <p className="text-sm">Carregando fila de chamados...</p>
          </div>
        ) : chamados.length === 0 ? (
          <div className="py-16 text-center p-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Icone nome="check" className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              Nenhum chamado encontrado com os filtros selecionados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              {filtroStatus === 'EM_ANALISE'
                ? 'Ótimo trabalho! Todos os chamados do condomínio já foram respondidos ou estão em andamento.'
                : 'Altere os filtros acima para visualizar outras ocorrências no histórico.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Solicitante</th>
                  <th className="py-3 px-4">Categoria & Assunto</th>
                  <th className="py-3 px-4">Abertura</th>
                  <th className="py-3 px-4">Interações</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {chamadosPaginados.map((c) => {
                  const cat = CATEGORIAS_CONFIG[c.categoria] || CATEGORIAS_CONFIG.OUTROS;
                  const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.EM_ANALISE;
                  const dataAbertura = new Date(c.data_hora_abertura).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={c.id_chamado}
                      onClick={() => {
                        setChamadoSelecionadoId(c.id_chamado);
                        carregarDetalhes(c.id_chamado);
                      }}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge tipo={st.tipoBadge}>{st.rotulo}</Badge>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 dark:text-slate-100">
                        Bloco {c.bloco} • Apto {c.numero_apartamento}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{c.autor_nome}</div>
                        {c.autor_celular && (
                          <div className="text-[10px] text-slate-400">{c.autor_celular}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cat.corBadge}`}
                          >
                            <Icone nome={cat.icone} className="w-3 h-3" />
                            {cat.rotulo}
                          </span>
                          {c.imagem_url && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-1 py-0.2 rounded border border-sky-200 dark:border-sky-900">
                              <Icone nome="eye" className="w-2.5 h-2.5" />
                              Foto
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                          {c.titulo}
                        </div>
                        {c.local_especifico && (
                          <div className="text-[10px] text-slate-400 truncate">
                            Local: {c.local_especifico}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {dataAbertura}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.total_mensagens > 0
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {c.total_mensagens > 0 ? `${c.total_mensagens} msg(s)` : 'Sem resposta'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <Botao
                          tamanho="sm"
                          variante="primario"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChamadoSelecionadoId(c.id_chamado);
                            carregarDetalhes(c.id_chamado);
                          }}
                          className="text-xs py-1 px-3 shadow-none group-hover:shadow-xs transition-shadow"
                        >
                          Atender & Responder
                        </Botao>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {chamados.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Paginacao
              paginaAtual={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={chamados.length}
              itensPorPagina={ITENS_POR_PAGINA}
              onMudarPagina={setPagina}
            />
          </div>
        )}
      </Cartao>

      {/* Gaveta / Modal Lateral de Atendimento do Síndico */}
      {chamadoSelecionadoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-slide-left">
            {/* Header da Gaveta */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400 rounded-lg">
                  <Icone nome="wrench" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Atendimento do Chamado #{detalhes?.id_chamado || chamadoSelecionadoId}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bloco {detalhes?.bloco} • Apto {detalhes?.numero_apartamento} ({detalhes?.autor_nome})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChamadoSelecionadoId(null);
                  setDetalhes(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Icone nome="x" className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo da Gaveta */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {carregandoDetalhes || !detalhes ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-2" />
                  <p className="text-xs">Carregando detalhes do chamado...</p>
                </div>
              ) : (
                <>
                  {/* Cartão de Ações Rápidas de Status */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Alterar Ciclo de Vida do Chamado:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleMudarStatus('EM_ANALISE')}
                        disabled={atualizandoStatus || detalhes.status === 'EM_ANALISE'}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          detalhes.status === 'EM_ANALISE'
                            ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-amber-50'
                        }`}
                      >
                        Aguardando Análise
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMudarStatus('EM_ANDAMENTO')}
                        disabled={atualizandoStatus || detalhes.status === 'EM_ANDAMENTO'}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          detalhes.status === 'EM_ANDAMENTO'
                            ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-600/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-blue-50'
                        }`}
                      >
                        Em Andamento
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMudarStatus('REALIZADA')}
                        disabled={atualizandoStatus || detalhes.status === 'REALIZADA'}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          detalhes.status === 'REALIZADA'
                            ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-600/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-50'
                        }`}
                      >
                        Realizada
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMudarStatus('ARQUIVADA')}
                        disabled={atualizandoStatus || detalhes.status === 'ARQUIVADA'}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          detalhes.status === 'ARQUIVADA'
                            ? 'bg-slate-600 text-white border-slate-700 ring-2 ring-slate-600/30'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Arquivada
                      </button>
                    </div>
                  </div>

                  {/* Resumo da Ocorrência */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
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

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700">
                      <div>
                        <strong>Morador Solicitante:</strong> {detalhes.autor_nome}
                        {detalhes.autor_celular && ` • Tel: ${detalhes.autor_celular}`}
                        {detalhes.autor_email && ` • Email: ${detalhes.autor_email}`}
                      </div>
                      {detalhes.local_especifico && (
                        <div>
                          <strong>Local Específico:</strong> {detalhes.local_especifico}
                        </div>
                      )}
                      <div>
                        <strong>Data de Abertura:</strong>{' '}
                        {new Date(detalhes.data_hora_abertura).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-200/60 dark:border-slate-700 whitespace-pre-wrap">
                      {detalhes.descricao}
                    </p>

                    {detalhes.imagem_url && (
                      <div>
                        <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                          Foto da Ocorrência:
                        </span>
                        <a
                          href={detalhes.imagem_url}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 group relative"
                        >
                          <img
                            src={detalhes.imagem_url}
                            alt="Foto do chamado"
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                          />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Thread de Conversa / Histórico de Mensagens */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icone nome="shield" className="w-4 h-4 text-sky-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Canal Particular com a Unidade
                      </h4>
                    </div>

                    {detalhes.mensagens.length === 0 ? (
                      <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        Nenhuma mensagem trocada ainda com o morador. Envie uma resposta oficial abaixo para orientar a unidade.
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
                                        Você (Administração)
                                      </span>
                                      <span>{msg.autor_nome}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="px-1.5 py-0.2 bg-slate-500 text-white rounded text-[10px] uppercase font-bold tracking-wider">
                                        Morador
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

            {/* Input para Síndica enviar Resposta Oficial */}
            {detalhes && (
              <form
                onSubmit={handleEnviarResposta}
                className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={respostaOficial}
                  onChange={(e) => setRespostaOficial(e.target.value)}
                  placeholder="Responder ao morador (privado para o apartamento)..."
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <Botao
                  type="submit"
                  variante="primario"
                  disabled={enviandoResposta || !respostaOficial.trim()}
                  className="shrink-0"
                >
                  {enviandoResposta ? 'Enviando...' : 'Enviar Resposta'}
                </Botao>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
