import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao, Paginacao } from '../../components/ui';
import { agoraInputDateTime } from '../../utils/data';

export type AvisoAdmin = {
  id_aviso: number;
  titulo: string;
  conteudo: string;
  escopo: string;
  fixado: boolean;
  arquivado?: boolean;
  data_hora_arquivamento?: string | null;
  data_hora_publicacao: string;
  data_hora_expiracao?: string | null;
  autor: string;
  status: 'PUBLICADO' | 'AGENDADO' | 'EXPIRADO' | 'ARQUIVADO';
  total_destinatarios: number;
  total_lidos: number;
  categoria: 'ADMINISTRADOR' | 'ENCOMENDA';
  destinatario_nome?: string;
  destinatario_unidade?: string;
  anexo_url?: string | null;
  anexo_nome?: string | null;
  anexo_tipo?: 'IMAGEM' | 'PDF' | null;
};

/** UC10 - Publicar, agendar e gerenciar avisos do condomínio em formato Tabela com Arquivamento Seguro */
export default function PublicarAviso() {
  const [avisos, setAvisos] = useState<AvisoAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Abas de Categoria
  const [abaAtiva, setAbaAtiva] = useState<'TODOS' | 'ADMINISTRADOR' | 'ENCOMENDA'>('TODOS');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<'ATIVOS' | 'ARQUIVADOS' | 'TODOS'>('ATIVOS');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [termoBusca, setTermoBusca] = useState('');

  // Paginação
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 10;

  // Modal Novo Comunicado
  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [dataPublicacao, setDataPublicacao] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState('');
  const [fixado, setFixado] = useState(false);
  const [anexo, setAnexo] = useState<{ url: string; nome: string; tipo: 'IMAGEM' | 'PDF' } | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Modal Ver Detalhes
  const [visualizando, setVisualizando] = useState<AvisoAdmin | null>(null);

  // Modal de Confirmação de Arquivamento
  const [avisoParaArquivar, setAvisoParaArquivar] = useState<AvisoAdmin | null>(null);

  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (filtroStatus !== 'TODOS') params.append('status', filtroStatus);
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    if (termoBusca.trim()) params.append('busca', termoBusca.trim());

    api
      .get<AvisoAdmin[]>(`/avisos?${params.toString()}`)
      .then((dados) => {
        setAvisos(dados);
        setCarregando(false);
      })
      .catch((err: any) => {
        setMsg({ t: err.message || 'Falha ao carregar mural de avisos.', tipo: 'erro' });
        setCarregando(false);
      });
  };

  useEffect(() => {
    setPagina(1);
    carregar();
  }, [filtroStatus, dataInicio, dataFim, termoBusca]);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ t: '', tipo: 'ok' });

    const agora = new Date();
    const limitePassado = new Date(agora.getTime() - 60 * 1000);

    if (dataPublicacao && new Date(dataPublicacao) < limitePassado) {
      setMsg({ t: 'A data de publicação não pode ser no passado.', tipo: 'erro' });
      return;
    }

    if (dataExpiracao) {
      const dtExp = new Date(dataExpiracao);
      if (dtExp < agora) {
        setMsg({ t: 'A data de expiração não pode ser no passado.', tipo: 'erro' });
        return;
      }
      const dtBase = dataPublicacao ? new Date(dataPublicacao) : agora;
      if (dtExp <= dtBase) {
        setMsg({ t: 'A data de expiração deve ser posterior à data de publicação.', tipo: 'erro' });
        return;
      }
    }

    setSalvando(true);
    try {
      await api.post('/avisos', {
        titulo,
        conteudo,
        fixado,
        data_hora_publicacao: dataPublicacao ? new Date(dataPublicacao).toISOString() : undefined,
        data_hora_expiracao: dataExpiracao ? new Date(dataExpiracao).toISOString() : undefined,
        anexo_url: anexo?.url,
        anexo_nome: anexo?.nome,
        anexo_tipo: anexo?.tipo,
      });

      const eAgendado = dataPublicacao && new Date(dataPublicacao) > new Date();
      setMsg({
        t: eAgendado
          ? `Aviso agendado com sucesso para ${new Date(dataPublicacao).toLocaleString('pt-BR')}.`
          : 'Aviso publicado e distribuído a todos os moradores no mural.',
        tipo: 'ok',
      });

      setTitulo('');
      setConteudo('');
      setDataPublicacao('');
      setDataExpiracao('');
      setFixado(false);
      setAnexo(null);
      setModalAberto(false);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function handleUploadAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoAnexo(true);
    setMsg({ t: '', tipo: 'ok' });
    try {
      const res = await api.upload<{ anexo_url: string; anexo_nome: string; anexo_tipo: 'IMAGEM' | 'PDF' }>(
        '/avisos/upload-anexo',
        'arquivo',
        file,
      );
      setAnexo({ url: res.anexo_url, nome: res.anexo_nome, tipo: res.anexo_tipo });
      setMsg({ t: 'Arquivo anexado com sucesso!', tipo: 'ok' });
    } catch (err: any) {
      setMsg({ t: err.message || 'Falha ao enviar arquivo.', tipo: 'erro' });
    } finally {
      setEnviandoAnexo(false);
      e.target.value = '';
    }
  }

  async function confirmarArquivamento() {
    if (!avisoParaArquivar) return;
    try {
      const novoStatus = !avisoParaArquivar.arquivado;
      await api.patch(`/avisos/${avisoParaArquivar.id_aviso}/arquivar`, {
        arquivar: novoStatus,
      });

      setMsg({
        t: novoStatus
          ? `Aviso "${avisoParaArquivar.titulo}" foi arquivado e não aparecerá para os moradores.`
          : `Aviso "${avisoParaArquivar.titulo}" foi desarquivado e voltou a ser exibido no mural.`,
        tipo: 'ok',
      });
      setAvisoParaArquivar(null);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message || 'Falha ao alterar arquivamento.', tipo: 'erro' });
    }
  }

  const limparFiltros = () => {
    setAbaAtiva('TODOS');
    setFiltroStatus('ATIVOS');
    setDataInicio('');
    setDataFim('');
    setTermoBusca('');
    setPagina(1);
  };

  const temFiltroAtivo =
    abaAtiva !== 'TODOS' ||
    filtroStatus !== 'ATIVOS' ||
    Boolean(dataInicio) ||
    Boolean(dataFim) ||
    Boolean(termoBusca.trim());

  // Filtragem local por categoria da aba
  const avisosFiltradosPorAba = avisos.filter((a) => {
    if (abaAtiva === 'ADMINISTRADOR') return a.categoria === 'ADMINISTRADOR';
    if (abaAtiva === 'ENCOMENDA') return a.categoria === 'ENCOMENDA';
    return true;
  });

  const totalPaginas = Math.ceil(avisosFiltradosPorAba.length / ITENS_POR_PAGINA) || 1;
  const avisosPaginados = avisosFiltradosPorAba.slice(
    (pagina - 1) * ITENS_POR_PAGINA,
    pagina * ITENS_POR_PAGINA
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Titulo
        ajudaKey="/sindico/avisos"
        sub="Crie comunicados oficiais, controle avisos de portaria e consulte o histórico de publicações do mural."
        icone={<Icone nome="megaphone" className="h-5 w-5" />}
        acao={
          <Botao
            variante="primario"
            icone={<Icone nome="plus" className="h-4 w-4" />}
            onClick={() => {
              setTitulo('');
              setConteudo('');
              setDataPublicacao('');
              setDataExpiracao('');
              setFixado(false);
              setAnexo(null);
              setModalAberto(true);
            }}
          >
            Novo Comunicado
          </Botao>
        }
      >
        Mural de Avisos & Comunicados
      </Titulo>

      {msg.t && <Mensagem tipo={msg.tipo} texto={msg.t} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />}

      {/* Abas Superiores de Categoria */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => {
            setAbaAtiva('TODOS');
            setPagina(1);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'TODOS'
              ? 'bg-navy text-white shadow-sm dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="megaphone" className="h-4 w-4" />
          <span>Todos os Avisos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'TODOS'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {avisos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('ADMINISTRADOR');
            setPagina(1);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'ADMINISTRADOR'
              ? 'bg-navy text-white shadow-sm dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="shield" className="h-4 w-4" />
          <span>Comunicados da Administração</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'ADMINISTRADOR'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {avisos.filter((a) => a.categoria === 'ADMINISTRADOR').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAbaAtiva('ENCOMENDA');
            setPagina(1);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'ENCOMENDA'
              ? 'bg-amber-600 text-white shadow-sm dark:bg-amber-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="package" className="h-4 w-4" />
          <span>Avisos de Encomenda</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'ENCOMENDA'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {avisos.filter((a) => a.categoria === 'ENCOMENDA').length}
          </span>
        </button>
      </div>

      {/* Barra de Filtros por Data, Status e Busca */}
      <Cartao className="p-4 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Status de Exibição
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-navy focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ATIVOS">Avisos Ativos (No Mural)</option>
              <option value="ARQUIVADOS">Avisos Arquivados (Ocultos)</option>
              <option value="TODOS">Todos os Avisos (Ativos e Arquivados)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Publicação (A partir de)
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
              Publicação (Até)
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
              Busca por Palavra-chave
            </label>
            <div className="relative">
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Título ou conteúdo..."
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
              Filtro ativo: {filtroStatus === 'ATIVOS' ? 'Apenas Ativos' : filtroStatus === 'ARQUIVADOS' ? 'Apenas Arquivados' : 'Todos'}
              {dataInicio ? ` • De ${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
              {dataFim ? ` • Até ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
              {termoBusca ? ` • Termo: "${termoBusca}"` : ''}
            </span>
            <button
              type="button"
              onClick={limparFiltros}
              className="font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
            >
              Restaurar filtros
            </button>
          </div>
        )}
      </Cartao>

      {/* Tabela Padronizada de Avisos */}
      <Cartao className="p-0 overflow-hidden rounded-2xl">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {abaAtiva === 'ADMINISTRADOR'
                ? 'Comunicados Oficiais do Administrador'
                : abaAtiva === 'ENCOMENDA'
                ? 'Avisos Automáticos de Encomenda'
                : 'Mural Geral de Avisos'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {avisosFiltradosPorAba.length} comunicado(s) listado(s) • Os arquivados não aparecem para os moradores
            </p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Página {pagina} de {totalPaginas}
          </span>
        </div>

        {carregando ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-3" />
            <p className="text-sm">Carregando avisos do condomínio...</p>
          </div>
        ) : avisosFiltradosPorAba.length === 0 ? (
          <div className="py-16 text-center p-8">
            <EmptyState
              icone={abaAtiva === 'ENCOMENDA' ? 'package' : 'megaphone'}
              titulo={
                filtroStatus === 'ARQUIVADOS'
                  ? 'Nenhum aviso arquivado encontrado'
                  : 'Nenhum comunicado encontrado com os filtros selecionados'
              }
              descricao="Ajuste os filtros acima ou publique um novo comunicado para os moradores."
              acao={
                filtroStatus !== 'ARQUIVADOS' ? (
                  <Botao
                    variante="primario"
                    tamanho="sm"
                    icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                    onClick={() => setModalAberto(true)}
                  >
                    Novo Comunicado
                  </Botao>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Título & Conteúdo</th>
                  <th className="py-3 px-4">Destinatários</th>
                  <th className="py-3 px-4">Publicação</th>
                  <th className="py-3 px-4">Expiração</th>
                  <th className="py-3 px-4">Leituras</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {avisosPaginados.map((a) => {
                  const isEncomenda = a.categoria === 'ENCOMENDA';
                  const dtPub = new Date(a.data_hora_publicacao).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const dtExp = a.data_hora_expiracao
                    ? new Date(a.data_hora_expiracao).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'Sem expiração';

                  const percLidos =
                    a.total_destinatarios > 0
                      ? Math.round((a.total_lidos / a.total_destinatarios) * 100)
                      : 0;

                  return (
                    <tr
                      key={a.id_aviso}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group ${
                        a.arquivado ? 'opacity-70 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {a.arquivado ? (
                          <Badge tipo="neutro">Arquivado</Badge>
                        ) : a.status === 'PUBLICADO' ? (
                          <Badge tipo="sucesso">Publicado</Badge>
                        ) : a.status === 'AGENDADO' ? (
                          <Badge tipo="info">Agendado</Badge>
                        ) : (
                          <Badge tipo="aviso">Expirado</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {a.fixado && (
                            <span className="p-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" title="Aviso Fixado no topo">
                              <Icone nome="pin" className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isEncomenda
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-navy-50 text-navy dark:bg-sky-950 dark:text-sky-300'
                            }`}
                          >
                            {isEncomenda ? 'Encomenda' : 'Administrador'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {a.titulo}
                          </span>
                          {a.anexo_url && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 text-[10px] font-medium border border-sky-200 dark:border-sky-800">
                              <Icone nome={a.anexo_tipo === 'PDF' ? 'fileText' : 'image'} className="w-2.5 h-2.5" />
                              {a.anexo_tipo}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {a.conteudo}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="font-medium">{a.destinatario_nome || 'Todos os Moradores'}</div>
                        {a.destinatario_unidade && (
                          <div className="text-[10px] text-slate-400">{a.destinatario_unidade}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {dtPub}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {dtExp}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, percLidos)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {percLidos}%
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {a.total_lidos}/{a.total_destinatarios} lidos
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Botao
                            tamanho="sm"
                            variante="secundario"
                            onClick={() => setVisualizando(a)}
                            className="text-xs py-1 px-2.5"
                            title="Ver conteúdo completo"
                          >
                            <Icone nome="eye" className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </Botao>

                          <button
                            type="button"
                            onClick={() => setAvisoParaArquivar(a)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer ${
                              a.arquivado
                                ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                            }`}
                            title={a.arquivado ? 'Desarquivar e reativar no mural' : 'Arquivar (oculta dos moradores)'}
                          >
                            <Icone nome={a.arquivado ? 'check' : 'box'} className="w-3.5 h-3.5" />
                            <span>{a.arquivado ? 'Desarquivar' : 'Arquivar'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {avisosFiltradosPorAba.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Paginacao
              paginaAtual={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={avisosFiltradosPorAba.length}
              itensPorPagina={ITENS_POR_PAGINA}
              onMudarPagina={setPagina}
            />
          </div>
        )}
      </Cartao>

      {/* MODAL 1: NOVO COMUNICADO */}
      <Modal
        aberto={modalAberto}
        fechar={() => !salvando && setModalAberto(false)}
        titulo="Emitir Novo Comunicado Oficial"
      >
        <form onSubmit={publicar} className="space-y-4">
          <Campo rotulo="Título do Comunicado" obrigatorio>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Manutenção preventiva dos elevadores"
              className={inputCls}
              required
              maxLength={120}
            />
          </Campo>

          <Campo rotulo="Conteúdo / Mensagem" obrigatorio>
            <textarea
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Descreva as orientações para os condôminos..."
              className={inputCls + ' min-h-[120px] resize-y'}
              required
              maxLength={2000}
            />
            <div className="flex justify-end text-[11px] text-slate-400 mt-1">
              {conteudo.length}/2000 caracteres
            </div>
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="Data de Publicação (Opcional - Agendamento)">
              <input
                type="datetime-local"
                value={dataPublicacao}
                onChange={(e) => setDataPublicacao(e.target.value)}
                min={agoraInputDateTime()}
                className={inputCls}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Deixe em branco para publicar imediatamente.
              </p>
            </Campo>

            <Campo rotulo="Data de Expiração (Opcional)">
              <input
                type="datetime-local"
                value={dataExpiracao}
                onChange={(e) => setDataExpiracao(e.target.value)}
                min={dataPublicacao || agoraInputDateTime()}
                className={inputCls}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Após esta data, o aviso não será mais exibido.
              </p>
            </Campo>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <input
              type="checkbox"
              id="chk-fixado"
              checked={fixado}
              onChange={(e) => setFixado(e.target.checked)}
              className="h-4 w-4 rounded text-navy focus:ring-navy cursor-pointer"
            />
            <label htmlFor="chk-fixado" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              Fixar aviso no topo do mural dos moradores
            </label>
          </div>

          {/* Upload de Imagem ou PDF */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Anexo (Imagem JPG, PNG, WebP ou documento PDF - máx. 15MB)
            </label>
            {anexo ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 truncate text-xs">
                  <Icone nome={anexo.tipo === 'PDF' ? 'fileText' : 'image'} className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-semibold truncate">{anexo.nome}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnexo(null)}
                  className="text-red-500 hover:text-red-700 text-xs font-bold p-1 cursor-pointer"
                >
                  Remover
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleUploadAnexo}
                disabled={enviandoAnexo}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy hover:file:bg-navy-100 dark:file:bg-sky-950 dark:file:text-sky-300 cursor-pointer"
              />
            )}
            {enviandoAnexo && <p className="text-xs text-sky-600 animate-pulse">Enviando anexo...</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Botao
              type="button"
              variante="secundario"
              onClick={() => setModalAberto(false)}
              disabled={salvando}
            >
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario" carregando={salvando}>
              {dataPublicacao && new Date(dataPublicacao) > new Date() ? 'Agendar Comunicado' : 'Publicar Agora'}
            </Botao>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VISUALIZAR AVISO COMPLETO */}
      {visualizando && (
        <Modal
          aberto={Boolean(visualizando)}
          fechar={() => setVisualizando(null)}
          titulo={visualizando.titulo}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {visualizando.fixado && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 text-xs font-bold">
                    <Icone nome="pin" className="w-3 h-3" />
                    Fixado
                  </span>
                )}
                {visualizando.arquivado ? (
                  <Badge tipo="neutro">Arquivado (Oculto)</Badge>
                ) : (
                  <Badge tipo={visualizando.status === 'PUBLICADO' ? 'sucesso' : visualizando.status === 'AGENDADO' ? 'info' : 'aviso'}>
                    {visualizando.status}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Publicado por: <strong>{visualizando.autor}</strong>
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              {visualizando.conteudo}
            </p>

            {visualizando.anexo_url && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Arquivo Anexo:
                </span>
                {visualizando.anexo_tipo === 'IMAGEM' ? (
                  <a
                    href={visualizando.anexo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-64 group"
                  >
                    <img
                      src={visualizando.anexo_url}
                      alt={visualizando.anexo_nome || 'Anexo'}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                    />
                  </a>
                ) : (
                  <a
                    href={visualizando.anexo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    <Icone nome="fileText" className="w-4 h-4" />
                    <span>Visualizar Documento PDF ({visualizando.anexo_nome || 'Baixar'})</span>
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>Destinatários: {visualizando.destinatario_nome || 'Todos os Moradores'}</span>
              <span>
                Leituras: {visualizando.total_lidos}/{visualizando.total_destinatarios}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Botao variante="secundario" onClick={() => setVisualizando(null)}>
                Fechar
              </Botao>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIRMAÇÃO DE ARQUIVAMENTO (EM VEZ DE EXCLUSÃO) */}
      {avisoParaArquivar && (
        <ModalConfirmacao
          aberto={Boolean(avisoParaArquivar)}
          fechar={() => setAvisoParaArquivar(null)}
          confirmar={confirmarArquivamento}
          titulo={avisoParaArquivar.arquivado ? 'Desarquivar Comunicado?' : 'Arquivar Comunicado?'}
          mensagem={
            avisoParaArquivar.arquivado
              ? `Deseja desarquivar o aviso "${avisoParaArquivar.titulo}"? Ele voltará a ser exibido para todos os moradores no mural do condomínio.`
              : `Deseja arquivar o aviso "${avisoParaArquivar.titulo}"? Ele deixará imediatamente de ser exibido no mural dos moradores, mas permanecerá seguro no histórico da administração.`
          }
          textoBotaoConfirmar={avisoParaArquivar.arquivado ? 'Sim, Desarquivar' : 'Sim, Arquivar Aviso'}
          variante={avisoParaArquivar.arquivado ? 'primario' : 'perigo'}
          icone={avisoParaArquivar.arquivado ? 'check' : 'alert'}
        />
      )}
    </div>
  );
}
