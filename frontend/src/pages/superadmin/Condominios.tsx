import React, { useState, useEffect } from 'react';
import { api, sessaoAtual, alternarCondominio } from '../../api';
import { Titulo, Cartao, Botao, Badge, Icone, inputCls, Mensagem } from '../../components/ui';

export interface CondominioDetalhado {
  id_condominio: number;
  nome: string;
  razao_social?: string;
  cnpj?: string;
  slug: string;
  endereco_completo?: string;
  cidade: string;
  uf: string;
  cep?: string;
  telefone_contato?: string;
  email_contato?: string;
  logo_url?: string;
  ativo: boolean;
  criado_em: string;
  total_blocos: number;
  total_unidades: number;
  total_moradores: number;
}

export default function CondominiosSuperadmin() {
  const sessao = sessaoAtual();
  const [condominios, setCondominios] = useState<CondominioDetalhado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // Modal Novo / Edição
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [formNome, setFormNome] = useState('');
  const [formRazaoSocial, setFormRazaoSocial] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [slugEditadoManualmente, setSlugEditadoManualmente] = useState(false);
  const [formEndereco, setFormEndereco] = useState('');
  const [formCidade, setFormCidade] = useState('Ponta Grossa');
  const [formUf, setFormUf] = useState('PR');
  const [formCep, setFormCep] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const carregarCondominios = async () => {
    try {
      setCarregando(true);
      const dados = await api.get<CondominioDetalhado[]>('/superadmin/condominios');
      setCondominios(dados);
      setErro('');
    } catch (e: any) {
      setErro(e.message || 'Falha ao carregar lista de condomínios.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarCondominios();
  }, []);

  const gerarSlugDeNome = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormNome(val);
    if (!slugEditadoManualmente && !editandoId) {
      setFormSlug(gerarSlugDeNome(val));
    }
  };

  const abrirModalCriar = () => {
    setEditandoId(null);
    setFormNome('');
    setFormRazaoSocial('');
    setFormCnpj('');
    setFormSlug('');
    setSlugEditadoManualmente(false);
    setFormEndereco('');
    setFormCidade('Ponta Grossa');
    setFormUf('PR');
    setFormCep('');
    setFormTelefone('');
    setFormEmail('');
    setModalAberto(true);
  };

  const abrirModalEditar = (c: CondominioDetalhado) => {
    setEditandoId(c.id_condominio);
    setFormNome(c.nome);
    setFormRazaoSocial(c.razao_social || '');
    setFormCnpj(c.cnpj || '');
    setFormSlug(c.slug);
    setSlugEditadoManualmente(true);
    setFormEndereco(c.endereco_completo || '');
    setFormCidade(c.cidade || 'Ponta Grossa');
    setFormUf(c.uf || 'PR');
    setFormCep(c.cep || '');
    setFormTelefone(c.telefone_contato || '');
    setFormEmail(c.email_contato || '');
    setModalAberto(true);
  };

  const handleSalvarCondominio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Informe o nome do condomínio.');
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        nome: formNome.trim(),
        razao_social: formRazaoSocial.trim() || undefined,
        cnpj: formCnpj.trim() || undefined,
        slug: formSlug.trim() || undefined,
        endereco_completo: formEndereco.trim() || undefined,
        cidade: formCidade.trim(),
        uf: formUf.trim().toUpperCase(),
        cep: formCep.trim() || undefined,
        telefone_contato: formTelefone.trim() || undefined,
        email_contato: formEmail.trim() || undefined,
      };

      if (editandoId) {
        await api.put(`/superadmin/condominios/${editandoId}`, payload);
        setSucesso(`Condomínio "${formNome}" atualizado com sucesso!`);
      } else {
        await api.post('/superadmin/condominios', payload);
        setSucesso(`Condomínio "${formNome}" cadastrado com sucesso com Bloco A inicial criado!`);
      }

      setModalAberto(false);
      await carregarCondominios();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar condomínio.');
    } finally {
      setSalvando(false);
    }
  };

  const handleAlternarStatus = async (c: CondominioDetalhado) => {
    if (c.id_condominio === 1 && c.ativo) {
      alert('O condomínio principal OASIS (ID 1) não pode ser desativado.');
      return;
    }
    const novoStatus = !c.ativo;
    try {
      await api.patch(`/superadmin/condominios/${c.id_condominio}/status`, { ativo: novoStatus });
      await carregarCondominios();
    } catch (err: any) {
      alert(err.message || 'Falha ao alterar status do condomínio.');
    }
  };

  const handleAcessarCondominio = async (c: CondominioDetalhado) => {
    try {
      await alternarCondominio(c.id_condominio);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Erro ao alternar para este condomínio.');
    }
  };

  const idCondominioAtivo = sessao?.condominio?.id_condominio || 1;
  const totalUnidades = condominios.reduce((acc, c) => acc + (c.total_unidades || 0), 0);
  const totalMoradores = condominios.reduce((acc, c) => acc + (c.total_moradores || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Titulo
        icone={<Icone nome="building" className="h-6 w-6" />}
        sub="Cadastre e gerencie múltiplos condomínios contratantes na arquitetura SaaS do OASIS."
        ajudaKey="/superadmin/condominios"
        acao={
          <Botao
            type="button"
            variante="primario"
            onClick={abrirModalCriar}
            className="flex items-center gap-2 shadow-sm"
          >
            <Icone nome="plus" className="w-4 h-4" />
            <span>Novo Condomínio</span>
          </Botao>
        }
      >
        Gestão de Condomínios (Multi-Tenancy)
      </Titulo>

      {erro && <Mensagem tipo="erro" texto={erro} aoFechar={() => setErro('')} />}
      {sucesso && <Mensagem tipo="ok" texto={sucesso} aoFechar={() => setSucesso('')} />}

      {/* Cards Indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Cartao className="p-4 rounded-2xl border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Condomínios</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{condominios.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Hospedados na plataforma</p>
        </Cartao>

        <Cartao className="p-4 rounded-2xl border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ativos</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
            {condominios.filter((c) => c.ativo).length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Operando normalmente</p>
        </Cartao>

        <Cartao className="p-4 rounded-2xl border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total de Apartamentos</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalUnidades}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Em todos os prédios</p>
        </Cartao>

        <Cartao className="p-4 rounded-2xl border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Moradores Ativos</span>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalMoradores}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Usuários cadastrados</p>
        </Cartao>
      </div>

      {/* Grid de Condomínios */}
      {carregando ? (
        <div className="py-16 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-navy dark:border-sky-400 mb-3" />
          <p className="text-sm">Carregando condomínios cadastrados...</p>
        </div>
      ) : condominios.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-8">
          <Icone nome="building" className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Nenhum condomínio cadastrado</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {condominios.map((c) => {
            const ehAtivoNaSessao = c.id_condominio === idCondominioAtivo;

            return (
              <Cartao
                key={c.id_condominio}
                className={`p-5 rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                  ehAtivoNaSessao
                    ? 'border-navy dark:border-sky-500 ring-2 ring-navy/20 dark:ring-sky-500/20 bg-navy-50/20 dark:bg-slate-800/40 shadow-md'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      ID #{c.id_condominio}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ehAtivoNaSessao && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                          Condomínio Ativo
                        </span>
                      )}
                      <Badge tipo={c.ativo ? 'sucesso' : 'neutro'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight mb-1">
                    {c.nome}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono mb-3">/{c.slug}</p>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Localização:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {c.cidade} - {c.uf}
                      </strong>
                    </div>
                    {c.cnpj && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">CNPJ:</span>
                        <strong className="font-mono text-slate-700 dark:text-slate-200">{c.cnpj}</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Blocos / Aptos:</span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        {c.total_blocos} bloco(s) • {c.total_unidades} aptos
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Moradores:</span>
                      <strong className="text-slate-700 dark:text-slate-200">{c.total_moradores} cadastrados</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModalEditar(c)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 p-1"
                  >
                    <Icone nome="edit" className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAlternarStatus(c)}
                      className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${
                        c.ativo
                          ? 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'
                          : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800'
                      }`}
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>

                    <Botao
                      type="button"
                      variante={ehAtivoNaSessao ? 'secundario' : 'primario'}
                      disabled={ehAtivoNaSessao}
                      onClick={() => handleAcessarCondominio(c)}
                      className="text-xs"
                    >
                      {ehAtivoNaSessao ? 'Selecionado' : 'Acessar'}
                    </Botao>
                  </div>
                </div>
              </Cartao>
            );
          })}
        </div>
      )}

      {/* Modal: Novo / Editar Condomínio */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-navy-50 text-navy dark:bg-slate-800 dark:text-sky-400 rounded-lg">
                  <Icone nome="building" className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                    {editandoId ? 'Editar Condomínio' : 'Novo Condomínio Contratante'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editandoId
                      ? 'Atualize os dados cadastrais da entidade'
                      : 'Crie uma nova instância isolada de condomínio'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icone nome="x" className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarCondominio} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Nome do Condomínio *
                </label>
                <input
                  type="text"
                  value={formNome}
                  onChange={handleNomeChange}
                  placeholder="Ex.: Edifício Solar das Palmeiras"
                  className={inputCls}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Slug / Identificador URL *
                  </label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => {
                      setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugEditadoManualmente(true);
                    }}
                    placeholder="ex: solar-das-palmeiras"
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Razão Social (Opcional)
                </label>
                <input
                  type="text"
                  value={formRazaoSocial}
                  onChange={(e) => setFormRazaoSocial(e.target.value)}
                  placeholder="Ex.: Condomínio do Edifício Solar das Palmeiras"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Endereço Completo (Opcional)
                </label>
                <input
                  type="text"
                  value={formEndereco}
                  onChange={(e) => setFormEndereco(e.target.value)}
                  placeholder="Ex.: Rua das Flores, 123 - Centro"
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={formCidade}
                    onChange={(e) => setFormCidade(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formUf}
                    onChange={(e) => setFormUf(e.target.value.toUpperCase())}
                    className={inputCls}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={(e) => setFormTelefone(e.target.value)}
                    placeholder="(42) 3333-0000"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                    E-mail do Condomínio
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contato@condominio.com"
                    className={inputCls}
                  />
                </div>
              </div>

              {!editandoId && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <strong>Estruturação Automática:</strong> Ao criar este condomínio, o <em>Bloco A</em> será
                  configurado automaticamente para que você já possa adicionar andares e apartamentos.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Botao
                  type="button"
                  variante="secundario"
                  onClick={() => setModalAberto(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Botao>
                <Botao type="submit" variante="primario" disabled={salvando}>
                  {salvando ? 'Salvando...' : editandoId ? 'Atualizar Condomínio' : 'Criar Condomínio'}
                </Botao>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
