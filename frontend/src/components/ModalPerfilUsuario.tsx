import React, { useState, useRef, useEffect } from 'react';
import { Modal, Botao, Badge, Icone } from './ui';

export interface ModalPerfilUsuarioProps {
  aberto: boolean;
  fechar: () => void;
  pessoa: any | null;
  carregando?: boolean;
  aoEditar?: (pessoa: any) => void;
  aoVerAtividades?: (pessoa: any) => void;
  aoAdicionarDependente?: (titular: any, idUnidade: number) => void;
  aoNavegarParaPessoa?: (idPessoa: number) => void;
  somenteLeitura?: boolean;
  aoBloquear?: (pessoa: any) => void;
  aoInativar?: (pessoa: any) => void;
  aoReativar?: (pessoa: any) => void;
  aoExcluir?: (pessoa: any) => void;
}

function obterPapelUsuario(p: any): {
  papel: string;
  badgeCls: string;
} {
  const tipos = (p.perfis || []).map((pf: any) => (typeof pf === 'string' ? pf : pf.tipo));
  const temSindico = tipos.includes('SINDICO') || tipos.includes('ADMINISTRADOR');
  const temMorador = tipos.includes('MORADOR');
  const temPorteiro = tipos.includes('PORTEIRO');

  if (p.papel_controle === 'PRESTADOR_SERVICO' || p.tipo_servico) {
    return {
      papel: p.tipo_servico ? `Prestador: ${p.tipo_servico}` : 'Prestador de Serviço',
      badgeCls: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800/60',
    };
  }
  if (p.papel_controle === 'VISITANTE') {
    return {
      papel: 'Visitante',
      badgeCls: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800/60',
    };
  }
  if (temSindico && temMorador) {
    return {
      papel: 'Administrador / Morador',
      badgeCls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60',
    };
  }
  if (temSindico) {
    return {
      papel: 'Administrador',
      badgeCls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60',
    };
  }
  if (temPorteiro) {
    return {
      papel: 'Porteiro',
      badgeCls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60',
    };
  }
  return {
    papel: 'Morador',
    badgeCls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60',
  };
}

function formatarCpf(cpf?: string) {
  if (!cpf) return '-';
  const c = cpf.replace(/\D/g, '');
  if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return cpf;
}

function calcularIdade(dataNasc?: string): number | null {
  if (!dataNasc) return null;
  const nasc = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
    idade--;
  }
  return isNaN(idade) ? null : idade;
}

function formatarParentesco(p?: string | null) {
  switch (p) {
    case 'CONJUGE': return 'Cônjuge';
    case 'FILHO': return 'Filho(a)';
    case 'PAI_MAE': return 'Pai/Mãe';
    case 'OUTRO': return 'Outro';
    default: return p || 'Dependente';
  }
}

