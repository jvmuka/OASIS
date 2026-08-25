import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao } from '../../components/ui';

type Pessoa = {
  id_pessoa: number;
  nome: string;
  email: string;
  cpf: string;
  ativo: boolean;
  perfis: { tipo: string }[];
  unidades: { bloco: string; apartamento: string; vinculo: string }[];
};

type Unidade = { id_unidade: number; bloco: string; numero_apartamento: string };

/** UC11 - Gestão de Pessoas, Perfis e Vínculos com Unidades (UI/UX Pro Max) */
export default function Pessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [inativando, setInativando] = useState<Pessoa | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    data_nascimento: '',
    celular: '',
    id_unidade: '',
    tipo_vinculo: 'INQUILINO',
    tipo_perfil: 'MORADOR',
  });

  const carregar = () =>
    api
      .get<Pessoa[]>('/cadastros/pessoas' + (busca ? `?busca=${encodeURIComponent(busca)}` : ''))
      .then(setPessoas);

  useEffect(() => {
    carregar();
    api.get<Unidade[]>('/cadastros/unidades').then(setUnidades);
  }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg({ t: '', tipo: 'ok' });
    try {
      await api.post('/cadastros/pessoas', {
        ...form,
        id_unidade: form.id_unidade ? Number(form.id_unidade) : undefined,
      });
      setMsg({ t: `Pessoa "${form.nome}" cadastrada com sucesso.`, tipo: 'ok' });
      setForm({
        nome: '',
        email: '',
        cpf: '',
        data_nascimento: '',
        celular: '',
        id_unidade: '',
        tipo_vinculo: 'INQUILINO',
        tipo_perfil: 'MORADOR',
      });
      setModalAberto(false);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarInativacao() {
    if (!inativando) return;
    try {
      await api.patch(`/cadastros/pessoas/${inativando.id_pessoa}/inativar`);
      setMsg({ t: `Pessoa "${inativando.nome}" inativada; perfis vigentes encerrados.`, tipo: 'ok' });
      setInativando(null);
      carregar();
    } catch (err: any) {
      setMsg({ t: err.message, tipo: 'erro' });
    }
  }

  const c = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <Titulo
        sub="Controle de moradores, síndicos, funcionários e vínculos com apartamentos."
        icone={<Icone nome="users" className="h-5 w-5" />}
        acao={
          <Botao
            variante="primario"
            icone={<Icone nome="plus" className="h-4 w-4" />}
            onClick={() => {
              setForm({
                nome: '',
                email: '',
                cpf: '',
                data_nascimento: '',
                celular: '',
                id_unidade: '',
                tipo_vinculo: 'INQUILINO',
                tipo_perfil: 'MORADOR',
              });
              setModalAberto(true);
            }}
          >
            Cadastrar Pessoa
          </Botao>
        }
      >
        Pessoas & Unidades
      </Titulo>

      {/* Tabela de Pessoas em Largura Total */}
      <Cartao>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Cadastros do Sistema</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{pessoas.length} pessoa(s) listada(s)</p>
          </div>

          {/* Barra de Busca */}
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <input
                className={inputCls + ' pl-8 text-xs py-1.5'}
                placeholder="Buscar por nome, CPF ou e-mail..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && carregar()}
              />
              <span className="absolute left-2.5 top-2 text-slate-400 dark:text-slate-500">
                <Icone nome="search" className="h-3.5 w-3.5" />
              </span>
            </div>
            <Botao variante="claro" tamanho="sm" onClick={carregar}>
              Buscar
            </Botao>
          </div>
        </div>

        {pessoas.length === 0 ? (
          <EmptyState
            icone="users"
            titulo="Nenhuma pessoa encontrada"
            descricao="Tente ajustar os termos de busca ou realize um novo cadastro."
            acao={
              <Botao
                variante="primario"
                tamanho="sm"
                icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                onClick={() => setModalAberto(true)}
              >
                Cadastrar Pessoa
              </Botao>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-2.5 px-3">Nome / E-mail</th>
                  <th className="py-2.5 px-3">CPF</th>
                  <th className="py-2.5 px-3">Unidade Vinculada</th>
                  <th className="py-2.5 px-3">Perfis de Acesso</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pessoas.map(p => (
                  <tr key={p.id_pessoa} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {p.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 leading-tight">{p.nome}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
                      {p.cpf || '—'}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-300">
                      {p.unidades && p.unidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.unidades.map((u, i) => (
                            <span key={i} className="rounded-md bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 font-medium text-[11px]">
                              Bl. {u.bloco} - Apto {u.apartamento} ({u.vinculo})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {p.perfis.map(perf => (
                          <span
                            key={perf.tipo}
                            className="rounded-md bg-navy-50 dark:bg-slate-800 dark:text-sky-400 px-2 py-0.5 text-[10px] font-bold text-navy"
                          >
                            {perf.tipo}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge tipo={p.ativo ? 'sucesso' : 'perigo'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.ativo && (
                        <button
                          onClick={() => setInativando(p)}
                          className="text-xs font-semibold text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Inativar usuário"
                        >
                          Inativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Modal de Cadastro de Pessoa */}
      <Modal
        aberto={modalAberto}
        fechar={() => setModalAberto(false)}
        titulo="Cadastrar Nova Pessoa & Vínculo"
      >
        <form onSubmit={cadastrar} className="space-y-4">
          <Campo rotulo="Nome Completo" obrigatorio>
            <input
              className={inputCls}
              value={form.nome}
              onChange={c('nome')}
              required
              maxLength={100}
              placeholder="Ex.: Maria Clara dos Santos"
            />
          </Campo>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="CPF (11 dígitos)" obrigatorio>
              <input
                className={inputCls}
                value={form.cpf}
                onChange={c('cpf')}
                required
                maxLength={11}
                pattern="\d{11}"
                placeholder="12345678901"
              />
            </Campo>

            <Campo rotulo="Data de Nascimento" obrigatorio>
              <input
                type="date"
                className={inputCls}
                value={form.data_nascimento}
                onChange={c('data_nascimento')}
                required
              />
            </Campo>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Campo rotulo="E-mail de Login" obrigatorio>
              <input
                type="email"
                className={inputCls}
                value={form.email}
                onChange={c('email')}
                required
                maxLength={120}
                placeholder="maria@email.com"
              />
            </Campo>

            <Campo rotulo="Celular" obrigatorio>
              <input
                type="tel"
                className={inputCls}
                value={form.celular}
                onChange={c('celular')}
                required
                maxLength={20}
                placeholder="(42) 99999-9999"
              />
            </Campo>
          </div>

          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vínculo & Perfil de Acesso
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Campo rotulo="Unidade">
                <select className={inputCls} value={form.id_unidade} onChange={c('id_unidade')}>
                  <option value="">Nenhuma (visitante/porteiro)</option>
                  {unidades.map(u => (
                    <option key={u.id_unidade} value={u.id_unidade}>
                      Bl. {u.bloco} - Apto {u.numero_apartamento}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo rotulo="Tipo de Vínculo">
                <select className={inputCls} value={form.tipo_vinculo} onChange={c('tipo_vinculo')}>
                  <option value="PROPRIETARIO">Proprietário</option>
                  <option value="INQUILINO">Inquilino</option>
                  <option value="DEPENDENTE">Dependente</option>
                </select>
              </Campo>

              <Campo rotulo="Perfil de Acesso">
                <select className={inputCls} value={form.tipo_perfil} onChange={c('tipo_perfil')}>
                  <option value="MORADOR">Morador</option>
                  <option value="SINDICO">Síndico</option>
                  <option value="PORTEIRO">Porteiro</option>
                </select>
              </Campo>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Botao type="button" variante="claro" onClick={() => setModalAberto(false)}>
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvando}
              icone={<Icone nome="check" className="h-4 w-4" />}
            >
              Cadastrar Pessoa
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Inativação */}
      <ModalConfirmacao
        aberto={!!inativando}
        fechar={() => setInativando(null)}
        confirmar={confirmarInativacao}
        titulo="Inativar Usuário"
        mensagem={
          inativando && (
            <div className="space-y-2 text-left">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tem certeza de que deseja inativar <b className="text-slate-900 dark:text-slate-100">{inativando.nome}</b> ({inativando.email})?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                Todos os perfis vigentes desta pessoa serão encerrados e o acesso ao sistema será bloqueado.
              </p>
            </div>
          )
        }
        textoBotaoConfirmar="Sim, Inativar Usuário"
        textoBotaoCancelar="Cancelar"
        variante="perigo"
        icone="alert"
      />

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
