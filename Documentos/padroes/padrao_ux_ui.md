# Padrão de UX/UI e Design System — Sistema OASIS

Este documento define as diretrizes obrigatórias de Experiência do Usuário (UX), Interface Visual (UI), componentes reutilizáveis e comportamento de telas do **OASIS**. 

> **Regra Fundamental de Desenvolvimento:**  
> Sempre que uma nova funcionalidade, tela, modal ou listagem for criada no OASIS, ela **deve obrigatoriamente seguir a mesma identidade visual, estrutura e padrões já consolidados** no restante da aplicação. Nunca reinvente componentes que já existem em `frontend/src/components/ui.tsx`.

---

## 1. Princípios Gerais de Design

1. **Consistência Visual e Cognitiva**: O usuário deve ter a mesma experiência e previsibilidade em qualquer módulo (Morador, Porteiro, Síndico ou Superadmin).
2. **Profissionalismo e Sobriedade**: O OASIS é um sistema de governança condominial, controle de acesso e auditoria predial. 
   - **Proibido o uso de emojis coloridos/informais** em botões, tabelas e cabeçalhos corporativos.
   - Utilize exclusivamente a biblioteca de ícones vetoriais SVG fornecida pelo componente `<Icone nome="..." />`.
3. **Suporte Completo a Dark Mode**: Todo elemento, fundo, borda, texto ou hover deve possuir suporte tanto ao tema claro quanto ao tema escuro (`dark:` do Tailwind).
4. **Responsividade Garantida**: Telas e tabelas devem funcionar com fluidez desde smartphones até monitores widescreen (breakpoints `sm:`, `md:`, `lg:`, `xl:`).
5. **Prevenção de Erros**: Ações destrutivas (exclusão, inativação, cancelamento) exigem confirmação explícita via `<ModalConfirmacao />`.

---

## 2. Tokens de Design e Paleta de Cores

O OASIS utiliza uma paleta elegante baseada em tons marítimos/corporativos (*Navy*) combinados com a escala neutra *Slate* e cores semânticas bem calibradas:

### 2.1 Cores Principais e de Superfície
| Token / Cor | Tailwind Claro | Tailwind Escuro | Aplicação |
| :--- | :--- | :--- | :--- |
| **Navy Principal** | `bg-navy` (`#0A2540`) | `dark:bg-sky-600` | Botões primários, cabeçalhos de destaque, estados ativos |
| **Navy Hover** | `hover:bg-navy-light` | `dark:hover:bg-sky-500` | Interação de hover nos botões primários |
| **Fundo de Página** | `bg-slate-50` | `dark:bg-slate-950` | Fundo geral da aplicação e layout |
| **Fundo de Cards/Modais** | `bg-white` | `dark:bg-slate-900` | Superfície de cartões, formulários e janelas |
| **Bordas Padrão** | `border-slate-200/80` | `dark:border-slate-800` | Divisórias, inputs, tabelas e containers |
| **Bordas Suaves** | `border-slate-100` | `dark:border-slate-800/60` | Divisões internas de cards e cabeçalhos |

### 2.2 Cores Semânticas
| Semântica | Fundo / Badge | Texto / Ícone | Borda | Aplicação |
| :--- | :--- | :--- | :--- | :--- |
| **Sucesso** | `bg-emerald-50` (`dark:bg-emerald-950/50`) | `text-emerald-700` (`dark:text-emerald-300`) | `border-emerald-200/80` | Ativo, Concluído, Pago, Residente, Disponível |
| **Aviso** | `bg-amber-50` (`dark:bg-amber-950/50`) | `text-amber-800` (`dark:text-amber-300`) | `border-amber-200/80` | Emprestado, Pendente, Não Residente, Atenção |
| **Perigo / Erro** | `bg-red-50` (`dark:bg-rose-950/50`) | `text-red-700` (`dark:text-rose-300`) | `border-red-200/80` | Inativo, Cancelado, Atrasado (+24h), Exclusão, Penalidade |
| **Informativo** | `bg-sky-50` (`dark:bg-sky-950/50`) | `text-sky-700` (`dark:text-sky-300`) | `border-sky-200/80` | Agendada, Em Andamento, Informativo geral |
| **Neutro** | `bg-slate-100` (`dark:bg-slate-800`) | `text-slate-600` (`dark:text-slate-300`) | `border-slate-200/80` | Histórico antigo, Não informado, Rótulo neutro |

