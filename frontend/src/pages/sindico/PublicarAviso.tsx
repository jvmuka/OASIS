import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao } from '../../components/ui';

type AvisoAdmin = {
  id_aviso: number;
  titulo: string;
  conteudo: string;
  escopo: string;
  fixado: boolean;
  data_hora_publicacao: string;
  data_hora_expiracao?: string | null;
  autor: string;
  status: 'PUBLICADO' | 'AGENDADO' | 'EXPIRADO';
  total_destinatarios: number;
  total_lidos: number;
  categoria: 'ADMINISTRADOR' | 'ENCOMENDA';
  destinatario_nome?: string;
  destinatario_unidade?: string;
};

/** UC10 - Publicar, agendar e gerenciar avisos do condomínio (UI/UX Pro Max) */
export default function PublicarAviso() {
  const [avisos, setAvisos] = useState<AvisoAdmin[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'ADMINISTRADOR' | 'ENCOMENDA' | 'TODOS'>('ADMINISTRADOR');
  const [modalAberto, setModalAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [dataPublicacao, setDataPublicacao] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState('');
  const [fixado, setFixado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState<AvisoAdmin | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    api
      .get<AvisoAdmin[]>('/avisos')
      .then(setAvisos)
      .catch((err: any) => setMsg({ t: err.message, tipo: 'erro' }));
  };

  useEffect(() => {
    carregar();
  }, []);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ t: '', tipo: 'ok' });
    setSalvando(true);
    try {
      await api.post('/avisos', {
        titulo,
        conteudo,
        fixado,
        data_hora_publicacao: dataPublicacao ? new Date(dataPublicacao).toISOString() : undefined,
        data_hora_expiracao: dataExpiracao ? new Date(dataExpiracao).toISOString() : undefined,
      });

      const eAgendado = dataPublicacao && new Date(dataPublicacao) > new Date();
      setMsg({
        t: eAgendado
          ? `Aviso agendado com sucesso para ${new Date(dataPublicacao).toLocaleString('pt-BR')}.`
          : 'Aviso publicado e distribuído a todos os moradores.',
        tipo: 'ok',
      });

      setTitulo('');
      setConteudo('');
      setDataPublicacao('');
      setDataExpiracao('');
      setFixado(false);
      setModalAberto(false);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    try {
      await api.delete(`/avisos/${excluindo.id_aviso}`);
      setMsg({ t: `Aviso "${excluindo.titulo}" excluído.`, tipo: 'ok' });
      setExcluindo(null);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  const isAgendamento = dataPublicacao && new Date(dataPublicacao) > new Date();

  const avisosAdmin = avisos.filter(a => a.categoria === 'ADMINISTRADOR');
  const avisosEncomenda = avisos.filter(a => a.categoria === 'ENCOMENDA');
  const avisosExibidos =
    abaAtiva === 'ADMINISTRADOR'
      ? avisosAdmin
      : abaAtiva === 'ENCOMENDA'
      ? avisosEncomenda
      : avisos;

  return (
    <div className="space-y-6">
      <Titulo
        sub="Crie comunicados imediatos, agende publicações e acompanhe as taxas de leitura dos moradores."
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
              setModalAberto(true);
            }}
          >
            Novo Comunicado
          </Botao>
        }
      >
        Publicar & Gerenciar Avisos
      </Titulo>

      {/* Abas de Navegação dos Avisos */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('ADMINISTRADOR')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'ADMINISTRADOR'
              ? 'bg-navy text-white shadow-sm dark:bg-sky-600'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <Icone nome="megaphone" className="h-4 w-4" />
          <span>Avisos de Administrador</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'ADMINISTRADOR'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {avisosAdmin.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('ENCOMENDA')}
          className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
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
            {avisosEncomenda.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('TODOS')}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            abaAtiva === 'TODOS'
              ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          }`}
        >
          <span>Todos</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              abaAtiva === 'TODOS'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {avisos.length}
          </span>
        </button>
      </div>

      {/* Listagem de Avisos em Largura Total */}
      <Cartao>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {abaAtiva === 'ADMINISTRADOR'
                ? 'Comunicados do Administrador'
                : abaAtiva === 'ENCOMENDA'
                ? 'Avisos de Encomenda da Portaria'
                : 'Todos os Avisos Distribuídos'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {abaAtiva === 'ADMINISTRADOR'
                ? 'Comunicados oficiais emitidos pela administração para o mural do condomínio'
                : abaAtiva === 'ENCOMENDA'
                ? 'Notificações geradas automaticamente no recebimento de encomendas na portaria'
                : 'Histórico consolidado de comunicados e notificações'}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {avisosExibidos.length} aviso(s)
          </span>
        </div>

        {avisosExibidos.length === 0 ? (
          <EmptyState
            icone={abaAtiva === 'ENCOMENDA' ? 'package' : 'megaphone'}
            titulo={
              abaAtiva === 'ADMINISTRADOR'
                ? 'Nenhum comunicado do administrador cadastrado'
                : abaAtiva === 'ENCOMENDA'
                ? 'Nenhum aviso de encomenda registrado'
                : 'Nenhum comunicado cadastrado'
            }
            descricao={
              abaAtiva === 'ADMINISTRADOR'
                ? 'Clique no botão abaixo para emitir o primeiro comunicado para os moradores.'
                : abaAtiva === 'ENCOMENDA'
                ? 'Quando o porteiro registrar uma encomenda, o morador destinatário receberá o aviso automaticamente aqui.'
                : 'Não há comunicados no momento.'
            }
            acao={
              abaAtiva === 'ADMINISTRADOR' ? (
                <Botao
                  variante="primario"
                  tamanho="sm"
                  icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                  onClick={() => setModalAberto(true)}
                >
                  Criar Comunicado
                </Botao>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {avisosExibidos.map(a => {
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
                  className={`rounded-xl border p-4 shadow-soft transition-all hover:border-slate-300 dark:hover:border-slate-700 ${
                    isEncomenda
                      ? 'border-amber-200/70 bg-gradient-to-r from-amber-50/20 to-transparent dark:border-amber-900/40 dark:bg-amber-950/10'
                      : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isEncomenda ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                            <Icone nome="package" className="h-3 w-3" />
                            AVISO DE ENCOMENDA
                          </span>
                        ) : (
                          <>
                            {a.fixado && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                                <Icone nome="pin" className="h-3 w-3" />
                                FIXADO
                              </span>
                            )}
                            <Badge
                              tipo={
                                a.status === 'PUBLICADO'
                                  ? 'sucesso'
                                  : a.status === 'AGENDADO'
                                  ? 'info'
                                  : 'neutro'
                              }
                            >
                              {a.status}
                            </Badge>
                          </>
                        )}
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.titulo}</h4>
                      </div>

                      {isEncomenda ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            <span>Destinatário:</span>
                            <span className="rounded-md bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 font-bold text-navy dark:text-sky-400">
                              {a.destinatario_nome}
                            </span>
                            {a.destinatario_unidade && (
                              <span className="text-slate-500 dark:text-slate-400">
                                ({a.destinatario_unidade})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Recebido na portaria em <b>{dtPub.toLocaleString('pt-BR')}</b> • Por <b>{a.autor}</b>
                          </p>
                          <div className="pt-1">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              a.total_lidos > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              <Icone nome={a.total_lidos > 0 ? 'check' : 'clock'} className="h-3 w-3" />
                              {a.total_lidos > 0 ? 'Visualizado pelo morador' : 'Aguardando visualização pelo morador'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {a.status === 'AGENDADO' ? 'Agendado para: ' : 'Publicado em: '}
                            <b>{dtPub.toLocaleString('pt-BR')}</b> • Por <b>{a.autor}</b>
                          </p>

                          {/* Taxa de leitura */}
                          <div className="mt-2 flex items-center gap-3">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${percLidos}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              <b>{a.total_lidos}</b> de <b>{a.total_destinatarios}</b> lidos ({percLidos}%)
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setExpandido(eAberto ? null : a.id_aviso)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={eAberto ? 'Recolher' : 'Ver conteúdo'}
                      >
                        <Icone
                          nome="chevronDown"
                          className={`h-4 w-4 transform transition-transform ${eAberto ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <button
                        onClick={() => setExcluindo(a)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir aviso"
                      >
                        <Icone nome="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {eAberto && (
                    <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-fade-in">
                      <p className="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        {a.conteudo}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Cartao>

      {/* Modal de Criação / Agendamento de Comunicado */}
      <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        titulo={isAgendamento ? 'Agendar Publicação de Comunicado' : 'Publicar Novo Comunicado'}
        rodape={
          <>
            <Botao type="button" variante="claro" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              form="form-publicar-aviso"
              variante="primario"
              carregando={salvando}
              icone={<Icone nome="megaphone" className="h-4 w-4" />}
            >
              {isAgendamento ? 'Agendar Publicação' : 'Publicar Agora'}
            </Botao>
          </>
        }
      >
        <form id="form-publicar-aviso" onSubmit={publicar} className="space-y-4">
          <Campo rotulo="Título do Comunicado" obrigatorio>
            <input
              className={inputCls}
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              required
              maxLength={120}
              placeholder="Ex.: Manutenção preventiva dos elevadores"
            />
          </Campo>

          <Campo rotulo="Conteúdo da Mensagem" obrigatorio>
            <textarea
              className={inputCls + ' min-h-28 resize-y'}
              value={conteudo}
              onChange={e => setConteudo(e.target.value)}
              required
              maxLength={2000}
              placeholder="Descreva o comunicado detalhadamente..."
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="Publicar em (opcional)" ajuda="Em branco = Imediato">
              <input
                type="datetime-local"
                className={inputCls}
                value={dataPublicacao}
                onChange={e => setDataPublicacao(e.target.value)}
              />
            </Campo>

            <Campo rotulo="Expirar em (opcional)">
              <input
                type="datetime-local"
                className={inputCls}
                value={dataExpiracao}
                onChange={e => setDataExpiracao(e.target.value)}
              />
            </Campo>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/80 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={fixado}
              onChange={e => setFixado(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-navy dark:text-sky-500 focus:ring-navy dark:focus:ring-sky-500 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <Icone nome="pin" className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Fixar no topo do mural dos moradores
            </span>
          </label>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão de Aviso */}
      <ModalConfirmacao
        aberto={!!excluindo}
        fechar={() => setExcluindo(null)}
        confirmar={confirmarExclusao}
        titulo="Excluir Comunicado"
        mensagem={
          excluindo && (
            <p>
              Tem certeza de que deseja excluir o comunicado <b>"{excluindo.titulo}"</b>? Esta ação removerá o aviso do mural de todos os moradores.
            </p>
          )
        }
        textoBotaoConfirmar="Sim, Excluir Comunicado"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="trash"
      />

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
