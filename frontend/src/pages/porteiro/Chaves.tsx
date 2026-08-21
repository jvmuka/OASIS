import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal } from '../../components/ui';

type Chave = {
  id_chave: number;
  codigo: string;
  status: string;
  area: string;
  id_entrega_chave: number | null;
  responsavel: string | null;
  data_hora_retirada: string | null;
};

type Pessoa = {
  id_pessoa: number;
  nome: string;
  perfis: { tipo: string; id_perfil: number }[];
};

/** UC06 - Empréstimo e devolução de chaves das áreas comuns (UI/UX Pro Max) */
export default function Chaves() {
  const [chaves, setChaves] = useState<Chave[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [emprestando, setEmprestando] = useState<Chave | null>(null);
  const [solicitante, setSolicitante] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    api.get<Chave[]>('/portaria/chaves').then(setChaves);
    api.get<Pessoa[]>('/cadastros/pessoas').then(setPessoas);
  };

  useEffect(() => {
    carregar();
  }, []);

  const moradores = pessoas
    .map(p => ({ nome: p.nome, perfil: p.perfis.find(x => x.tipo === 'MORADOR') }))
    .filter(p => p.perfil);

  async function confirmarEmprestimo() {
    if (!emprestando || !solicitante) return;
    setSalvando(true);
    try {
      await api.post(`/portaria/chaves/${emprestando.id_chave}/emprestimo`, {
        id_perfil_solicitante: Number(solicitante),
      });
      setMsg({ t: `Empréstimo da chave "${emprestando.codigo}" registrado com sucesso.`, tipo: 'ok' });
      setEmprestando(null);
      setSolicitante('');
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function devolver(idEntrega: number, codigo: string) {
    try {
      await api.patch(`/portaria/chaves/emprestimos/${idEntrega}/devolucao`);
      setMsg({ t: `Devolução da chave "${codigo}" registrada; espaço liberado.`, tipo: 'ok' });
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    }
  }

  return (
    <div className="space-y-6">
      <Titulo
        sub="Controle de retirada e devolução das chaves das áreas comuns e dependências."
        icone={<Icone nome="key" className="h-5 w-5" />}
      >
        Controle de Chaves
      </Titulo>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-12">
          <Cartao>
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Quadro de Chaves</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de {chaves.length} chave(s) cadastradas no claviculário</p>
              </div>
            </div>

            {chaves.length === 0 ? (
              <EmptyState
                icone="key"
                titulo="Nenhuma chave cadastrada"
                descricao="As chaves das áreas comuns cadastradas aparecerão aqui."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {chaves.map(c => {
                  const disponivel = c.status === 'DISPONIVEL';
                  return (
                    <div
                      key={c.id_chave}
                      className={`rounded-2xl border p-4.5 transition-all shadow-soft ${
                        disponivel
                          ? 'border-slate-200/80 bg-white hover:border-navy/30 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-sky-500/40'
                          : 'border-amber-200/80 bg-amber-50/30 dark:border-amber-900/60 dark:bg-amber-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                              disponivel ? 'bg-navy-50 text-navy dark:bg-slate-700 dark:text-sky-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            <Icone nome="key" className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{c.codigo}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{c.area}</p>
                          </div>
                        </div>

                        <Badge tipo={disponivel ? 'sucesso' : 'aviso'}>
                          {disponivel ? 'Disponível' : 'Emprestada'}
                        </Badge>
                      </div>

                      {/* Informações do Empréstimo */}
                      {c.responsavel && (
                        <div className="mt-3 rounded-xl border border-amber-200/60 bg-white dark:border-amber-900/40 dark:bg-slate-800 p-2.5 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">Responsável Atual:</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{c.responsavel}</p>
                          {c.data_hora_retirada && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              Desde {new Date(c.data_hora_retirada).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        {disponivel ? (
                          <Botao
                            variante="claro"
                            tamanho="sm"
                            className="w-full"
                            icone={<Icone nome="key" className="h-3.5 w-3.5" />}
                            onClick={() => {
                              setEmprestando(c);
                              setSolicitante('');
                            }}
                          >
                            Emprestar Chave
                          </Botao>
                        ) : (
                          c.id_entrega_chave && (
                            <Botao
                              variante="primario"
                              tamanho="sm"
                              className="w-full"
                              icone={<Icone nome="check" className="h-3.5 w-3.5" />}
                              onClick={() => devolver(c.id_entrega_chave!, c.codigo)}
                            >
                              Registrar Devolução
                            </Botao>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Cartao>
        </div>
      </div>

      {/* Modal de Empréstimo */}
      <Modal
        aberto={!!emprestando}
        fechar={() => setEmprestando(null)}
        titulo={`Empréstimo da Chave ${emprestando?.codigo || ''}`}
      >
        {emprestando && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 space-y-1">
              <p>Código: <b>{emprestando.codigo}</b></p>
              <p>Área Comum: <b>{emprestando.area}</b></p>
            </div>

            <Campo rotulo="Morador Solicitante" obrigatorio>
              <select
                className={inputCls}
                value={solicitante}
                onChange={e => setSolicitante(e.target.value)}
                required
              >
                <option value="">Selecione o morador...</option>
                {moradores.map(m => (
                  <option key={m.perfil!.id_perfil} value={m.perfil!.id_perfil}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </Campo>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Botao variante="claro" onClick={() => setEmprestando(null)}>
                Cancelar
              </Botao>
              <Botao
                disabled={!solicitante}
                carregando={salvando}
                onClick={confirmarEmprestimo}
                icone={<Icone nome="check" className="h-4 w-4" />}
              >
                Confirmar Empréstimo
              </Botao>
            </div>
          </div>
        )}
      </Modal>

      <Mensagem texto={msg.t} tipo={msg.tipo} />
    </div>
  );
}
