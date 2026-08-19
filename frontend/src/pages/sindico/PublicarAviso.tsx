import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

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

/**
 * UC10 - Publicar, agendar e visualizar avisos do condomínio.
 */
export default function PublicarAviso() {
  const [avisos, setAvisos] = useState<AvisoAdmin[]>([]);
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [dataPublicacao, setDataPublicacao] = useState('');
  const [dataExpiracao, setDataExpiracao] = useState('');
  const [fixado, setFixado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [expandido, setExpandido] = useState<number | null>(null);

  const carregar = () => {
    api.get<AvisoAdmin[]>('/avisos')
      .then(setAvisos)
      .catch((err: any) => setMsg({ t: err.message, tipo: 'erro' }));
  };

  useEffect(() => {
    carregar();
  }, []);

  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ t: '', tipo: 'ok' });
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
    }
  }

  async function excluir(id: number, tituloAviso: string) {
    if (!confirm(`Deseja realmente excluir o aviso "${tituloAviso}"?`)) return;
    try {
      await api.delete(`/avisos/${id}`);
      setMsg({ t: `Aviso "${tituloAviso}" excluído.`, tipo: 'ok' });
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  const isAgendamento = dataPublicacao && new Date(dataPublicacao) > new Date();

  return (
    <div>
      <Titulo sub="Crie comunicados imediatos, agende publicações e acompanhe os avisos distribuídos">
        Gestão e Publicação de Avisos
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulário de Criação / Agendamento */}
        <Cartao className="lg:col-span-2">
          <h3 className="mb-3 font-semibold text-navy">
            {isAgendamento ? 'Agendar Comunicado' : 'Novo Comunicado'}
          </h3>
          <form onSubmit={publicar} className="space-y-3">
            <Campo rotulo="Título do aviso">
              <input
                className={inputCls}
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                required
                maxLength={120}
                placeholder="Ex.: Manutenção preventiva dos elevadores"
              />
            </Campo>

            <Campo rotulo="Conteúdo">
              <textarea
                className={inputCls + ' min-h-28'}
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                required
                maxLength={2000}
                placeholder="Descreva o comunicado detalhadamente..."
              />
            </Campo>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo rotulo="Data/Hora de publicação (opcional)">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={dataPublicacao}
                  onChange={e => setDataPublicacao(e.target.value)}
                />
              </Campo>

              <Campo rotulo="Data/Hora de expiração (opcional)">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={dataExpiracao}
                  onChange={e => setDataExpiracao(e.target.value)}
                />
              </Campo>
            </div>
            <p className="text-[11px] text-slate-400">
              * Deixe a data de publicação em branco para publicar imediatamente. Caso informe uma data futura, o aviso ficará agendado e só aparecerá para os moradores a partir do horário definido.
            </p>

            <label className="flex items-center gap-2 text-sm text-slate-600 pt-1">
              <input
                type="checkbox"
                checked={fixado}
                onChange={e => setFixado(e.target.checked)}
                className="rounded text-navy focus:ring-navy"
              />
              Fixar no topo do mural dos moradores
            </label>

            <Botao className="w-full mt-2">
              {isAgendamento ? 'Agendar Publicação' : 'Publicar Aviso Agora'}
            </Botao>
          </form>
          <Mensagem texto={msg.t} tipo={msg.tipo} />
        </Cartao>

        {/* Listagem de Avisos Já Publicados e Agendados */}
        <Cartao className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-navy">Avisos do Condomínio</h3>
            <span className="text-xs text-slate-400">{avisos.length} comunicado(s)</span>
          </div>

          {avisos.length === 0 && (
            <p className="text-sm text-slate-500 py-6 text-center">Nenhum aviso cadastrado até o momento.</p>
          )}

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {avisos.map(a => {
              const eAberto = expandido === a.id_aviso;
              const dtPub = new Date(a.data_hora_publicacao);
              const dtExp = a.data_hora_expiracao ? new Date(a.data_hora_expiracao) : null;

              return (
                <div
                  key={a.id_aviso}
                  className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.fixado && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            FIXADO
                          </span>
                        )}
                        <span
                          className={
                            'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                            (a.status === 'PUBLICADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'AGENDADO'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700')
                          }
                        >
                          {a.status}
                        </span>
                        <h4 className="font-semibold text-navy">{a.titulo}</h4>
                      </div>
                      <p className="text-xs text-slate-500">
                        {a.status === 'AGENDADO' ? 'Agendado para: ' : 'Publicado em: '}
                        <b>{dtPub.toLocaleString('pt-BR')}</b>
                        {dtExp && <> · Expira em: <b>{dtExp.toLocaleString('pt-BR')}</b></>}
                        {' · Por: '}{a.autor}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandido(eAberto ? null : a.id_aviso)}
                        className="text-xs text-navy hover:underline font-medium"
                      >
                        {eAberto ? 'Recolher' : 'Ver detalhes'}
                      </button>
                      <button
                        onClick={() => excluir(a.id_aviso, a.titulo)}
                        className="text-xs text-red-600 hover:underline font-medium ml-1"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {eAberto && (
                    <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700 space-y-2">
                      <p className="whitespace-pre-line">{a.conteudo}</p>
                      <div className="flex items-center justify-between rounded bg-white p-2 text-xs text-slate-500 border border-slate-100">
                        <span>
                          Leituras registradas: <b>{a.total_lidos}</b> de <b>{a.total_destinatarios}</b> destinatários
                        </span>
                        <span>Escopo: {a.escopo}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Cartao>
      </div>
    </div>
  );
}
