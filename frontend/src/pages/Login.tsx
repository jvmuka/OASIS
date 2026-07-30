import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, salvarSessao, Sessao } from '../api';
import { Botao, Campo, inputCls, Mensagem } from '../components/ui';

/** UC01 - Autenticar no Sistema. */
export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/login', { email, senha });
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
      nav('/');
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-navy text-xl font-bold text-white">O</span>
          <h1 className="mt-3 text-xl font-bold text-navy">OASIS</h1>
          <p className="text-sm text-slate-500">Sistema de Gestão Condominial</p>
        </div>
        <div className="space-y-3">
          <Campo rotulo="E-mail">
            <input className={inputCls} type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </Campo>
          <Campo rotulo="Senha">
            <input className={inputCls} type="password" value={senha}
              onChange={e => setSenha(e.target.value)} placeholder="********" required />
          </Campo>
        </div>
        <Botao className="mt-5 w-full" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar →'}
        </Botao>
        <Mensagem texto={erro} tipo="erro" />
      </form>
    </div>
  );
}
