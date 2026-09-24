import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, salvarSessao, Sessao } from '../api';
import { Botao, Campo, inputCls, Mensagem, Icone } from '../components/ui';
import BotaoModoEscuro from '../components/BotaoModoEscuro';

/** UC01 - Autenticar no Sistema OASIS e Primeiro Acesso via Código */
export default function Login() {
  const nav = useNavigate();
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
    pessoa: { id_pessoa: number; nome: string; email: string };
    unidade: { bloco: string; apartamento: string; vinculo: string; parentesco?: string } | null;
  } | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  // Estado Esqueci Minha Senha
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [etapaRecuperacao, setEtapaRecuperacao] = useState<1 | 2>(1);
  const [codigoRecuperacao, setCodigoRecuperacao] = useState('');
  const [codigoDevRecuperacao, setCodigoDevRecuperacao] = useState('');
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
      const r = await api.post<{ token: string } & Sessao>('/auth/login', { email, senha });
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
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
        email: emailAtivacao,
      });
      setDadosValidacao(r);
    } catch (err: any) {
      setErro(err.message || 'Código ou e-mail inválidos.');
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
        email: emailAtivacao,
        novaSenha,
      });
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
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
    setCarregando(true);
    try {
      const res = await api.post<{ ok: boolean; mensagem: string; codigo_dev?: string }>('/auth/esqueci-senha', {
        email: emailRecuperacao,
      });
      if (res.codigo_dev) {
        setCodigoDevRecuperacao(res.codigo_dev);
        setCodigoRecuperacao(res.codigo_dev);
      }
      setSucessoRecuperacao(res.mensagem || 'Código de recuperação gerado com sucesso.');
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
        email: emailRecuperacao,
        codigo: codigoRecuperacao,
        novaSenha: novaSenhaRecuperacao,
      });
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
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
      salvarSessao(r.token, { pessoa: r.pessoa, perfis: r.perfis, unidades: r.unidades });
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-navy-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <BotaoModoEscuro />
      </div>

      <div className="w-full max-w-md animate-scale-in">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl">
          {/* Logo e Cabeçalho */}
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

          {/* Abas Alternadoras */}
          {aba !== 'esqueci_senha' && (
            <div className="mb-6 flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${aba === 'login'
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                Entrar com Senha
              </button>
              <button
                type="button"
                onClick={() => { setAba('primeiro_acesso'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${aba === 'primeiro_acesso'
                    ? 'bg-white dark:bg-slate-900 text-navy dark:text-sky-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
              >
                Primeiro Acesso (Código)
              </button>
            </div>
          )}

          {/* ABA 1: LOGIN TRADICIONAL */}
          {aba === 'login' && (
            <form onSubmit={entrar} className="space-y-4">
              <Campo rotulo="E-mail de Acesso" obrigatorio>
                <div className="relative">
                  <input
                    className={inputCls + ' pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20'}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu.email@condominio.com"
                    required
                  />
                  <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
                    <Icone nome="user" className="h-4 w-4" />
                  </span>
                </div>
              </Campo>

              <Campo rotulo="Senha" obrigatorio>
                <div className="relative">
                  <input
                    className={inputCls + ' pl-9 pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-500 dark:focus:ring-sky-500/20'}
                    type={mostrarSenhaLogin ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                    <Icone nome="shield" className="h-4 w-4" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaLogin(!mostrarSenhaLogin)}
                    onMouseDown={e => e.preventDefault()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={mostrarSenhaLogin ? 'Ocultar senha' : 'Ver senha'}
                    tabIndex={-1}
                  >
                    <Icone nome={mostrarSenhaLogin ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                  </button>
                </div>
              </Campo>

              <div className="flex justify-end -mt-2">
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
                  className="text-xs font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300 transition-colors cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              <Botao id="btn-login-submit" className="mt-4 w-full py-2.5 text-sm dark:bg-sky-600 dark:hover:bg-sky-500" carregando={carregando}>
                Entrar no Sistema
              </Botao>

              <Mensagem texto={erro} tipo="erro" />

              {/* Atalhos para Demonstração */}
              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Acesso Rápido para Teste (1 Clique)
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
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
                    <span className="block font-bold text-navy dark:text-sky-400">Síndica</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Ana</span>
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
                </div>
              </div>
            </form>
          )}

          {/* ABA 2: PRIMEIRO ACESSO COM CÓDIGO */}
          {aba === 'primeiro_acesso' && (
            <div>
              {!dadosValidacao ? (
                <form onSubmit={validarCodigo} className="space-y-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Insira o código de ativação fornecido pela administração do condomínio para configurar sua senha pessoal.
                  </p>

                  <Campo rotulo="Código de Ativação" obrigatorio>
                    <div className="relative">
                      <input
                        className={inputCls + ' uppercase tracking-widest font-mono font-bold pl-9'}
                        value={codigoAtivacao}
                        onChange={e => setCodigoAtivacao(e.target.value.toUpperCase())}
                        placeholder="EX.: OASIS-7489"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400">
                        <Icone nome="key" className="h-4 w-4" />
                      </span>
                    </div>
                  </Campo>

                  <Campo rotulo="Seu E-mail Cadastrado" obrigatorio>
                    <div className="relative">
                      <input
                        className={inputCls + ' pl-9'}
                        type="email"
                        value={emailAtivacao}
                        onChange={e => setEmailAtivacao(e.target.value)}
                        placeholder="seu.email@condominio.com"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400">
                        <Icone nome="user" className="h-4 w-4" />
                      </span>
                    </div>
                  </Campo>

                  <Botao className="mt-4 w-full py-2.5 text-sm" carregando={carregando}>
                    Validar Código de Ativação
                  </Botao>

                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                    <button
                      type="button"
                      onClick={preencherCodigoTeste}
                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                    >
                      Testar com Código de Exemplo (Carlos Silva)
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={concluirPrimeiroAcesso} className="space-y-4 animate-scale-in" noValidate>
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-900/50 dark:bg-sky-950/40">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white">
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
                      </div>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Cadastre sua senha pessoal de acesso:
                  </p>

                  <Campo rotulo="Nova Senha (mínimo 6 caracteres)" obrigatorio>
                    <div className="relative">
                      <input
                        type={mostrarNovaSenha ? 'text' : 'password'}
                        className={`${inputCls} pr-10 ${erroSenha ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
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
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
                        aria-label={mostrarNovaSenha ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarNovaSenha ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroSenha && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1 animate-fade-in">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroSenha}</span>
                      </p>
                    )}
                  </Campo>

                  <Campo rotulo="Confirmar Senha" obrigatorio>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarSenha ? 'text' : 'password'}
                        className={`${inputCls} pr-10 ${erroConfirmacao ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
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
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title={mostrarConfirmarSenha ? 'Ocultar senha' : 'Ver senha'}
                        aria-label={mostrarConfirmarSenha ? 'Ocultar senha' : 'Ver senha'}
                        tabIndex={-1}
                      >
                        <Icone nome={mostrarConfirmarSenha ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                      </button>
                    </div>
                    {erroConfirmacao && (
                      <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-rose-400 flex items-center gap-1 animate-fade-in">
                        <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                        <span>{erroConfirmacao}</span>
                      </p>
                    )}
                  </Campo>

                  <div className="flex gap-2 pt-2">
                    <Botao
                      type="button"
                      variante="claro"
                      className="w-1/3"
                      onClick={() => {
                        setDadosValidacao(null);
                        setErroSenha('');
                        setErroConfirmacao('');
                      }}
                    >
                      Voltar
                    </Botao>
                    <Botao
                      type="submit"
                      variante="primario"
                      className="w-2/3"
                      carregando={carregando}
                    >
                      Ativar & Acessar
                    </Botao>
                  </div>
                </form>
              )}

              <Mensagem texto={erro} tipo="erro" />
            </div>
          )}

          {/* ABA 3: RECUPERAÇÃO DE SENHA */}
          {aba === 'esqueci_senha' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-navy dark:text-sky-400">Recuperar Senha</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {etapaRecuperacao === 1
                      ? 'Informe seu e-mail para receber o código'
                      : 'Defina a nova senha da sua conta'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setAba('login'); setErro(''); setErroSenha(''); setErroConfirmacao(''); }}
                  className="text-xs text-slate-500 hover:text-navy dark:text-slate-400 dark:hover:text-sky-400 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Icone nome="chevronLeft" className="h-3.5 w-3.5" />
                  Voltar ao login
                </button>
              </div>

              {sucessoRecuperacao && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {sucessoRecuperacao}
                </div>
              )}

              {etapaRecuperacao === 1 ? (
                <form onSubmit={solicitarCodigoRecuperacao} className="space-y-4">
                  <Campo rotulo="E-mail Cadastrado" obrigatorio>
                    <div className="relative">
                      <input
                        className={inputCls + ' pl-9 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500'}
                        type="email"
                        value={emailRecuperacao}
                        onChange={e => setEmailRecuperacao(e.target.value)}
                        placeholder="seu.email@condominio.com"
                        required
                        autoFocus
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
                        <Icone nome="user" className="h-4 w-4" />
                      </span>
                    </div>
                  </Campo>

                  <Botao
                    id="btn-enviar-codigo-recuperacao"
                    type="submit"
                    className="w-full py-2.5 text-sm dark:bg-sky-600 dark:hover:bg-sky-500"
                    carregando={carregando}
                  >
                    Enviar Código de Recuperação
                  </Botao>
                </form>
              ) : (
                <form onSubmit={concluirRecuperacao} className="space-y-4">
                  {codigoDevRecuperacao && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50/80 dark:border-sky-800/50 dark:bg-sky-950/40 p-3 text-xs">
                      <p className="font-semibold text-sky-900 dark:text-sky-300">Ambiente de Demonstração:</p>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                        Código de recuperação:{' '}
                        <button
                          type="button"
                          onClick={() => setCodigoRecuperacao(codigoDevRecuperacao)}
                          className="font-mono font-bold text-sky-700 dark:text-sky-400 underline cursor-pointer hover:text-sky-900"
                          title="Clique para preencher automaticamente"
                        >
                          {codigoDevRecuperacao}
                        </button>
                      </p>
                    </div>
                  )}

                  <Campo rotulo="Código de Recuperação" obrigatorio>
                    <div className="relative">
                      <input
                        className={inputCls + ' uppercase tracking-widest font-mono font-bold pl-9'}
                        value={codigoRecuperacao}
                        onChange={e => setCodigoRecuperacao(e.target.value.toUpperCase())}
                        placeholder="REC-XXXXXX"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500">
                        <Icone nome="shield" className="h-4 w-4" />
                      </span>
                    </div>
                  </Campo>

                  <Campo rotulo="Nova Senha" obrigatorio>
                    <div className="relative">
                      <input
                        type={mostrarSenhaRecuperacao ? 'text' : 'password'}
                        className={`${inputCls} pr-10 pl-9 ${erroSenha ? 'border-red-500' : ''}`}
                        value={novaSenhaRecuperacao}
                        onChange={e => {
                          setNovaSenhaRecuperacao(e.target.value);
                          if (erroSenha) setErroSenha('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                        <Icone nome="shield" className="h-4 w-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarSenhaRecuperacao(!mostrarSenhaRecuperacao)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                  </Campo>

                  <Campo rotulo="Confirmar Nova Senha" obrigatorio>
                    <div className="relative">
                      <input
                        type={mostrarConfirmarRecuperacao ? 'text' : 'password'}
                        className={`${inputCls} pr-10 pl-9 ${erroConfirmacao ? 'border-red-500' : ''}`}
                        value={confirmarSenhaRecuperacao}
                        onChange={e => {
                          setConfirmarSenhaRecuperacao(e.target.value);
                          if (erroConfirmacao) setErroConfirmacao('');
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                        <Icone nome="shield" className="h-4 w-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarConfirmarRecuperacao(!mostrarConfirmarRecuperacao)}
                        onMouseDown={e => e.preventDefault()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:text-navy hover:bg-slate-100 dark:text-slate-400 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
                  </Campo>

                  <div className="flex gap-2 pt-2">
                    <Botao
                      type="button"
                      variante="claro"
                      className="w-1/3"
                      onClick={() => setEtapaRecuperacao(1)}
                    >
                      Alterar E-mail
                    </Botao>
                    <Botao
                      type="submit"
                      variante="primario"
                      className="w-2/3"
                      carregando={carregando}
                    >
                      Redefinir & Entrar
                    </Botao>
                  </div>
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

