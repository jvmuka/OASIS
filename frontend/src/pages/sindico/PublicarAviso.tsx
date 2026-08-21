import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal } from '../../components/ui';

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
};

/** UC10 - Publicar, agendar e gerenciar avisos do condomínio (UI/UX Pro Max) */
export default function PublicarAviso() {
  const [avisos, setAvisos] = useState<AvisoAdmin[]>([]);
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

  return (
    <div className="space-y-6">
      <Titulo
        sub="Crie comunicados imediatos, agende publicações e acompanhe as taxas de leitura dos moradores."
        icone={<Icone nome="megaphone" className="h-5 w-5" />}
      >
        Publicar & Gerenciar Avisos
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Formulário de Criação / Agendamento */}
        <div className="lg:col-span-5">
          <Cartao>
            <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="plus" className="h-4 w-4 text-navy dark:text-sky-400" />
                {isAgendamento ? 'Agendar Comunicado' : 'Novo Comunicado'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAgendamento
                  ? 'O comunicado será publicado automaticamente na data escolhida.'
                  : 'Preencha para distribuir imediatamente no mural de todos os moradores.'}
              </p>
            </div>

            <form onSubmit={publicar} className="space-y-4">
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
                <Campo rotulo="Publicar em (opcional)" ajuda="Em branco = Agora">
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

              <Botao
                className="w-full py-2.5"
                carregando={salvando}
                icone={<Icone nome="megaphone" className="h-4 w-4" />}
              >
                {isAgendamento ? 'Agendar Publicação' : 'Publicar Agora'}
              </Botao>
            </form>
          </Cartao>
        </div>

        {/* Listagem de Avisos Já Publicados e Agendados */}
        <div className="lg:col-span-7">
          <Cartao>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Comunicados Distribuídos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Histórico de avisos e agendamentos</p>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {avisos.length} aviso(s)
              </span>
            </div>

            {avisos.length === 0 ? (
              <EmptyState
                icone="megaphone"
                titulo="Nenhum comunicado cadastrado"
                descricao="Utilize o formulário ao lado para emitir o primeiro aviso para o condomínio."
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {avisos.map(a => {
                  const eAberto = expandido === a.id_aviso;
                  const dtPub = new Date(a.data_hora_publicacao);
                  const percLidos = a.total_destinatarios > 0
                    ? Math.round((a.total_lidos / a.total_destinatarios) * 100)
                    : 0;

                  return (
                    <div
                      key={a.id_aviso}
                      className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-850/80 p-4 shadow-soft transition-all hover:border-slate-300 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
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
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{a.titulo}</h4>
                          </div>

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
        </div>
      </div>

      {/* Modal de Exclusão */}
      <Modal
        aberto={!!excluindo}
        fechar={() => setExcluindo(null)}
        titulo="Excluir Comunicado"
      >
        {excluindo && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Tem certeza de que deseja excluir o aviso <b>"{excluindo.titulo}"</b>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Botao variante="claro" onClick={() => setExcluindo(null)}>
                Cancelar
              </Botao>
              <Botao variante="perigo" onClick={confirmarExclusao}>
                Excluir Comunicado
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
