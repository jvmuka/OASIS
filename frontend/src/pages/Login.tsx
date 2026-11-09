import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, salvarSessao, Sessao } from '../api';
import { Botao, Campo, inputCls, Mensagem, Icone } from '../components/ui';
import BotaoModoEscuro from '../components/BotaoModoEscuro';

/** UC01 - Autenticar no Sistema OASIS e Primeiro Acesso via Código */
export default function Login() {
  const nav = useNavigate();
  // Modo demonstracao/desenvolvimento:
  // - Mantido ativo em localhost / 127.0.0.1 (a menos que VITE_MODO_DEMO seja explicitamente 'false')
  // - Em producao real / outros dominios, ativado apenas se VITE_MODO_DEMO='true' no .env
  const isLocalhost = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.endsWith('.local')
  );
  const envModoDemo = import.meta.env.VITE_MODO_DEMO;
  const modoDemo = envModoDemo === 'true' || (envModoDemo !== 'false' && (import.meta.env.DEV || isLocalhost));
  const [aba, setAba] = useState<'login' | 'primeiro_acesso' | 'esqueci_senha'>('login');

  // Estado Login Padrão
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estado Primeiro Acesso
  const [codigoAtivacao, setCodigoAtivacao] = useState('');
  const [emailAtivacao, setEmailAtivacao] = useState('');
  const [dadosValidacao, setDadosValidacao] = useState<{
    valido: boolean;
    pessoa: { id_pessoa: number; nome: string; email: string; cpf?: string };
    email_ofuscado?: string;
    unidade: { bloco: string; apartamento: string; vinculo: string; parentesco?: string } | null;
  } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Estado Esqueci Minha Senha
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [emailOfuscadoRecuperacao, setEmailOfuscadoRecuperacao] = useState('');
  const [etapaRecuperacao, setEtapaRecuperacao] = useState<1 | 2>(1);
  const [codigoRecuperacao, setCodigoRecuperacao] = useState('');
  const [novaSenhaRecuperacao, setNovaSenhaRecuperacao] = useState('');
  const [confirmarSenhaRecuperacao, setConfirmarSenhaRecuperacao] = useState('');
  const [mostrarSenhaRecuperacao, setMostrarSenhaRecuperacao] = useState(false);
  const [mostrarConfirmarRecuperacao, setMostrarConfirmarRecuperacao] = useState(false);
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState('');

  // Visibilidade de senhas (persistente, acessível a qualquer momento)
  const [mostrarSenhaLogin, setMostrarSenhaLogin] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Erros inline específicos dos campos de senha
  const [erroSenha, setErroSenha] = useState('');
  const [erroConfirmacao, setErroConfirmacao] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/login', { identificador: email, senha });
      salvarSessao(r.token, {
        pessoa: r.pessoa,
        perfis: r.perfis,
        unidades: r.unidades,
        condominio: r.condominio,
        condominiosDisponiveis: r.condominiosDisponiveis,
        modulosAtivos: r.modulosAtivos,
      });
      nav('/');
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  }

  async function validarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const r = await api.post<any>('/auth/validar-codigo', {
        codigo: codigoAtivacao,
        identificador: emailAtivacao,
      });
      setDadosValidacao(r);
    } catch (err: any) {
      setErro(err.message || 'Código ou E-mail/CPF inválidos.');
    } finally {
      setCarregando(false);
    }
  }

  async function concluirPrimeiroAcesso(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setErroSenha('');
    setErroConfirmacao('');

    let temErro = false;
    if (!novaSenha || novaSenha.length < 6) {
      setErroSenha('A senha deve conter no mínimo 6 caracteres.');
      temErro = true;
    }
    if (novaSenha !== confirmarSenha) {
      setErroConfirmacao('A confirmação de senha não confere.');
      temErro = true;
    }
    if (temErro) return;

    setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/primeiro-acesso', {
        codigo: codigoAtivacao,
        identificador: emailAtivacao,
        novaSenha,
      });
      salvarSessao(r.token, {
        pessoa: r.pessoa,
        perfis: r.perfis,
        unidades: r.unidades,
        condominio: r.condominio,
        condominiosDisponiveis: r.condominiosDisponiveis,
        modulosAtivos: r.modulosAtivos,
      });
      nav('/');
    } catch (err: any) {
      const msg = err.message || 'Erro ao concluir primeiro acesso.';
      if (msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('caractere')) {
        setErroSenha(msg);
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function solicitarCodigoRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSucessoRecuperacao('');
    setEmailOfuscadoRecuperacao('');
    setCarregando(true);
    try {
      const res = await api.post<{ ok: boolean; mensagem: string; email_ofuscado?: string }>('/auth/esqueci-senha', {
        identificador: emailRecuperacao,
      });
      setCodigoRecuperacao('');
      if (res.email_ofuscado) {
        setEmailOfuscadoRecuperacao(res.email_ofuscado);
      }
      setSucessoRecuperacao(res.mensagem || 'Código de recuperação enviado para o seu e-mail.');
      setEtapaRecuperacao(2);
    } catch (err: any) {
      setErro(err.message || 'Erro ao solicitar recuperação de senha.');
    } finally {
      setCarregando(false);
    }
  }

  async function concluirRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setErroSenha('');
    setErroConfirmacao('');

    let temErro = false;
    if (!novaSenhaRecuperacao || novaSenhaRecuperacao.length < 6) {
      setErroSenha('A senha deve conter no mínimo 6 caracteres.');
      temErro = true;
    }
    if (novaSenhaRecuperacao !== confirmarSenhaRecuperacao) {
      setErroConfirmacao('A confirmação de senha não confere.');
      temErro = true;
    }
    if (temErro) return;

    setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/redefinir-senha', {
        identificador: emailRecuperacao,
        codigo: codigoRecuperacao,
        novaSenha: novaSenhaRecuperacao,
      });
      salvarSessao(r.token, {
        pessoa: r.pessoa,
        perfis: r.perfis,
        unidades: r.unidades,
        condominio: r.condominio,
        condominiosDisponiveis: r.condominiosDisponiveis,
        modulosAtivos: r.modulosAtivos,
      });
      nav('/');
    } catch (err: any) {
      const msg = err.message || 'Erro ao redefinir senha.';
      if (msg.toLowerCase().includes('senha') || msg.toLowerCase().includes('caractere')) {
        setErroSenha(msg);
      } else {
        setErro(msg);
      }
    } finally {
      setCarregando(false);
    }
  }

  async function preencherRapido(emailTeste: string) {
    setEmail(emailTeste);
    setSenha('Teste@2026');
    setErro('');
    setCarregando(true);
    try {
      const r = await api.post<{ token: string } & Sessao>('/auth/login', {
        email: emailTeste,
        senha: 'Teste@2026',
      });
      salvarSessao(r.token, {
        pessoa: r.pessoa,
        perfis: r.perfis,
        unidades: r.unidades,
        condominio: r.condominio,
        condominiosDisponiveis: r.condominiosDisponiveis,
        modulosAtivos: r.modulosAtivos,
      });
      nav('/');
    } catch (err: any) {
      setErro(err.message || 'Erro ao realizar login.');
    } finally {
      setCarregando(false);
    }
  }

  function preencherCodigoTeste() {
    setCodigoAtivacao('OASIS-7489');
    setEmailAtivacao('carlos.silva@teste.com');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0b1324] p-4 sm:p-6 transition-colors duration-200 overflow-x-hidden">
      {/* Fundo com padrão de ondas e 15% a 20% de opacidade (estilo de referência) */}
      <div
        className="fixed inset-0 pointer-events-none bg-center bg-cover bg-no-repeat dark:hidden"
        style={{
          backgroundImage: `url('/backgrounds/white-wave-seamless-pattern-background.jpg')`,
          opacity: 0.20,
        }}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none bg-center bg-cover bg-no-repeat hidden dark:block invert"
        style={{
          backgroundImage: `url('/backgrounds/white-wave-seamless-pattern-background.jpg')`,
          opacity: 0.08,
        }}
        aria-hidden="true"
      />

      {/* Alternador de Modo Escuro no topo direito */}
      <div className="fixed top-5 right-5 z-20">
        <BotaoModoEscuro />
      </div>

      {/* Cartão Centralizado de Login */}
      <div className="relative z-10 w-full max-w-[420px] animate-scale-in">
        <div className="rounded-[28px] border border-slate-100/90 bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:border-slate-800/80 dark:bg-[#0f172a] dark:shadow-2xl transition-all">
          {/* Logo e Cabeçalho Oficial OASIS (igual ao modelo anterior) */}
          <div className="mb-6 text-center">
            <div className="mx-auto flex items-center justify-center">
              <img
                src="/logos/logo-deitada-navy.png"
                alt="OASIS"
                className="h-12 sm:h-14 w-auto object-contain dark:hidden"
              />
              <img
                src="/logos/logo-deitada-sky.png"
                alt="OASIS"
                className="h-12 sm:h-14 w-auto object-contain hidden dark:block"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Gestão Condominial & Portal do Morador
            </p>
          </div>

          {/* Abas Alternadoras (Apenas quando não estiver na recuperação de senha) */}
          {aba !== 'esqueci_senha' && (
            <div className="mb-6 flex rounded-full bg-slate-100/80 p-1 border border-slate-200/50 dark:bg-slate-800/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all cursor-pointer ${
                  aba === 'login'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Entrar com Senha
              </button>
              <button
                type="button"
                onClick={() => { setAba('primeiro_acesso'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                className={`flex-1 rounded-full py-2 text-xs font-semibold transition-all cursor-pointer ${
                  aba === 'primeiro_acesso'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Primeiro Acesso
              </button>
            </div>
          )}

          {/* ABA 1: LOGIN TRADICIONAL */}
          {aba === 'login' && (
            <form onSubmit={entrar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  E-mail ou CPF
                </label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    type="text"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@condominio.com ou CPF"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Senha
                  </label>
                  <button
                    type="button"
                    id="btn-esqueci-senha"
                    onClick={() => {
                      setAba('esqueci_senha');
                      setEtapaRecuperacao(1);
                      setEmailRecuperacao(email);
                      setErro('');
                      setErroSenha('');
                      setErroConfirmacao('');
                      setSucessoRecuperacao('');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-sky-400 transition-colors cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    type={mostrarSenhaLogin ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                    onMouseDown={e => e.preventDefault()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                    tabIndex={-1}
                  >
                    <Icone nome={mostrarSenhaLogin ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Botão de Entrar (Estilo Pílula Navy igual à referência visual) */}
              <button
                type="submit"
                id="btn-login-submit"
                disabled={carregando}
                className="mt-2 w-full rounded-full bg-[#182235] hover:bg-[#0f1726] active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-3 px-4 text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {carregando ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Entrando no sistema...</span>
                  </>
                ) : (
                  <span>Entrar no Sistema</span>
                )}
              </button>

              <Mensagem texto={erro} tipo="erro" />

              {/* Atalhos para Demonstração e Desenvolvimento */}
              {modoDemo && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Acesso Rápido para Teste (1 Clique)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                    <button
                      id="btn-login-morador"
                      type="button"
                      onClick={() => preencherRapido('carlos.silva@teste.com')}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      <span className="block font-bold text-navy dark:text-sky-400">Morador</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Carlos Silva</span>
                    </button>
                    <button
                      id="btn-login-sindico"
                      type="button"
                      onClick={() => preencherRapido('ana.souza@teste.com')}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      <span className="block font-bold text-navy dark:text-sky-400">Síndica Oasis</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Ana Souza</span>
                    </button>
                    <button
                      id="btn-login-sindico-solar"
                      type="button"
                      onClick={() => preencherRapido('mariana.santos@solar.com')}
                      className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2 text-center font-medium text-slate-700 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 dark:hover:text-emerald-200 transition-colors cursor-pointer"
                    >
                      <span className="block font-bold text-emerald-600 dark:text-emerald-400">Síndica Solar</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Mariana Santos</span>
                    </button>
                    <button
                      id="btn-login-porteiro"
                      type="button"
                      onClick={() => preencherRapido('roberto.lima@teste.com')}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      <span className="block font-bold text-navy dark:text-sky-400">Porteiro</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Roberto</span>
                    </button>
                    <button
                      id="btn-login-superadmin"
                      type="button"
                      onClick={() => preencherRapido('superadmin@oasis.com')}
                      className="col-span-2 sm:col-span-1 rounded-lg border border-sky-200 bg-slate-50/70 p-2 text-center font-medium text-slate-700 hover:bg-slate-100 hover:text-navy dark:border-sky-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400 transition-colors cursor-pointer"
                    >
                      <span className="block font-bold text-sky-600 dark:text-sky-400">Superadmin</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Master</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {/* ABA 2: PRIMEIRO ACESSO COM CÓDIGO */}
          {aba === 'primeiro_acesso' && (
            <div>
              {!dadosValidacao ? (
                <form onSubmit={validarCodigo} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Código de Ativação
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase tracking-widest font-mono font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                      value={codigoAtivacao}
                      onChange={e => setCodigoAtivacao(e.target.value.toUpperCase())}
                      placeholder="EX.: OASIS-7489"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Seu E-mail ou CPF Cadastrado
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                      type="text"
                      value={emailAtivacao}
                      onChange={e => setEmailAtivacao(e.target.value)}
                      placeholder="seu.email@condominio.com ou CPF"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={carregando}
                    className="mt-2 w-full rounded-full bg-[#182235] hover:bg-[#0f1726] active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-3 px-4 text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {carregando ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Validando código...</span>
                      </>
                    ) : (
                      <span>Validar Código de Ativação</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAba('login'); setErro(''); }}
                    className="mt-3 block w-full text-center text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Voltar ao login
                  </button>

                  {modoDemo && (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                      <button
                        type="button"
                        onClick={preencherCodigoTeste}
                        className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                      >
                        Testar com Código de Exemplo (Carlos Silva)
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <form onSubmit={concluirPrimeiroAcesso} className="space-y-4 animate-scale-in" noValidate>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 dark:border-sky-900/50 dark:bg-sky-950/40">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                        <Icone nome="check" className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Olá, {dadosValidacao.pessoa.nome}!
                        </p>
                        {dadosValidacao.unidade && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            Bl. {dadosValidacao.unidade.bloco} - Apto {dadosValidacao.unidade.apartamento} ({dadosValidacao.unidade.vinculo}
                            {dadosValidacao.unidade.parentesco ? ` • ${dadosValidacao.unidade.parentesco}` : ''})
                          </p>
                        )}
                        {dadosValidacao.email_ofuscado && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            E-mail: <span className="font-semibold text-slate-700 dark:text-slate-200">{dadosValidacao.email_ofuscado}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Nova Senha (mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarNovaSenha ? 'text' : 'password'}
                        className={`w-full rounded-xl border ${erroSenha ? 'border-red-500' : 'border-slate-200'} bg-white px-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500`}
                        value={novaSenha}
                        onChange={e => {
                          setNovaSenha(e.target.value);
                          if (erroSenha) setErroSenha('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        title={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarNovaSenha ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroSenha && (
                      <p className="mt-1 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroSenha}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarSenha ? 'text' : 'password'}
                        className={`w-full rounded-xl border ${erroConfirmacao ? 'border-red-500' : 'border-slate-200'} bg-white px-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500`}
                        value={confirmarSenha}
                        onChange={e => {
                          setConfirmarSenha(e.target.value);
                          if (erroConfirmacao) setErroConfirmacao('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        title={mostrarConfirmarSenha ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarConfirmarSenha ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroConfirmacao && (
                      <p className="mt-1 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroConfirmacao}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDadosValidacao(null);
                        setErroSenha('');
                        setErroConfirmacao('');
                      }}
                      className="w-1/3 rounded-full border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={carregando}
                      className="w-2/3 rounded-full bg-[#182235] hover:bg-[#0f1726] active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-2.5 px-4 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {carregando ? 'Ativando...' : 'Ativar & Acessar'}
                    </button>
                  </div>
                </form>
              )}

              <Mensagem texto={erro} tipo="erro" />
            </div>
          )}

          {/* ABA 3: RECUPERAÇÃO DE SENHA */}
          {aba === 'esqueci_senha' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recuperar Senha</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {etapaRecuperacao === 1
                      ? 'Informe seu e-mail ou CPF cadastrado'
                      : 'Defina a nova senha da sua conta'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Icone nome="chevronLeft" className="h-3.5 w-3.5" />
                  Voltar
                </button>
              </div>
              {sucessoRecuperacao && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {sucessoRecuperacao}
                </div>
              )}

              {etapaRecuperacao === 1 ? (
                <form onSubmit={solicitarCodigoRecuperacao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Email
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                      type="text"
                      value={emailRecuperacao}
                      onChange={e => setEmailRecuperacao(e.target.value)}
                      placeholder="seu.email@exemplo.com ou CPF"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Botão Pílula Navy: Enviar código de recuperação */}
                  <button
                    id="btn-enviar-codigo-recuperacao"
                    type="submit"
                    disabled={carregando}
                    className="mt-2 w-full rounded-full bg-[#182235] hover:bg-[#0f1726] active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-3 px-4 text-sm shadow-xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {carregando ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enviando código...</span>
                      </>
                    ) : (
                      <span>Enviar código de recuperação</span>
                    )}
                  </button>

                  {/* Link Voltar ao login (igual ao "Back to sign in") */}
                  <button
                    type="button"
                    onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                    className="mt-4 block w-full text-center text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Voltar ao login
                  </button>
                </form>
              ) : (
                <form onSubmit={concluirRecuperacao} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Código de Recuperação
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm uppercase tracking-widest font-mono font-bold text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500"
                      value={codigoRecuperacao}
                      onChange={e => setCodigoRecuperacao(e.target.value.toUpperCase())}
                      placeholder="REC-XXXXXX"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarSenhaRecuperacao ? 'text' : 'password'}
                        className={`w-full rounded-xl border ${erroSenha ? 'border-red-500' : 'border-slate-200'} bg-white px-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500`}
                        value={novaSenhaRecuperacao}
                        onChange={e => {
                          setNovaSenhaRecuperacao(e.target.value);
                          if (erroSenha) setErroSenha('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarSenhaRecuperacao(!mostrarSenhaRecuperacao)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        title={mostrarSenhaRecuperacao ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarSenhaRecuperacao ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroSenha && (
                      <p className="mt-1 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroSenha}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarRecuperacao ? 'text' : 'password'}
                        className={`w-full rounded-xl border ${erroConfirmacao ? 'border-red-500' : 'border-slate-200'} bg-white px-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:border-[#1a233a] focus:ring-1 focus:ring-[#1a233a]/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:placeholder:text-slate-500`}
                        value={confirmarSenhaRecuperacao}
                        onChange={e => {
                          setConfirmarSenhaRecuperacao(e.target.value);
                          if (erroConfirmacao) setErroConfirmacao('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarRecuperacao(!mostrarConfirmarRecuperacao)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        title={mostrarConfirmarRecuperacao ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarConfirmarRecuperacao ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroConfirmacao && (
                      <p className="mt-1 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroConfirmacao}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEtapaRecuperacao(1)}
                      className="w-1/3 rounded-full border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                    >
                      Alterar E-mail
                    </button>
                    <button
                      type="submit"
                      disabled={carregando}
                      className="w-2/3 rounded-full bg-[#182235] hover:bg-[#0f1726] active:scale-[0.99] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold py-2.5 px-4 text-xs shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {carregando ? 'Redefinindo...' : 'Redefinir & Entrar'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                    className="mt-3 block w-full text-center text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    Voltar ao login
                  </button>
                </form>
              )}

              <Mensagem texto={erro} tipo="erro" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