### 2.3 Badges de Perfis e Vínculos
Para identificar claramente os papéis das pessoas no condomínio, utilize o padrão visual consolidado:
- **Administrador / Síndico**: Badge Índigo (`bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300`)
- **Morador Titular / Proprietário**: Badge Azul (`bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300`)
- **Morador Inquilino**: Badge Esmeralda (`bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`)
- **Dependente**: Badge Púrpura (`bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300`)
- **Porteiro / Funcionário**: Badge Âmbar (`bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300`)
- **Visitante**: Badge Ciano (`bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300`)
- **Prestador de Serviço**: Badge Laranja (`bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300`)

---

## 3. Padrão Obrigatório de Tabelas e Listagens

Toda listagem de dados no OASIS com potencial de crescimento (usuários, encomendas, chaves, reservas, avisos, unidades, etc.) **deve obrigatoriamente seguir a seguinte estrutura**:

```
+--------------------------------------------------------------------------+
|  Titulo da Página (Ícone + Nome da Tela + Subtítulo explicativo)        |
+--------------------------------------------------------------------------+
|  [Cartao]                                                                |
|  +--------------------------------------------------------------------+  |
|  | BARRA DE FILTROS & BUSCA:                                          |  |
|  | [Campo de Busca: Nome, CPF, Apto...]  [Abas: Todos | Ativos | ...] |  |
|  | [Botão Limpar Filtros (quando ativo)]                              |  |
|  +--------------------------------------------------------------------+  |
|  | TABELA (com overflow horizontal):                                  |  |
|  | Coluna A (⇅) | Coluna B (⇅) | Status | Ações (à direita)          |  |
|  | ------------------------------------------------------------------ |  |
|  | Registro 1    | Registro 1   | [Ativo] | [Opções / Ações]           |  |
|  | Registro 2    | Registro 2   | [Ativo] | [Opções / Ações]           |  |
|  | ------------------------------------------------------------------ |  |
|  | PAGINAÇÃO:                                                         |  |
|  | Exibindo 1 a 20 de 85 registros         [Anterior] [1] [2] [Próx]  |  |
|  +--------------------------------------------------------------------+  |
+--------------------------------------------------------------------------+
```

### 3.1 Regras de Implementação de Tabelas
1. **Sempre Paginada**: A paginação padrão é de **20 registros por página** (`const ITENS_POR_PAGINA = 20;`), utilizando o componente `<Paginacao />`.
2. **Barra de Filtros**:
   - Campo de busca por texto com `inputCls` e placeholder explicativo.
   - Botões de filtro rápido / abas em pílula (ex.: `Todos`, `Ativos`, `Inativos` ou `Aguardando`, `Entregues`).
   - Botão **"Limpar Filtros"** exibido dinamicamente sempre que houver algum filtro preenchido.
   - Ao alterar qualquer filtro ou busca, resetar a página atual para 1 (`setPagina(1)`).
3. **Cabeçalho Ordenável**:
   - Os cabeçalhos de coluna que suportam ordenação devem ter `select-none cursor-pointer`, hover suave e ícones de ordenação (`▲`, `▼`, `⇅`).
4. **Hierarquia de Dados nas Células**:
   - Nome / Dado Principal: `font-bold text-sm text-slate-900 dark:text-slate-100`.
   - Dado Secundário (E-mail, Contato, Detalhes): `text-xs text-slate-500 dark:text-slate-400`.
   - Dados Técnicos / Códigos / CPF: `font-mono text-xs text-slate-600 dark:text-slate-300`.
