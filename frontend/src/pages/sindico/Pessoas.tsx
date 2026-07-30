import { useEffect, useState } from 'react';
import { api } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo } from '../../components/ui';

type Pessoa = {
  id_pessoa: number; nome: string; email: string; cpf: string; ativo: boolean;
  perfis: { tipo: string }[]; unidades: { bloco: string; apartamento: string; vinculo: string }[];
};
type Unidade = { id_unidade: number; bloco: string; numero_apartamento: string };

/** UC11 - CRUD de pessoas: listagem com busca + cadastro completo em transação. */
export default function Pessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', data_nascimento: '', celular: '',
    id_unidade: '', tipo_vinculo: 'INQUILINO', tipo_perfil: 'MORADOR',
  });

  const carregar = () =>
    api.get<Pessoa[]>('/cadastros/pessoas' + (busca ? `?busca=${encodeURIComponent(busca)}` : '')).then(setPessoas);
  useEffect(() => { carregar(); api.get<Unidade[]>('/cadastros/unidades').then(setUnidades); }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/cadastros/pessoas', {
        ...form,
        id_unidade: form.id_unidade ? Number(form.id_unidade) : undefined,
      });
      setMsg({ t: `${form.nome} cadastrado(a) com sucesso.`, tipo: 'ok' });
      setForm({ ...form, nome: '', email: '', cpf: '', celular: '' });
      carregar();
    } catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }
  async function inativar(p: Pessoa) {
    if (!confirm(`Inativar ${p.nome}? Os perfis vigentes serão encerrados.`)) return;
    try { await api.patch(`/cadastros/pessoas/${p.id_pessoa}/inativar`); carregar(); }
    catch (err: any) { setMsg({ t: err.message, tipo: 'erro' }); }
  }

  const c = (k: keyof typeof form) => (e: React.ChangeEvent<any>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <Titulo sub="UC11 — Cadastrar / Editar Pessoa e Unidade">Pessoas e Perfis</Titulo>
      <Cartao className="mb-4">
        <div className="flex gap-2">
          <input className={inputCls} placeholder="Buscar por nome, CPF ou e-mail"
            value={busca} onChange={e => setBusca(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()} />
          <Botao variante="claro" onClick={carregar}>Filtrar</Botao>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-slate-400">
              <th className="py-2">Nome</th><th>Unidade</th><th>Perfil</th><th>Situação</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pessoas.map(p => (
              <tr key={p.id_pessoa}>
                <td className="py-2">
                  <p className="font-semibold">{p.nome}</p>
                  <p className="text-xs text-slate-400">{p.email}</p>
                </td>
                <td className="text-xs">{p.unidades[0] ? `${p.unidades[0].bloco} - ${p.unidades[0].apartamento} (${p.unidades[0].vinculo})` : '—'}</td>
                <td className="text-xs">{p.perfis.map(x => x.tipo).join(', ') || '—'}</td>
                <td>
                  <span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' +
                    (p.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  {p.ativo && <button className="text-xs text-red-600 underline" onClick={() => inativar(p)}>Inativar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      <Cartao>
        <h3 className="mb-3 font-semibold text-navy">Novo cadastro — dados pessoais, vínculo e perfil</h3>
        <form onSubmit={cadastrar} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Campo rotulo="Nome completo"><input className={inputCls} value={form.nome} onChange={c('nome')} required /></Campo>
          <Campo rotulo="CPF (somente números)"><input className={inputCls} value={form.cpf} onChange={c('cpf')} maxLength={11} required /></Campo>
          <Campo rotulo="Data de nascimento"><input type="date" className={inputCls} value={form.data_nascimento} onChange={c('data_nascimento')} required /></Campo>
          <Campo rotulo="Celular"><input className={inputCls} value={form.celular} onChange={c('celular')} /></Campo>
          <Campo rotulo="E-mail (login)"><input type="email" className={inputCls} value={form.email} onChange={c('email')} required /></Campo>
          <Campo rotulo="Unidade">
            <select className={inputCls} value={form.id_unidade} onChange={c('id_unidade')}>
              <option value="">— sem vínculo —</option>
              {unidades.map(u => <option key={u.id_unidade} value={u.id_unidade}>{u.bloco} - {u.numero_apartamento}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Tipo de vínculo">
            <select className={inputCls} value={form.tipo_vinculo} onChange={c('tipo_vinculo')}>
              <option>PROPRIETARIO</option><option>INQUILINO</option><option>DEPENDENTE</option>
            </select>
          </Campo>
          <Campo rotulo="Perfil de acesso">
            <select className={inputCls} value={form.tipo_perfil} onChange={c('tipo_perfil')}>
              <option>MORADOR</option><option>SINDICO</option><option>PORTEIRO</option>
            </select>
          </Campo>
          <div className="col-span-2 lg:col-span-4">
            <Botao>Salvar</Botao>
          </div>
        </form>
        <Mensagem texto={msg.t} tipo={msg.tipo} />
      </Cartao>
    </div>
  );
}
