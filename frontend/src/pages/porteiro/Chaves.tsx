import { useEffect, useState } from 'react';
import { api, sessaoAtual } from '../../api';
import { Botao, Campo, Cartao, inputCls, Mensagem, Titulo, Icone, Badge, EmptyState, Modal, ModalConfirmacao } from '../../components/ui';
import SeletorMorador from '../../components/SeletorMorador';

type Chave = {
  id_chave: number;
  codigo: string;
  status: string;
  id_area_comum: number;
  area: string;
  id_entrega_chave: number | null;
  responsavel: string | null;
  apartamento?: string | null;
  bloco?: string | null;
  contato_responsavel?: string | null;
  data_hora_retirada: string | null;
};

type Pessoa = {
  id_pessoa: number;
  nome: string;
  perfis: { tipo: string; id_perfil: number }[];
  unidades?: { bloco: string; apartamento: string }[];
};

type AreaItem = {
  id_area_comum: number;
  nome: string;
  exige_chave: boolean;
};

/** UC06 - Empréstimo e devolução de chaves das áreas comuns (Portaria & Administrador) */
export default function Chaves() {
  const sessao = sessaoAtual();
  const ehAdmin = sessao?.perfis.some(p => p.tipo === 'ADMINISTRADOR' || p.tipo === 'SINDICO');

  const [chaves, setChaves] = useState<Chave[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'disponiveis' | 'emprestadas'>('todas');
  const [busca, setBusca] = useState('');

  const [emprestando, setEmprestando] = useState<Chave | null>(null);
  const [solicitante, setSolicitante] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modal Nova Chave (Síndico)
  const [modalNovaChave, setModalNovaChave] = useState(false);
  const [novaChaveArea, setNovaChaveArea] = useState<number | ''>('');
  const [novaChaveCodigo, setNovaChaveCodigo] = useState('');
  const [novaChaveObs, setNovaChaveObs] = useState('');
  const [salvandoChave, setSalvandoChave] = useState(false);

  // Estados para Edição e Exclusão de Chave (Síndico)
  const [editandoChave, setEditandoChave] = useState<{ id_chave: number; codigo: string; observacao?: string } | null>(null);
  const [excluindoChave, setExcluindoChave] = useState<Chave | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const [msg, setMsg] = useState<{ t: string; tipo: 'erro' | 'ok' }>({ t: '', tipo: 'ok' });

  const carregar = () => {
    api.get<Chave[]>('/portaria/chaves').then(setChaves).catch(e => setMsg({ t: e.message, tipo: 'erro' }));
    api.get<Pessoa[]>('/cadastros/pessoas').then(setPessoas).catch(() => {});
    api.get<AreaItem[]>('/areas').then(a => setAreas(a.filter(x => x.exige_chave))).catch(() => {});
  };

  useEffect(() => {
    carregar();
  }, []);

  const moradores = pessoas
    .map(p => ({
      nome: p.nome,
      perfil: p.perfis?.find(x => x.tipo === 'MORADOR'),
      unidades: p.unidades,
    }))
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
      setMsg({ t: `Devolução da chave "${codigo}" registrada; espaço liberado no claviculário.`, tipo: 'ok' });
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    }
  }

  async function cadastrarNovaChave(e: React.FormEvent) {
    e.preventDefault();
    if (!novaChaveArea || !novaChaveCodigo.trim()) return;
    setSalvandoChave(true);
    try {
      await api.post('/portaria/chaves', {
        id_area_comum: Number(novaChaveArea),
        codigo: novaChaveCodigo.trim(),
        observacao: novaChaveObs.trim() || undefined,
      });
      setMsg({ t: `Chave "${novaChaveCodigo.toUpperCase()}" cadastrada com sucesso!`, tipo: 'ok' });
      setModalNovaChave(false);
      setNovaChaveArea('');
      setNovaChaveCodigo('');
      setNovaChaveObs('');
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setSalvandoChave(false);
    }
  }

  async function salvarEdicaoChave() {
    if (!editandoChave) return;
    if (!editandoChave.codigo.trim()) {
      setMsg({ t: 'O código da chave é obrigatório.', tipo: 'erro' });
      return;
    }
    setSalvandoEdicao(true);
    try {
      await api.put(`/portaria/chaves/${editandoChave.id_chave}`, {
        codigo: editandoChave.codigo.trim(),
        observacao: editandoChave.observacao?.trim() || null,
      });
      setMsg({ t: `Chave atualizada para "${editandoChave.codigo.trim().toUpperCase()}" com sucesso!`, tipo: 'ok' });
      setEditandoChave(null);
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function confirmarExclusaoChave() {
    if (!excluindoChave) return;
    setExcluindo(true);
    try {
      await api.delete(`/portaria/chaves/${excluindoChave.id_chave}`);
      setMsg({ t: `Chave "${excluindoChave.codigo}" excluída com sucesso do claviculário.`, tipo: 'ok' });
      setExcluindoChave(null);
      carregar();
    } catch (e: any) {
      setMsg({ t: e.message, tipo: 'erro' });
    } finally {
      setExcluindo(false);
    }
  }

  const totalDisponiveis = chaves.filter(c => c.status === 'DISPONIVEL').length;
  const totalEmprestadas = chaves.filter(c => c.status === 'EMPRESTADA').length;

  const chavesFiltradas = chaves.filter(c => {
    if (filtro === 'disponiveis' && c.status !== 'DISPONIVEL') return false;
    if (filtro === 'emprestadas' && c.status !== 'EMPRESTADA') return false;
    if (busca) {
      const q = busca.toLowerCase();
      const matchCod = c.codigo.toLowerCase().includes(q);
      const matchArea = c.area.toLowerCase().includes(q);
      const matchResp = c.responsavel?.toLowerCase().includes(q);
      const matchApto = c.apartamento?.toLowerCase().includes(q);
      return matchCod || matchArea || matchResp || matchApto;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Titulo
        sub="Controle de retirada e devolução das chaves das áreas comuns e dependências coletivas."
        icone={<Icone nome="key" className="h-5 w-5" />}
        acao={
          <div className="flex items-center gap-2">
            <Botao
              variante="claro"
              tamanho="sm"
              icone={<Icone nome="filter" className="h-3.5 w-3.5" />}
              onClick={carregar}
            >
              Atualizar
            </Botao>
            {ehAdmin && (
              <Botao
                tamanho="sm"
                icone={<Icone nome="plus" className="h-3.5 w-3.5" />}
                onClick={() => setModalNovaChave(true)}
              >
                Nova Chave
              </Botao>
            )}
          </div>
        }
      >
        Controle de Chaves
      </Titulo>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total no Claviculário</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{chaves.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-400">
            <Icone nome="key" className="h-5 w-5" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Disponíveis para Uso</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalDisponiveis}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Icone nome="check" className="h-5 w-5" />
          </div>
        </Cartao>

        <Cartao className="flex items-center justify-between p-4">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Emprestadas no Momento</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalEmprestadas}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Icone nome="alert" className="h-5 w-5" />
          </div>
        </Cartao>
      </div>

      {/* Barra de Filtros e Busca */}
      <Cartao className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltro('todas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filtro === 'todas'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Todas ({chaves.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('disponiveis')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filtro === 'disponiveis'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Disponíveis ({totalDisponiveis})
            </button>
            <button
              type="button"
              onClick={() => setFiltro('emprestadas')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                filtro === 'emprestadas'
                  ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              Emprestadas ({totalEmprestadas})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Icone nome="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, área ou morador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className={`${inputCls} pl-9 py-1.5 text-xs`}
            />
          </div>
        </div>
      </Cartao>

      {/* Grid de Chaves */}
      {chavesFiltradas.length === 0 ? (
        <EmptyState
          icone="key"
          titulo="Nenhuma chave encontrada"
          descricao={
            busca
              ? 'Nenhuma chave corresponde à busca informada.'
              : 'Espaços que exigem chave física cadastrados pelo síndico aparecerão automaticamente aqui.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chavesFiltradas.map(c => {
            const disponivel = c.status === 'DISPONIVEL';
            return (
              <div
                key={c.id_chave}
                className={`rounded-2xl border p-4.5 transition-all shadow-soft flex flex-col justify-between ${
                  disponivel
                    ? 'border-slate-200/80 bg-white hover:border-navy/30 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-sky-500/40'
                    : 'border-amber-300/80 bg-amber-50/40 dark:border-amber-800/70 dark:bg-amber-950/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold ${
                          disponivel
                            ? 'bg-navy-50 text-navy dark:bg-slate-700 dark:text-sky-400'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300'
                        }`}
                      >
                        <Icone nome="key" className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">{c.codigo}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{c.area}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge tipo={disponivel ? 'sucesso' : 'aviso'}>
                        {disponivel ? 'Disponível' : 'Emprestada'}
                      </Badge>
                      {ehAdmin && (
                        <div className="flex items-center gap-0.5 ml-1">
                          <button
                            type="button"
                            title="Editar código ou observação da chave"
                            onClick={() => setEditandoChave({ id_chave: c.id_chave, codigo: c.codigo, observacao: '' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-navy hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-sky-400 transition-colors cursor-pointer"
                          >
                            <Icone nome="edit" className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!disponivel}
                            title={!disponivel ? 'Não é possível excluir chave emprestada' : 'Excluir chave'}
                            onClick={() => setExcluindoChave(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Icone nome="trash" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações de quem está com a chave */}
                  {!disponivel && c.responsavel && (
                    <div className="mt-3.5 rounded-xl border border-amber-200/80 bg-white dark:border-amber-900/50 dark:bg-slate-850 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                        Com quem está a chave:
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.responsavel}</span>
                        {c.apartamento && (
                          <span className="rounded-md bg-navy-50 text-navy dark:bg-sky-950/60 dark:text-sky-300 px-2 py-0.5 text-[10px] font-bold border border-navy/10 dark:border-sky-800">
                            {c.bloco ? `Bloco ${c.bloco} - ` : ''}Apto {c.apartamento}
                          </span>
                        )}
                      </div>
                      {c.contato_responsavel && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Tel: <b>{c.contato_responsavel}</b>
                        </p>
                      )}
                      {c.data_hora_retirada && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                          Retirada em: {new Date(c.data_hora_retirada).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Ações */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  {disponivel ? (
                    <Botao
                      variante="claro"
                      tamanho="sm"
                      className="w-full justify-center"
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
                        className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
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

      {/* Modal de Empréstimo */}
      <Modal
        aberto={!!emprestando}
        fechar={() => setEmprestando(null)}
        titulo={`Empréstimo da Chave ${emprestando?.codigo || ''}`}
        rodape={
          emprestando && (
            <>
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
            </>
          )
        }
      >
        {emprestando && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 space-y-1">
              <p>Código da Chave: <b className="text-slate-900 dark:text-slate-100">{emprestando.codigo}</b></p>
              <p>Área Comum: <b className="text-slate-900 dark:text-slate-100">{emprestando.area}</b></p>
            </div>

            <Campo rotulo="Morador Solicitante (Responsável pela Chave)" obrigatorio>
              <SeletorMorador
                moradores={moradores.map(m => ({
                  id: m.perfil!.id_perfil,
                  nome: m.nome,
                  unidades: m.unidades,
                }))}
                valor={solicitante}
                onChange={setSolicitante}
                placeholder="Pesquisar por nome ou número do apto..."
                obrigatorio
              />
            </Campo>
          </div>
        )}
      </Modal>

      {/* Modal Cadastrar Nova Chave / Via Extra (Síndico) */}
      <Modal
        aberto={modalNovaChave}
        fechar={() => setModalNovaChave(false)}
        titulo="Cadastrar Nova Chave no Claviculário"
      >
        <form onSubmit={cadastrarNovaChave} className="space-y-4">
          <Campo rotulo="Área Comum Vinculada" obrigatorio>
            <select
              className={inputCls}
              value={novaChaveArea}
              onChange={e => setNovaChaveArea(Number(e.target.value) || '')}
              required
            >
              <option value="">Selecione a área comum...</option>
              {areas.map(a => (
                <option key={a.id_area_comum} value={a.id_area_comum}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Código de Identificação da Chave" obrigatorio ajuda="Ex: CH-SALAO-02">
            <input
              type="text"
              maxLength={20}
              placeholder="Ex: CH-SALAO-02"
              value={novaChaveCodigo}
              onChange={e => setNovaChaveCodigo(e.target.value.toUpperCase())}
              className={inputCls}
              required
            />
          </Campo>

          <Campo rotulo="Observação / Descrição da Via" ajuda="Opcional: cópia reserva, armário, etc.">
            <input
              type="text"
              maxLength={255}
              placeholder="Ex: Cópia reserva da portaria"
              value={novaChaveObs}
              onChange={e => setNovaChaveObs(e.target.value)}
              className={inputCls}
            />
          </Campo>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Botao variante="claro" onClick={() => setModalNovaChave(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={salvandoChave} icone={<Icone nome="check" className="h-4 w-4" />}>
              Cadastrar Chave
            </Botao>
          </div>
        </form>
      </Modal>

      {/* Modal de Edição de Chave Física (Síndico) */}
      <Modal
        aberto={!!editandoChave}
        fechar={() => setEditandoChave(null)}
        titulo="Editar Chave Física"
        largura="max-w-md"
        rodape={
          <>
            <Botao variante="claro" onClick={() => setEditandoChave(null)}>
              Cancelar
            </Botao>
            <Botao onClick={salvarEdicaoChave} carregando={salvandoEdicao}>
              Salvar Alterações
            </Botao>
          </>
        }
      >
        {editandoChave && (
          <div className="space-y-4">
            <Campo rotulo="Código / Identificação da Chave" obrigatorio dica="Identificação física na chave ou chaveiro">
              <input
                className={inputCls}
                value={editandoChave.codigo}
                onChange={e => setEditandoChave({ ...editandoChave, codigo: e.target.value })}
                placeholder="Ex.: CH-SF-01"
                required
              />
            </Campo>
            <Campo rotulo="Observação / Descrição" dica="Opcional: chave mestra, cópia reserva, etc.">
              <input
                className={inputCls}
                value={editandoChave.observacao || ''}
                onChange={e => setEditandoChave({ ...editandoChave, observacao: e.target.value })}
                placeholder="Ex.: Cópia da recepção"
              />
            </Campo>
          </div>
        )}
      </Modal>

      {/* Confirmação de Exclusão de Chave (Síndico) */}
      <ModalConfirmacao
        aberto={!!excluindoChave}
        fechar={() => setExcluindoChave(null)}
        confirmar={confirmarExclusaoChave}
        titulo="Excluir Chave Física"
        mensagem={`Tem certeza que deseja excluir a chave "${excluindoChave?.codigo}" do espaço "${excluindoChave?.area}"? Ela será removida permanentemente do claviculário.`}
        textoBotaoConfirmar="Excluir Chave"
        variante="perigo"
        carregando={excluindo}
      />

      <Mensagem texto={msg.t} tipo={msg.tipo} aoFechar={() => setMsg({ t: '', tipo: 'ok' })} />
    </div>
  );
}