5. **Alinhamento da Coluna de Ações**:
   - A coluna de ações deve ficar **sempre à direita** (`text-right`), com botões alinhados em `flex justify-end gap-1.5`.
   - Se houver mais de 2 ações, agrupar em um menu suspenso (`Opções` ou `Mais Ações`).
6. **Estado Vazio (`<EmptyState />`)**:
   - Se a busca não retornar nada, exibir mensagem orientando o ajuste dos filtros com botão para limpar filtros.
   - Se não houver nenhum cadastro no banco, exibir mensagem orientando o primeiro cadastro com botão para abrir o modal de criação.

### 3.2 Código de Referência para Tabelas Paginadas

```tsx
import { useState, useMemo } from 'react';
import { Cartao, Titulo, Icone, Badge, Botao, EmptyState, Paginacao, inputCls } from '../../components/ui';

export default function ExemploListagem() {
  const [itens, setItens] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [colunaOrdenada, setColunaOrdenada] = useState<string>('nome');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('asc');
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 20;

  // 1. Filtragem dos registros
  const itensFiltrados = useMemo(() => {
    return itens.filter(item => {
      if (filtroStatus === 'ATIVOS' && !item.ativo) return false;
      if (filtroStatus === 'INATIVOS' && item.ativo) return false;
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim();
        return item.nome.toLowerCase().includes(termo) || (item.identificador || '').includes(termo);
      }
      return true;
    });
  }, [itens, busca, filtroStatus]);

  // 2. Ordenação
  const itensOrdenados = useMemo(() => {
    return [...itensFiltrados].sort((a, b) => {
      const valA = (a[colunaOrdenada] || '').toString().toLowerCase();
      const valB = (b[colunaOrdenada] || '').toString().toLowerCase();
      return direcaoOrdenacao === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [itensFiltrados, colunaOrdenada, direcaoOrdenacao]);

  // 3. Paginação
  const totalRegistros = itensOrdenados.length;
  const totalPaginas = Math.ceil(totalRegistros / ITENS_POR_PAGINA) || 1;
  const paginaValida = Math.min(Math.max(1, pagina), totalPaginas);
  const itensPaginados = itensOrdenados.slice((paginaValida - 1) * ITENS_POR_PAGINA, paginaValida * ITENS_POR_PAGINA);

  const temFiltroAtivo = Boolean(busca.trim() || filtroStatus !== 'TODOS');

  function limparFiltros() {
    setBusca('');
    setFiltroStatus('TODOS');
    setPagina(1);
  }

  function alternarOrdenacao(coluna: string) {
    if (colunaOrdenada === coluna) {
      setDirecaoOrdenacao(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setColunaOrdenada(coluna);
      setDirecaoOrdenacao('asc');
    }
  }

  return (
    <div className="space-y-6">
      <Titulo
        sub="Gerenciamento e consulta dos registros com filtros e paginação."
        icone={<Icone nome="layers" className="h-5 w-5" />}
        acao={
          <Botao variante="primario" tamanho="sm" icone={<Icone nome="plus" className="h-4 w-4" />}>
            Novo Registro
          </Botao>
        }
      >
        Título da Funcionalidade
      </Titulo>

      <Cartao>
        {/* Barra Superior de Filtros */}
        <div className="mb-4 space-y-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Icone nome="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Pesquisar por nome ou código..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPagina(1); }}
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['TODOS', 'ATIVOS', 'INATIVOS'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => { setFiltroStatus(st); setPagina(1); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    filtroStatus === st
                      ? 'bg-navy text-white shadow-xs dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {st === 'TODOS' ? 'Todos' : st === 'ATIVOS' ? 'Ativos' : 'Inativos'}
                </button>
              ))}
            </div>
          </div>

          {temFiltroAtivo && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Filtros ativos: exibindo {totalRegistros} resultado(s)</span>
              <button
                type="button"
                onClick={limparFiltros}
                className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                <Icone nome="x" className="h-3.5 w-3.5" />
                Limpar Filtros
              </button>
            </div>
          )}
        </div>

        {/* Listagem / Tabela */}
        {totalRegistros === 0 ? (
          <EmptyState
            icone="search"
            titulo="Nenhum registro encontrado"
            descricao={temFiltroAtivo ? "Tente ajustar os termos de busca para expandir os resultados." : "Nenhum dado cadastrado até o momento."}
            acao={temFiltroAtivo ? (
              <Botao variante="claro" tamanho="sm" onClick={limparFiltros}>Limpar Filtros</Botao>
            ) : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th onClick={() => alternarOrdenacao('nome')} className="py-2.5 px-3 select-none cursor-pointer">
                      Nome {colunaOrdenada === 'nome' ? (direcaoOrdenacao === 'asc' ? '▲' : '▼') : '⇅'}
                    </th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {itensPaginados.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 dark:text-slate-100">{item.nome}</p>
                        <p className="text-xs text-slate-500">{item.descricao}</p>
                      </td>
                      <td className="py-3 px-3">
                        <Badge tipo={item.ativo ? 'sucesso' : 'perigo'}>
                          {item.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Botao variante="claro" tamanho="sm" icone={<Icone nome="edit" className="h-3.5 w-3.5" />}>
                          Editar
                        </Botao>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação Obrigatória */}
            <Paginacao
              paginaAtual={paginaValida}
              totalRegistros={totalRegistros}
              itensPorPagina={ITENS_POR_PAGINA}
              aoMudarPagina={setPagina}
            />
          </>
        )}
      </Cartao>
    </div>
  );
}
```

