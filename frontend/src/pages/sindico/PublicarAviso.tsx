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
  const ITENS_POR_PAGINA = 6;
  const [expandido, setExpandido] = useState<number | null>(null);

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
          <div id="tour-avisos-form">
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
          </div>
        }
      >
        Mural de Avisos & Comunicados
      </Titulo>

      {msg.t && <Mensagem tipo={msg.tipo} texto={msg.t} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />}

      {/* Abas Superiores de Categoria (Padrão Lettly SaaS) */}
      <div id="tour-avisos-alvo" className="flex flex-wrap gap-2 border-b border-[#e2e6ec] dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            setAbaAtiva('TODOS');
            setPagina(1);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'TODOS'
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="megaphone" className="h-4 w-4" />
          <span>Todos os Avisos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'TODOS'
                ? 'bg-white/20 text-white'
                : 'bg-[#f6f7f9] text-[#525d6e] dark:bg-slate-800 dark:text-slate-400'
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
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="shield" className="h-4 w-4" />
          <span>Comunicados da Administração</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'ADMINISTRADOR'
                ? 'bg-white/20 text-white'
                : 'bg-[#f6f7f9] text-[#525d6e] dark:bg-slate-800 dark:text-slate-400'
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
              ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-[#e2e6ec] hover:bg-[#f6f7f9] dark:bg-[#0e1525] dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="package" className="h-4 w-4" />
          <span>Avisos de Encomenda</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'ENCOMENDA'
                ? 'bg-white/20 text-white'
                : 'bg-[#fdf0d9] text-[#b26a00] dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {avisos.filter((a) => a.categoria === 'ENCOMENDA').length}
          </span>
        </button>
      </div>

      {/* Barra de Filtros por Data, Status e Busca */}
      <Cartao className="p-4 rounded-2xl border border-[#e2e6ec] bg-white dark:border-slate-800 dark:bg-[#0e1525] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#525d6e] dark:text-slate-400 mb-1">
              Status de Exibição
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="w-full rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] px-3 py-2 text-xs font-semibold text-[#0b1830] focus:border-navy focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ATIVOS">Avisos Ativos (No Mural)</option>
              <option value="ARQUIVADOS">Avisos Arquivados (Ocultos)</option>
              <option value="TODOS">Todos os Avisos (Ativos e Arquivados)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#525d6e] dark:text-slate-400 mb-1">
              Publicação (A partir de)
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] px-3 py-2 text-xs font-semibold text-[#0b1830] focus:border-navy focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#525d6e] dark:text-slate-400 mb-1">
              Até data
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] px-3 py-2 text-xs font-semibold text-[#0b1830] focus:border-navy focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#525d6e] dark:text-slate-400 mb-1">
              Buscar comunicado
            </label>
            <div className="relative">
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Título ou autor..."
                className="w-full rounded-xl border border-[#e2e6ec] bg-[#f6f7f9] pl-8 pr-3 py-2 text-xs font-semibold text-[#0b1830] placeholder-slate-400 focus:border-navy focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

      {/* Seção de Comunicados (Cards com Chevron Expansível e Paginação) */}
      <div id="tour-avisos-enviar" className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              {abaAtiva === 'ADMINISTRADOR'
                ? 'Comunicados do Administrador'
                : abaAtiva === 'ENCOMENDA'
                ? 'Avisos de Encomenda'
                : 'Mural de Comunicados'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {abaAtiva === 'ADMINISTRADOR'
                ? 'Comunicados oficiais emitidos pela administração para o mural do condomínio'
                : abaAtiva === 'ENCOMENDA'
                ? 'Avisos automáticos gerados pela portaria na chegada de pacotes'
                : 'Histórico completo de comunicados e publicações para os moradores'}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {avisosFiltradosPorAba.length} aviso(s)
          </span>
        </div>

        {carregando ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-3" />
            <p className="text-sm">Carregando avisos do condomínio...</p>
          </div>
        ) : avisosFiltradosPorAba.length === 0 ? (
          <div className="py-16 text-center p-8 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
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
          <div className="space-y-3">
            {avisosPaginados.map((a) => {
              const eAberto = expandido === a.id_aviso;
              const dtPub = new Date(a.data_hora_publicacao);
              const percLidos =
                a.total_destinatarios > 0
                  ? Math.round((a.total_lidos / a.total_destinatarios) * 100)
                  : 0;
              const isEncomenda = a.categoria === 'ENCOMENDA';

              return (
                <div
                  key={a.id_aviso}
                  className={`rounded-2xl border p-4 shadow-soft transition-all ${
                    a.arquivado
                      ? 'border-slate-200/60 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 opacity-85'
                      : isEncomenda
                      ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="space-y-1.5 flex-1 cursor-pointer select-none"
                      onClick={() => setExpandido(eAberto ? null : a.id_aviso)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {isEncomenda ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            <Icone nome="package" className="h-3 w-3" />
                            AVISO DE ENCOMENDA
                          </span>
                        ) : (
                          <>
                            {a.fixado && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                <Icone nome="pin" className="h-3 w-3" />
                                FIXADO
                              </span>
                            )}
                            {a.arquivado ? (
                              <Badge tipo="neutro">ARQUIVADO</Badge>
                            ) : a.status === 'PUBLICADO' ? (
                              <Badge tipo="sucesso">PUBLICADO</Badge>
                            ) : a.status === 'AGENDADO' ? (
                              <Badge tipo="info">AGENDADO</Badge>
                            ) : (
                              <Badge tipo="neutro">EXPIRADO</Badge>
                            )}
                          </>
                        )}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {a.titulo}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Publicado em: <b>{dtPub.toLocaleString('pt-BR')}</b> • Por <b>{a.autor}</b>
                        {a.data_hora_expiracao && (
                          <span> • Expira em: {new Date(a.data_hora_expiracao).toLocaleString('pt-BR')}</span>
                        )}
                        {a.destinatario_nome && a.destinatario_nome !== 'Todos os Moradores' && (
                          <span> • Para: <b>{a.destinatario_nome} {a.destinatario_unidade ? `(${a.destinatario_unidade})` : ''}</b></span>
                        )}
                      </p>

                      {/* Barra de Progresso de Leituras */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="h-1.5 w-28 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.min(100, percLidos)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {a.total_lidos} de {a.total_destinatarios} lidos ({percLidos}%)
                        </span>
                      </div>

                      {/* Anexo quando o card está recolhido */}
                      {!eAberto && a.anexo_url && (
                        <div className="pt-1.5">
                          <a
                            href={a.anexo_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-navy hover:text-navy dark:hover:border-sky-500 dark:hover:text-sky-300 transition-colors"
                          >
                            <Icone nome={a.anexo_tipo === 'PDF' ? 'fileText' : 'image'} className="h-3.5 w-3.5 text-navy dark:text-sky-400" />
                            <span className="truncate max-w-[220px] sm:max-w-xs">
                              {a.anexo_nome || (a.anexo_tipo === 'PDF' ? 'Documento PDF' : 'Imagem em anexo')}
                            </span>
                            <Icone nome="download" className="h-3 w-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação: Chevron para expandir e Caixa/Check para arquivar */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setExpandido(eAberto ? null : a.id_aviso)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={eAberto ? 'Recolher aviso' : 'Ver conteúdo'}
                      >
                        <Icone
                          nome="chevronDown"
                          className={`h-4 w-4 transform transition-transform duration-200 ${
                            eAberto ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvisoParaArquivar(a);
                        }}
                        className={`rounded-lg p-2 transition-colors cursor-pointer ${
                          a.arquivado
                            ? 'text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:text-sky-400 dark:hover:bg-sky-950/40'
                            : 'text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:text-slate-400 dark:hover:bg-amber-950/40 dark:hover:text-amber-300'
                        }`}
                        title={
                          a.arquivado
                            ? 'Desarquivar comunicado (reativar no mural)'
                            : 'Arquivar comunicado (ocultar dos moradores)'
                        }
                      >
                        <Icone nome={a.arquivado ? 'check' : 'box'} className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo Expandido do Aviso */}
                  {eAberto && (
                    <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300 space-y-3 animate-fade-in">
                      <div className="whitespace-pre-line leading-relaxed text-slate-700 dark:text-slate-200 bg-slate-50/80 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        {a.conteudo}
                      </div>

                      {a.anexo_url && a.anexo_tipo === 'IMAGEM' && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 max-w-md">
                          <a href={a.anexo_url} target="_blank" rel="noreferrer" className="block group">
                            <img
                              src={a.anexo_url}
                              alt={a.anexo_nome || 'Anexo'}
                              className="w-full object-cover max-h-72 group-hover:scale-102 transition-transform"
                            />
                          </a>
                        </div>
                      )}

                      {a.anexo_url && a.anexo_tipo === 'PDF' && (
                        <a
                          href={a.anexo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors shadow-xs"
                        >
                          <Icone nome="fileText" className="h-4 w-4" />
                          <span>Visualizar Documento PDF ({a.anexo_nome || 'Baixar'})</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Rodapé com Paginação */}
            <div className="pt-2">
              <Paginacao
                paginaAtual={pagina}
                totalPaginas={totalPaginas}
                totalRegistros={avisosFiltradosPorAba.length}
                itensPorPagina={ITENS_POR_PAGINA}
                onMudarPagina={setPagina}
              />
            </div>
          </div>
        )}
      </div>

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

      {/* MODAL 2: CONFIRMAÇÃO DE ARQUIVAMENTO (EM VEZ DE EXCLUSÃO) */}
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
