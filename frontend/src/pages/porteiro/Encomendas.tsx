import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal } from '../../components/ui';

type Pessoa = {
  id_pessoa: number;
  nome: string;
  unidades: { bloco: string; apartamento: string }[];
};

type Encomenda = {
  id_encomenda: number;
  destinatario: string;
  bloco: string;
  numero_apartamento: string;
  descricao: string;
  tamanho: string;
  status: string;
  data_hora_recebimento: string;
};

/** UC07 (registrar) + UC08 (alterar status / confirmar retirada) (UI/UX Pro Max) */
export default function Encomendas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [lista, setLista] = useState<Encomenda[]>([]);
  const [destinatario, setDestinatario] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tamanho, setTamanho] = useState('MEDIO');
  const [filtro, setFiltro] = useState<'TODAS' | 'AGUARDANDO' | 'ENTREGUE'>('TODAS');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  // Modal de retirada
  const [retirando, setRetirando] = useState<Encomenda | null>(null);
  const [retiradoPor, setRetiradoPor] = useState('PROPRIO');
  const [nomeRetirante, setNomeRetirante] = useState('');
  const [confirmandoRetirada, setConfirmandoRetirada] = useState(false);

  const carregar = () => {
    api.get<Pessoa[]>('/cadastros/pessoas').then(setPessoas);
    api.get<Encomenda[]>('/portaria/encomendas').then(setLista);
  };

  useEffect(() => {
    carregar();
  }, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg({ t: '', tipo: 'ok' });
    setSalvando(true);
    try {
      await api.post('/portaria/encomendas', {
        id_pessoa_destinatario: Number(destinatario),
        descricao,
        tamanho,
      });
      setMsg({
        t: 'Encomenda registrada com sucesso; o morador foi notificado no mural.',
        tipo: 'ok',
      });
      setDescricao('');
      setDestinatario('');
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarRetirada() {
    if (!retirando) return;
    setConfirmandoRetirada(true);
    try {
      await api.patch(`/portaria/encomendas/${retirando.id_encomenda}/retirada`, {
        retirado_por: retiradoPor,
        nome_retirante: retiradoPor === 'TERCEIRO' ? nomeRetirante : undefined,
      });
      setMsg({ t: `Retirada da encomenda de "${retirando.destinatario}" confirmada.`, tipo: 'ok' });
      setRetirando(null);
      setNomeRetirante('');
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setConfirmandoRetirada(false);
    }
  }

  const encomendasFiltradas = lista.filter(e => {
    if (filtro === 'AGUARDANDO') return e.status === 'AGUARDANDO_RETIRADA';
    if (filtro === 'ENTREGUE') return e.status !== 'AGUARDANDO_RETIRADA';
    return true;
  });

  return (
    <div className="space-y-6">
      <Titulo
        sub="Registre a chegada de pacotes e faça a baixa de entrega aos moradores."
        icone={<Icone nome="package" className="h-5 w-5" />}
      >
        Gestão de Encomendas
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Formulário de Registro */}
        <div className="lg:col-span-5">
          <Cartao>
            <div className="mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Icone nome="plus" className="h-4 w-4 text-navy dark:text-sky-400" />
                Registrar Chegada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Notifica automaticamente o morador no mural</p>
            </div>

            <form onSubmit={registrar} className="space-y-4">
              <Campo rotulo="Morador Destinatário" obrigatorio>
                <select
                  className={inputCls}
                  value={destinatario}
                  required
                  onChange={e => setDestinatario(e.target.value)}
                >
                  <option value="">Selecione o morador...</option>
                  {pessoas.map(p => (
                    <option key={p.id_pessoa} value={p.id_pessoa}>
                      {p.nome}
                      {p.unidades[0] ? ` — Bloco ${p.unidades[0].bloco}, Apto ${p.unidades[0].apartamento}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo rotulo="Descrição do Pacote">
                <input
                  className={inputCls}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex.: Pacote Mercado Livre, Caixa Correios, Envelope"
                />
              </Campo>

              <Campo rotulo="Porte / Tamanho">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'PEQUENO', label: 'Pequeno', desc: 'Envelope' },
                    { id: 'MEDIO', label: 'Médio', desc: 'Caixa P/M' },
                    { id: 'GRANDE', label: 'Grande', desc: 'Volume G' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTamanho(t.id)}
                      className={`rounded-xl border p-2 text-center transition-all cursor-pointer ${
                        tamanho === t.id
                          ? 'border-navy bg-navy text-white shadow-xs dark:bg-sky-600 dark:border-sky-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <p className="text-xs font-bold">{t.label}</p>
                      <p className={`text-[10px] ${tamanho === t.id ? 'text-white/80' : 'text-slate-400 dark:text-slate-400'}`}>
                        {t.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </Campo>

              <Botao
                className="w-full py-2.5"
                carregando={salvando}
                icone={<Icone nome="package" className="h-4 w-4" />}
              >
                Registrar Encomenda
              </Botao>
            </form>
          </Cartao>
        </div>

        {/* Listagem de Encomendas */}
        <div className="lg:col-span-7">
          <Cartao>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Histórico & Pendências</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Controle de pacotes na portaria</p>
              </div>

              {/* Filtros */}
              <div className="flex gap-1.5">
                {(['TODAS', 'AGUARDANDO', 'ENTREGUE'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFiltro(f)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                      filtro === f
                        ? 'bg-navy text-white dark:bg-sky-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {f === 'TODAS' ? 'Todas' : f === 'AGUARDANDO' ? 'Aguardando' : 'Entregues'}
                  </button>
                ))}
              </div>
            </div>

            {encomendasFiltradas.length === 0 ? (
              <EmptyState
                icone="package"
                titulo="Nenhuma encomenda encontrada"
                descricao={
                  filtro === 'AGUARDANDO'
                    ? 'Não há encomendas aguardando retirada no momento.'
                    : 'Nenhuma encomenda registrada.'
                }
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto pr-1">
                {encomendasFiltradas.map(e => (
                  <div
                    key={e.id_encomenda}
                    className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/60 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                        <Icone nome="package" className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">{e.destinatario}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {e.bloco ? `Bloco ${e.bloco}, Apto ${e.numero_apartamento} • ` : ''}
                          {e.descricao || 'Sem descrição'} ({e.tamanho.toLowerCase()})
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Recebida em:{' '}
                          {new Date(e.data_hora_recebimento).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center self-end">
                      <Badge tipo={e.status === 'AGUARDANDO_RETIRADA' ? 'aviso' : 'sucesso'}>
                        {e.status === 'AGUARDANDO_RETIRADA' ? 'Aguardando' : 'Entregue'}
                      </Badge>

                      {e.status === 'AGUARDANDO_RETIRADA' && (
                        <Botao
                          variante="claro"
                          tamanho="sm"
                          icone={<Icone nome="check" className="h-3.5 w-3.5" />}
                          onClick={() => setRetirando(e)}
                        >
                          Dar Baixa
                        </Botao>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Cartao>
        </div>
      </div>

      {/* Modal de Retirada */}
      <Modal
        aberto={!!retirando}
        fechar={() => setRetirando(null)}
        titulo="Confirmar Retirada de Encomenda"
      >
        {retirando && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 space-y-1 border border-slate-100 dark:border-slate-700">
              <p>Destinatário: <b>{retirando.destinatario}</b></p>
              <p>Unidade: <b>Bloco {retirando.bloco}, Apto {retirando.numero_apartamento}</b></p>
              <p>Descrição: <b>{retirando.descricao || 'Sem descrição'}</b></p>
            </div>

            <Campo rotulo="Quem está retirando?" obrigatorio>
              <select
                className={inputCls}
                value={retiradoPor}
                onChange={ev => setRetiradoPor(ev.target.value)}
              >
                <option value="PROPRIO">Próprio morador</option>
                <option value="TERCEIRO">Terceiro / Familiar</option>
                <option value="PORTEIRO">Porteiro</option>
              </select>
            </Campo>

            {retiradoPor === 'TERCEIRO' && (
              <Campo rotulo="Nome de quem retirou" obrigatorio>
                <input
                  className={inputCls}
                  value={nomeRetirante}
                  onChange={ev => setNomeRetirante(ev.target.value)}
                  placeholder="Nome completo do terceiro"
                  required
                />
              </Campo>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Botao variante="claro" onClick={() => setRetirando(null)}>
                Cancelar
              </Botao>
              <Botao
                onClick={confirmarRetirada}
                carregando={confirmandoRetirada}
                icone={<Icone nome="check" className="h-4 w-4" />}
              >
                Confirmar Entrega
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