---

## 4. Padrão Obrigatório de Formulários

1. **Agrupamento com `<Campo>`**: Todo input deve ser envolvido pelo componente `<Campo>`, informando o rótulo descritivo (`rotulo`), se é obrigatório (`obrigatorio`) e orientações auxiliares (`ajuda` ou `dica`).
2. **Estilização com `inputCls`**: Utilizar sempre o utilitário `inputCls` para inputs textuais, datas, seletores (`<select>`) e textareas.
3. **Máscaras Dinâmicas**:
   - CPF: `mascararCPF(valor)` (formato estrito `000.000.000-00`).
   - Celular/WhatsApp: `mascararCelular(valor)` (formato estrito `(00) 00000-0000`).
4. **Prevenção de Duplo Envio**: Botões de submit devem receber a prop `carregando={salvando}`, exibindo spinner visual e desabilitando o clique concorrente.
5. **Erros de Validação**:
   - Mensagens de validação de formulário devem aparecer em destaque vermelho logo acima dos botões de ação ou através do componente flutuante `<Mensagem tipo="erro" />`.

---

## 5. Padrão Obrigatório de Modais e Diálogos

1. **Bloqueio de Fundo e Escape**: O componente `<Modal>` já gerencia automaticamente a trava de scroll do `<body>` (`useTravamentoModal`) e fechamento seguro na tecla `Escape`.
2. **Larguras Padronizadas**:
   - `max-w-md`: Confirmações simples, alertas, baixas de encomendas.
   - `max-w-lg`: Formulários de cadastro padrão (chaves, áreas comuns, avisos).
   - `max-w-xl`: Modais ricos em detalhes (ex.: `ModalPerfilUsuario`).
   - `max-w-2xl`: Modais de visualização estrutural complexa (ex.: detalhes de apartamento e moradores).
3. **Rodapé Padronizado (`rodape`)**:
   - Botão **Fechar / Cancelar** com variante neutra (`variante="claro"` ou `variante="secundario"`).
   - Botão **Ação Principal / Salvar** com `variante="primario"` ou `variante="perigo"` (se destrutivo), posicionado à direita.
4. **Reutilização Estrita de Modais**:
   - Quando uma entidade for visualizada ou editada em múltiplos locais do sistema (ex.: perfil do usuário a partir da lista geral e a partir do apartamento na estrutura física), **utilize o mesmo componente compartilhado** (ex.: `ModalPerfilUsuario.tsx`) para evitar código duplicado e divergências visuais.

---

