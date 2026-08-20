import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, salvarSessao, Sessao } from '../api';
import { Botao, Campo, inputCls, Mensagem, Icone } from '../components/ui';

/** UC01 - Autenticar no Sistema OASIS */
export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/login', { email, senha });
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
      nav('/');
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  }

  function preencherRapido(emailTeste: string) {
    setEmail(emailTeste);
    setSenha('Teste@2026');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-navy-50 p-4">
      <div className="w-full max-w-md animate-scale-in">
        <form
          onSubmit={entrar}
          className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card"
        >
          {/* Logo e Cabeçalho */}
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-light text-white shadow-soft">
              <Icone nome="building" className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-navy">OASIS</h1>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Gestão Condominial & Portal do Morador
            </p>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <Campo rotulo="E-mail de Acesso" obrigatorio>
              <div className="relative">
                <input
                  className={inputCls + ' pl-9'}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu.email@condominio.com"
                  required
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Icone nome="user" className="h-4 w-4" />
                </span>
              </div>
            </Campo>

            <Campo rotulo="Senha" obrigatorio>
              <div className="relative">
                <input
                  className={inputCls + ' pl-9'}
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Icone nome="shield" className="h-4 w-4" />
                </span>
              </div>
            </Campo>
          </div>

          <Botao className="mt-6 w-full py-2.5 text-sm" carregando={carregando}>
            Entrar no Sistema
          </Botao>

          <Mensagem texto={erro} tipo="erro" />

          {/* Atalhos para Demonstração */}
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Acesso Rápido para Teste (1 Clique)
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => preencherRapido('carlos.silva@teste.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy transition-colors cursor-pointer"
              >
                <span className="block font-bold text-navy">Morador</span>
                <span className="text-[10px] text-slate-400">Carlos</span>
              </button>
              <button
                type="button"
                onClick={() => preencherRapido('ana.souza@teste.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy transition-colors cursor-pointer"
              >
                <span className="block font-bold text-navy">Síndico</span>
                <span className="text-[10px] text-slate-400">Ana</span>
              </button>
              <button
                type="button"
                onClick={() => preencherRapido('roberto.lima@teste.com')}
                className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy transition-colors cursor-pointer"
              >
                <span className="block font-bold text-navy">Porteiro</span>
                <span className="text-[10px] text-slate-400">Roberto</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