export function ModalPerfilUsuario({
  aberto,
  fechar,
  pessoa,
  carregando = false,
  aoEditar,
  aoVerAtividades,
  aoAdicionarDependente,
  aoNavegarParaPessoa,
  somenteLeitura = false,
  aoBloquear,
  aoInativar,
  aoReativar,
  aoExcluir,
}: ModalPerfilUsuarioProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [msgCopiado, setMsgCopiado] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha dropdown de ações ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    }
    if (menuAberto) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuAberto]);

  // Se o modal fechar, reseta o menu
  useEffect(() => {
    if (!aberto) {
      setMenuAberto(false);
      setMsgCopiado(false);
    }
  }, [aberto]);

  if (!aberto) return null;

  // Normalização de dados (compatível com lista de Pessoas e detalhes de EstruturaFisica)
  const u = pessoa?.unidades && pessoa.unidades.length > 0 ? pessoa.unidades[0] : null;
  const bloco = u ? u.bloco : pessoa?.bloco;
  const apartamento = u ? u.apartamento : (pessoa?.numero_apartamento || pessoa?.apartamento);
  const vinculo = u ? (u.vinculo || 'MORADOR') : (pessoa?.tipo_vinculo || 'MORADOR');
  const idUnidade = u ? u.id_unidade : pessoa?.id_unidade;
  const responsavel = pessoa?.responsavel || (pessoa?.id_responsavel ? {
    id_pessoa: pessoa.id_responsavel,
    nome: pessoa.nome_responsavel || 'Titular Responsável',
    email: pessoa.email_responsavel,
  } : null);
  const dependentes = pessoa?.dependentes || [];
  const ehDependente = vinculo === 'DEPENDENTE' || Boolean(responsavel);
  const papelInfo = pessoa ? obterPapelUsuario(pessoa) : { papel: 'Morador', badgeCls: '' };
  const idade = pessoa?.data_nascimento ? calcularIdade(pessoa.data_nascimento) : null;
  const temAcoesExtras = Boolean(aoBloquear || aoInativar || aoReativar || aoExcluir);

  return (
    <Modal
      aberto={aberto}
      fechar={fechar}
      titulo="Perfil do Usuário"
      largura="max-w-xl"
    >
      {carregando ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Carregando dados completos do perfil...
        </div>
      ) : pessoa ? (
        <div className="space-y-4">
          {/* Header com dados pessoais e badge do papel */}
          <div className="flex items-center gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-navy text-white font-bold text-lg shadow-xs">
              {pessoa.nome?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">
                  {pessoa.nome}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    papelInfo.badgeCls
                  }`}
                >
                  {papelInfo.papel}
                </span>
                <Badge tipo={pessoa.ativo ? 'sucesso' : 'perigo'}>
                  {pessoa.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {pessoa.email ? `${pessoa.email} • ` : ''}
                {pessoa.celular || 'Sem celular cadastrado'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-slate-500 font-mono">
                  CPF : {formatarCpf(pessoa.cpf)}
                </span>
                {idade !== null && (
                  <span className="text-[11px] text-slate-500">
                    • Idade: {idade} anos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Especialidade / Descrição do Prestador de Serviço */}
          {pessoa.tipo_servico && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Tipo / Especialidade do Prestador de Serviço
                </p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {pessoa.tipo_servico}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                <Icone nome="wrench" className="h-4 w-4" />
              </div>
            </div>
          )}

          {/* Dados da Unidade */}
          {(bloco || apartamento) && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                VÍNCULO COM IMÓVEL
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {bloco === 'Prédio' || apartamento === 'Geral'
                    ? '🏢 Prédio / Condomínio (Áreas Comuns)'
                    : `Bloco ${bloco || '-'} - Apartamento ${apartamento || '-'}`}
                </span>
                <span className="rounded bg-navy-50 text-navy dark:bg-slate-700 dark:text-sky-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                  {vinculo}
                </span>
              </div>
            </div>
          )}

          {/* SE FOR DEPENDENTE: EXIBE TITULAR RESPONSÁVEL SUPERIOR */}
          {responsavel && (
            <div className="rounded-xl border border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/30 p-3.5 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Icone nome="users" className="h-3.5 w-3.5" />
                Usuário Superior / Titular Responsável
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {responsavel.nome}
                  </p>
                  {responsavel.email && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {responsavel.email}
                    </p>
                  )}
                </div>
                {aoNavegarParaPessoa && (
                  <Botao
                    variante="claro"
                    tamanho="sm"
                    onClick={() => aoNavegarParaPessoa(responsavel.id_pessoa)}
                  >
                    Ver Perfil do Titular
                  </Botao>
                )}
              </div>
            </div>
          )}

          {/* SE FOR TITULAR: EXIBE LISTA DE DEPENDENTES VINCULADOS */}
          {!ehDependente && (
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  DEPENDENTES DA FAMÍLIA ({dependentes.length})
                </p>
                {!somenteLeitura && aoAdicionarDependente && idUnidade && (
                  <button
                    type="button"
                    onClick={() => aoAdicionarDependente(pessoa, Number(idUnidade))}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
                  >
                    + Adicionar Dependente
                  </button>
                )}
              </div>

              {dependentes.length > 0 ? (
                <div className="space-y-2">
                  {dependentes.map((dep: any) => (
                    <div
                      key={dep.id_pessoa}
                      onClick={() => aoNavegarParaPessoa && aoNavegarParaPessoa(dep.id_pessoa)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/50 dark:border-slate-700/50"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                            {dep.nome}
                          </span>
                          <span className="rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-bold">
                            {formatarParentesco(dep.grau_parentesco)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {dep.email ? `${dep.email} • ` : ''}
                          {dep.data_nascimento ? `${calcularIdade(dep.data_nascimento)} anos` : ''}
                        </p>
                      </div>
                      <span className="text-slate-400 text-xs font-semibold">Ver ➔</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum dependente cadastrado para este titular.
                </p>
              )}
            </div>
          )}

          {/* Código de Ativação caso exista */}
          {pessoa.codigo_ativacao && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase text-sky-700 dark:text-sky-300">
                  Código de Primeiro Acesso
                </p>
                <p className="font-mono text-sm font-black text-sky-900 dark:text-sky-200">
                  {pessoa.codigo_ativacao}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(pessoa.codigo_ativacao || '');
                  setMsgCopiado(true);
                  setTimeout(() => setMsgCopiado(false), 2000);
                }}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
              >
                {msgCopiado ? 'Copiado!' : 'Copiar Código'}
              </button>
            </div>
          )}

          {/* Penalidades ativas caso existam */}
          {pessoa.total_bloqueios_ativos && pessoa.total_bloqueios_ativos > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50/70 dark:border-rose-900/50 dark:bg-rose-950/30 p-3 text-xs text-red-700 dark:text-rose-300 flex items-center gap-2">
              <Icone nome="alert" className="h-4 w-4 text-red-600 dark:text-rose-400 shrink-0" />
              <span>Usuário possui <b>{pessoa.total_bloqueios_ativos}</b> penalidade(s) / restrição(ões) ativa(s) para áreas comuns.</span>
            </div>
          ) : null}

          {/* Seção Integrada: Atividade & Ações do Cadastro */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Icone nome="calendar" className="h-3.5 w-3.5 text-navy dark:text-sky-400" />
                  ATIVIDADE NO CONDOMÍNIO
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Histórico de reservas, uso de áreas comuns e agendamentos.
                </p>
              </div>
              {aoVerAtividades && (
                <Botao
                  variante="primario"
                  tamanho="sm"
                  icone={<Icone nome="calendar" className="h-3.5 w-3.5" />}
                  onClick={() => aoVerAtividades(pessoa)}
                >
                  Ver Atividades & Reservas
                </Botao>
              )}
            </div>
          </div>

          {/* Barra Inferior Padronizada de Ações do Modal */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <Botao
              variante="claro"
              tamanho="sm"
              onClick={fechar}
            >
              Fechar
            </Botao>

            <div className="flex items-center gap-2">
              {aoEditar && (
                <Botao
                  variante="claro"
                  tamanho="sm"
                  icone={<Icone nome="edit" className="h-3.5 w-3.5" />}
                  onClick={() => {
                    fechar();
                    aoEditar(pessoa);
                  }}
                >
                  Editar Cadastro
                </Botao>
              )}

              {/* Menu Compacto de Gerenciamento Avançado no Perfil */}
              {temAcoesExtras && (
                <div className="relative inline-block text-left" ref={menuRef}>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setMenuAberto(prev => !prev);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-colors shadow-xs cursor-pointer"
                  >
                    <span>Mais Ações</span>
                    <Icone nome="chevronDown" className="h-3 w-3 opacity-60" />
                  </button>

                  {menuAberto && (
                    <div
                      onClick={e => e.stopPropagation()}
                      className="absolute right-0 bottom-full mb-1.5 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 animate-scale-in"
                    >
                      {pessoa.ativo ? (
                        <>
                          {aoBloquear && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAberto(false);
                                fechar();
                                aoBloquear(pessoa);
                              }}
                              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-left cursor-pointer ${
                                pessoa.total_bloqueios_ativos && pessoa.total_bloqueios_ativos > 0
                                  ? 'text-red-600 dark:text-rose-400 bg-red-50/40 dark:bg-rose-950/20'
                                  : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/40'
                              }`}
                            >
                              <Icone nome="alert" className="h-3.5 w-3.5 shrink-0" />
                              Penalidades {pessoa.total_bloqueios_ativos ? `(${pessoa.total_bloqueios_ativos})` : ''}
                            </button>
                          )}

                          <div className="my-1 border-t border-slate-100 dark:border-slate-700/80" />

                          {aoInativar && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAberto(false);
                                fechar();
                                aoInativar(pessoa);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-left cursor-pointer"
                            >
                              <Icone nome="eyeOff" className="h-3.5 w-3.5 shrink-0" />
                              Inativar Usuário
                            </button>
                          )}

                          {aoExcluir && (
                            pessoa?.pode_excluir ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuAberto(false);
                                  fechar();
                                  aoExcluir(pessoa);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                              >
                                <Icone nome="trash" className="h-3.5 w-3.5 shrink-0" />
                                Excluir Perfil Errado
                              </button>
                            ) : (
                              <div
                                title="Esta pessoa possui histórico no condomínio e não pode ser excluída por segurança. Utilize 'Inativar Usuário'."
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed text-left select-none"
                              >
                                <Icone nome="shield" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                <span>Exclusão bloqueada</span>
                              </div>
                            )
                          )}
                        </>
                      ) : (
                        <>
                          {aoReativar && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAberto(false);
                                fechar();
                                aoReativar(pessoa);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-left cursor-pointer"
                            >
                              <Icone nome="check" className="h-3.5 w-3.5 shrink-0" />
                              Reativar Perfil
                            </button>
                          )}

                          {aoExcluir && (
                            pessoa?.pode_excluir ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuAberto(false);
                                  fechar();
                                  aoExcluir(pessoa);
                                }}
                                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/60 dark:hover:bg-rose-950/40 text-left cursor-pointer"
                              >
                                <Icone nome="trash" className="h-3.5 w-3.5 shrink-0" />
                                Excluir Perfil Errado
                              </button>
                            ) : (
                              <div
                                title="Esta pessoa possui histórico no condomínio e não pode ser excluída por segurança."
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 cursor-not-allowed text-left select-none"
                              >
                                <Icone nome="shield" className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                <span>Exclusão bloqueada</span>
                              </div>
                            )
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
export default ModalPerfilUsuario;