## 6. Padrão de Ações Críticas e Confirmações

Para qualquer exclusão física, cancelamento ou inativação:
- Utilize `<ModalConfirmacao />` com variante semântica correspondente:
  - Exclusão / Destruição de dados: `variante="perigo"`, `icone="alert"`.
  - Confirmação de operação importante: `variante="primario"`, `icone="check"`.
- Nunca utilize `window.confirm()` nativo do navegador; ele quebra a experiência do usuário e não respeita o tema visual.

---

## 7. Catálogo Rápido de Componentes (`components/ui.tsx`)

| Componente | Função Principal | Exemplo de Uso |
| :--- | :--- | :--- |
| `<Titulo>` | Cabeçalho padrão de página com título, subtítulo e ações | `<Titulo sub="Subtítulo..." icone={<Icone nome="key" />}>Chaves</Titulo>` |
| `<Cartao>` | Bloco container estilizado com sombra suave | `<Cartao destaque={false}>{conteudo}</Cartao>` |
| `<Botao>` | Botão interativo com variantes e spinner | `<Botao variante="primario" carregando={salvando}>Salvar</Botao>` |
| `<Campo>` | Container de label, asterisco de obrigatório e dica | `<Campo rotulo="CPF" obrigatorio>{input}</Campo>` |
| `<Badge>` | Pílula de status semântico com ponto indicador | `<Badge tipo="sucesso">Ativo</Badge>` |
| `<Modal>` | Janela modal acessível sobreposta com backdrop | `<Modal aberto={aberto} fechar={fechar} titulo="Editar">...</Modal>` |
| `<ModalConfirmacao>` | Diálogo de validação de ação crítica com ícone | `<ModalConfirmacao aberto={aberto} confirmar={excluir} ... />` |
| `<EmptyState>` | Ilustração/mensagem de lista ou busca vazia | `<EmptyState icone="users" titulo="Nenhum morador encontrado" />` |
| `<Paginacao>` | Controle de páginas para tabelas (20 itens/pág) | `<Paginacao paginaAtual={p} totalRegistros={total} aoMudarPagina={setP} />` |
| `<Mensagem>` | Notificação Toast flutuante com auto-fechamento | `<Mensagem texto="Salvo com sucesso!" tipo="ok" />` |
| `<Icone>` | Ícone vetorial SVG monocromático e consistente | `<Icone nome="home" className="h-4 w-4" />` |

---

## 8. Checklist de Qualidade UI/UX para Novas Telas

Antes de aprovar e commitar uma nova tela ou recurso, certifique-se de que todos os itens abaixo foram cumpridos:

- [ ] A tela possui cabeçalho padrão com `<Titulo>`, ícone e subtítulo explicativo.
- [ ] O conteúdo está encapsulado em `<Cartao>`.
- [ ] Listagens com múltiplos registros possuem **busca textual**, **filtros rápidos** e botão **"Limpar Filtros"**.
- [ ] A listagem possui **paginação padronizada** com `<Paginacao />` (máximo de 20 itens por página).
- [ ] Foi implementado o `<EmptyState />` para quando a lista estiver vazia ou os filtros não retornarem dados.
- [ ] Colunas de tabela possuem opção de ordenação clicável (`▲`, `▼`, `⇅`).
- [ ] Coluna de ações está alinhada à direita (`text-right`) com botões limpos.
- [ ] Formulários utilizam `<Campo>` com indicação explícita de campos obrigatórios (`*`).
- [ ] Inputs utilizam a classe utilitária `inputCls`.
- [ ] Botões de ação possuem estado `carregando={loading}` com spinner durante requisições de API.
- [ ] Ações destrutivas utilizam `<ModalConfirmacao />` em vez de `window.confirm()`.
- [ ] Não há emojis informais no corpo de tabelas ou botões; apenas ícones `<Icone />`.
- [ ] A interface foi validada em **Modo Claro** e **Modo Escuro (Dark Mode)**.
- [ ] O layout foi testado em telas menores (responsividade mobile).
