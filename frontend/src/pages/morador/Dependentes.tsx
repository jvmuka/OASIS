import { useEffect, useState } from 'react';
import { api, sessaoAtual } from '../../api';
import { Titulo, Cartao, Botao, Campo, inputCls, Badge, EmptyState, Modal, Icone, Mensagem, mascararCPF, mascararCelular } from '../../components/ui';

interface VinculoTitular {
  id_pessoa_unidade: number;
  id_unidade: number;
  tipo_vinculo: 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE';
  grau_parentesco?: string;
  id_responsavel?: number;
  numero_apartamento: string;
  bloco: string;
  nome_responsavel?: string;
  email_responsavel?: string;
}

interface Dependente {
  id_pessoa_unidade: number;
  id_pessoa: number;
  nome: string;
  email: string;
  cpf: string;
  data_nascimento: string;
  celular?: string;
  tipo_vinculo?: 'PROPRIETARIO' | 'INQUILINO' | 'DEPENDENTE';
  grau_parentesco: string;
  id_responsavel?: number;
  status_aprovacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  motivo_rejeicao?: string;
  codigo_ativacao?: string;
  status_conta: 'AGUARDANDO_PRIMEIRO_ACESSO' | 'ATIVO' | 'BLOQUEADO';
}

export default function Dependentes() {
  const [carregando, setCarregando] = useState(true);
  const [vinculo, setVinculo] = useState<VinculoTitular | null>(null);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [copiadoId, setCopiadoId] = useState<number | null>(null);
  const [notificacao, setNotificacao] = useState<{ texto: string; tipo: 'ok' | 'erro' | 'aviso' } | null>(null);

  // Formulário de novo dependente
  const [submetendo, setSubmetendo] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    grau_parentesco: 'FILHO',
  });

  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await api.get<{ vinculo: VinculoTitular | null; dependentes: Dependente[] }>('/cadastros/meus-dependentes');
      setVinculo(res.vinculo);
      setDependentes(res.dependentes || []);
    } catch (err: any) {
      setNotificacao({
        texto: err?.message || 'Erro ao carregar dados familiares.',
        tipo: 'erro',
      });
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const copiarCodigo = (codigo: string, id: number) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoId(id);
    setNotificacao({ texto: `Código ${codigo} copiado para a área de transferência!`, tipo: 'ok' });
    setTimeout(() => setCopiadoId(null), 3000);
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setNotificacao({
        texto: 'Erro de cadastro: O CPF deve conter exatamente 11 dígitos.',
        tipo: 'erro',
      });
      return;
    }

    setSubmetendo(true);
    try {
      const res = await api.post<{ mensagem?: string }>('/cadastros/meus-dependentes', {
        ...form,
        cpf: cpfLimpo,
      });
      setNotificacao({
        texto: res.mensagem || 'Solicitação enviada com sucesso! Aguarde a aprovação da administração.',
        tipo: 'ok',
      });
      setModalAberto(false);
      setForm({
        nome: '',
        email: '',
        cpf: '',
        data_nascimento: '',
        celular: '',
        grau_parentesco: 'FILHO',
      });
      carregar();
    } catch (err: any) {
      setNotificacao({
        texto: err?.message || 'Erro ao enviar solicitação de dependente.',
        tipo: 'erro',
      });
    } finally {
      setSubmetendo(false);
    }
  };

  const formataCPF = (cpf: string) => {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length === 11) {
      return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
    }
    return cpf;
  };

  const calculaIdade = (dataNasc: string) => {
    if (!dataNasc) return null;
    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const formataVinculoParentesco = (dep: Dependente) => {
    if (dep.tipo_vinculo === 'PROPRIETARIO') return 'Titular (Proprietário)';
    if (dep.tipo_vinculo === 'INQUILINO') return 'Titular (Inquilino)';
    switch (dep.grau_parentesco) {
      case 'FILHO': return 'Filho(a)';
      case 'CONJUGE': return 'Cônjuge / Parceiro(a)';
      case 'ENTEADO': return 'Enteado(a)';
      case 'PAI_MAE': return 'Pai / Mãe';
      default: return dep.grau_parentesco ? 'Outro Familiar' : 'Dependente';
    }
  };

  const sessao = sessaoAtual();
  const idUsuarioLogado = sessao?.pessoa?.id_pessoa;
  const ehTitular = vinculo && (vinculo.tipo_vinculo === 'PROPRIETARIO' || vinculo.tipo_vinculo === 'INQUILINO');

  return (
    <div className="space-y-6">
      {notificacao && (
        <Mensagem
          texto={notificacao.texto}
          tipo={notificacao.tipo}
          aoFechar={() => setNotificacao(null)}
        />
      )}

      <Titulo
        icone={<Icone nome="users" className="h-5 w-5" />}
        sub="Pessoas e familiares vinculados à sua residência."
        acao={
          ehTitular ? (
            <Botao
              icone={<Icone nome="plus" className="h-4 w-4" />}
              onClick={() => setModalAberto(true)}
            >
              Cadastrar Dependente
            </Botao>
          ) : undefined
        }
      >
        Minha Família & Dependentes
      </Titulo>

      {/* Informação sobre Responsável caso o usuário logado seja dependente */}
      {vinculo?.tipo_vinculo === 'DEPENDENTE' && vinculo.nome_responsavel && (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/60 p-3.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
          <div className="flex items-center gap-2 font-semibold">
            <Icone nome="info" className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Titular Responsável pela Unidade:</span>
            <span className="font-bold">{vinculo.nome_responsavel}</span>
            {vinculo.email_responsavel && (
              <span className="text-sky-700 dark:text-sky-400">({vinculo.email_responsavel})</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-sky-800/80 dark:text-sky-300/80">
            Como dependente, novos cadastros familiares são gerenciados pelo titular ou pela administração.
          </p>
        </div>
      )}

      {/* Conteúdo Central: Lista de Dependentes/Familiares ou Aviso de Vazio */}
      {carregando ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-sky-400" />
        </div>
      ) : dependentes.length === 0 ? (
        <EmptyState
          icone="users"
          titulo="Nenhum familiar cadastrado"
          descricao="Atualmente não há familiares vinculados a esta residência."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dependentes.map(dep => {
                const idade = calculaIdade(dep.data_nascimento);
                const ehProprioUsuario = dep.id_pessoa === idUsuarioLogado;
                const ehVinculoTitular = dep.tipo_vinculo === 'PROPRIETARIO' || dep.tipo_vinculo === 'INQUILINO';

                return (
                  <Cartao key={dep.id_pessoa_unidade} className="relative overflow-hidden flex flex-col justify-between">
                    <div>
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                            ehVinculoTitular 
                              ? 'bg-navy/10 text-navy dark:bg-sky-950/60 dark:text-sky-300' 
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}>
                            {dep.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {dep.nome}
                              </h3>
                              {ehProprioUsuario && (
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge tipo={ehVinculoTitular ? 'primario' : 'neutro'}>
                                {formataVinculoParentesco(dep)}
                              </Badge>
                              {idade !== null && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                  {idade} {idade === 1 ? 'ano' : 'anos'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status de Aprovação */}
                        {dep.status_aprovacao === 'PENDENTE' && (
                          <Badge tipo="aviso">Aguardando Aprovação</Badge>
                        )}
                        {dep.status_aprovacao === 'APROVADO' && (
                          <Badge tipo="sucesso">Aprovado</Badge>
                        )}
                        {dep.status_aprovacao === 'REJEITADO' && (
                          <Badge tipo="perigo">Recusado</Badge>
                        )}
                      </div>

                      {/* Dados adicionais */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">CPF</span>
                          <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{formataCPF(dep.cpf)}</p>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400">E-mail</span>
                          <p className="truncate font-medium text-slate-800 dark:text-slate-200" title={dep.email}>{dep.email}</p>
                        </div>
                        {dep.celular && (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Celular</span>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{dep.celular}</p>
                          </div>
                        )}
                        {dep.data_nascimento && (
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400">Nascimento</span>
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {new Date(dep.data_nascimento).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rodapé do Card com Ações / Código */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {dep.status_aprovacao === 'PENDENTE' && (
                        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                          <Icone nome="clock" className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>Solicitação em análise pelo síndico. O código de acesso será gerado após aprovação.</span>
                        </div>
                      )}

                      {dep.status_aprovacao === 'REJEITADO' && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-rose-950/40 p-2.5 text-[11px] text-red-800 dark:text-rose-300">
                          <Icone nome="alert" className="h-4 w-4 shrink-0 text-red-600 dark:text-rose-400 mt-0.5" />
                          <div>
                            <p className="font-semibold">Cadastro recusado pela administração:</p>
                            <p className="mt-0.5">{dep.motivo_rejeicao || 'Sem justificativa fornecida.'}</p>
                          </div>
                        </div>
                      )}

                      {dep.status_aprovacao === 'APROVADO' && (
                        <>
                          {dep.status_conta === 'AGUARDANDO_PRIMEIRO_ACESSO' && dep.codigo_ativacao ? (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                                  Código de Primeiro Acesso
                                </span>
                                <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">
                                  Aguardando Ativação
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="font-mono text-base font-extrabold tracking-widest text-navy dark:text-sky-300">
                                  {dep.codigo_ativacao}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copiarCodigo(dep.codigo_ativacao!, dep.id_pessoa)}
                                  className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs border border-emerald-200 hover:bg-emerald-100 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                  <Icone nome={copiadoId === dep.id_pessoa ? 'check' : 'edit'} className="h-3.5 w-3.5" />
                                  {copiadoId === dep.id_pessoa ? 'Copiado!' : 'Copiar Código'}
                                </button>
                              </div>
                              <p className="mt-2 text-[10px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                                Entregue este código ao seu dependente para que ele acerte a senha no formulário de primeiro acesso na tela de login.
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Icone nome="check" className="h-4 w-4" />
                                Perfil ativo e com senha definida
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Cartao>
                );
              })}
            </div>
          )}

      {/* Modal de Solicitação de Novo Dependente */}
      <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        titulo="Solicitar Cadastro de Dependente"
      >
        <form onSubmit={handleSolicitar} className="space-y-4">
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300 flex items-start gap-2.5">
            <Icone nome="shield" className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Política de Segurança & Anti-Fraude:</span>
              <p className="mt-0.5">
                Para manter a segurança do condomínio e evitar cadastros indevidos, a solicitação será enviada para conferência da administração. Após a aprovação, o código de acesso será liberado nesta tela para você entregá-lo ao membro da sua família.
              </p>
            </div>
          </div>

          <Campo rotulo="Nome Completo" obrigatorio>
            <input
              type="text"
              required
              maxLength={100}
              className={inputCls}
              placeholder="Ex: Lucas Silva"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
            />
          </Campo>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="CPF" obrigatorio>
              <input
                type="text"
                required
                maxLength={14}
                className={inputCls}
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={e => setForm({ ...form, cpf: mascararCPF(e.target.value) })}
              />
            </Campo>

            <Campo rotulo="Data de Nascimento" obrigatorio ajuda="Para regras de idade nas áreas">
              <input
                type="date"
                required
                className={inputCls}
                value={form.data_nascimento}
                onChange={e => setForm({ ...form, data_nascimento: e.target.value })}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="E-mail" obrigatorio>
              <input
                type="email"
                required
                maxLength={120}
                className={inputCls}
                placeholder="nome@exemplo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </Campo>

            <Campo rotulo="Celular / WhatsApp">
              <input
                type="tel"
                maxLength={15}
                className={inputCls}
                placeholder="(42) 99999-9999"
                value={form.celular}
                onChange={e => setForm({ ...form, celular: mascararCelular(e.target.value) })}
              />
            </Campo>
          </div>

          <Campo rotulo="Grau de Parentesco / Relação" obrigatorio>
            <select
              className={inputCls}
              value={form.grau_parentesco}
              onChange={e => setForm({ ...form, grau_parentesco: e.target.value })}
            >
              <option value="FILHO">Filho(a)</option>
              <option value="CONJUGE">Cônjuge / Parceiro(a)</option>
              <option value="ENTEADO">Enteado(a)</option>
              <option value="PAI_MAE">Pai / Mãe</option>
              <option value="OUTRO">Outro Familiar</option>
            </select>
          </Campo>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Botao type="button" variante="claro" onClick={() => setModalAberto(false)} disabled={submetendo}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario" carregando={submetendo} icone={<Icone nome="check" className="h-4 w-4" />}>
              Enviar Solicitação
            </Botao>
          </div>
        </form>
      </Modal>
    </div>
  );
}
