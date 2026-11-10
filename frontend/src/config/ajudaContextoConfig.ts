export interface PassoAjuda {
  passo: number;
  titulo: string;
  descricao: string;
  alvoSelector?: string;
}

export interface DuvidaFrequente {
  pergunta: string;
  resposta: string;
}

export interface AjudaTela {
  titulo: string;
  subtitulo: string;
  icone: string;
  resumo: string;
  temTourAnimado?: boolean;
  passoAPasso: PassoAjuda[];
  dicas: string[];
  duvidasFrequentes: DuvidaFrequente[];
}

export const AJUDA_CONFIG: Record<string, AjudaTela> = {
  // ----------------------------------------------------
  // GERAL / INÍCIO
  // ----------------------------------------------------
  '/inicio': {
    titulo: 'Página Inicial & Painel Geral',
    subtitulo: 'Sua central de controle rápido no condomínio',
    icone: 'home',
    temTourAnimado: true,
    resumo: 'Aqui você tem uma visão unificada de todas as atividades essenciais: encomendas para retirar, próximas reservas de áreas comuns, avisos recentes e chaves em sua posse.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Acompanhe os Cards de Resumo',
        descricao: 'No topo da tela, você visualiza rapidamente se tem encomendas aguardando, reservas ativas no dia ou novos comunicados no mural.',
        alvoSelector: '#tour-inicio-cards',
      },
      {
        passo: 2,
        titulo: 'Acesse Atalhos Rápidos',
        descricao: 'Clique nos cards temáticos (Reservar Espaço, Minhas Encomendas, Abrir Chamado, etc.) para ir diretamente à funcionalidade desejada.',
        alvoSelector: '#tour-inicio-atalhos, #tour-inicio-cards',
      },
      {
        passo: 3,
        titulo: 'Confira Atividades & Chaves',
        descricao: 'Se houver chaves de áreas comuns retiradas pela sua residência ou comunicados urgentes, eles aparecerão com alertas em tempo real.',
        alvoSelector: '#tour-inicio-atividades, #tour-inicio-cards',
      },
    ],
    dicas: [
      'As informações desta tela são sincronizadas automaticamente em tempo real.',
      'Você não precisa atualizar a página (F5) para ver quando uma encomenda chegar.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como alternar entre a visão de morador e administrador?',
        resposta: 'Se você possui múltiplos perfis cadastrados, o menu lateral permite acessar tanto as áreas de morador quanto a gestão do síndico.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: ABRIR E ACOMPANHAR CHAMADOS (/morador/chamados)
  // ----------------------------------------------------
  '/morador/chamados': {
    titulo: 'Como Abrir e Acompanhar Chamados',
    subtitulo: 'Canal particular para registro de avarias, limpeza e manutenções',
    icone: 'wrench',
    temTourAnimado: true,
    resumo: 'Registre ocorrências diretamente para a administração do condomínio com privacidade total por unidade habitacional. Seus vizinhos não têm acesso aos seus chamados.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Clique em "+ Abrir Novo Chamado"',
        descricao: 'No topo da página, clique no botão principal para abrir o formulário de abertura de ocorrência.',
        alvoSelector: '#tour-chamados-btn-novo',
      },
      {
        passo: 2,
        titulo: 'Indicadores de Acompanhamento',
        descricao: 'Confira a quantidade de chamados em análise, em andamento ou já resolvidos pela administração.',
        alvoSelector: '#tour-chamados-kpis, #tour-chamados-btn-novo',
      },
      {
        passo: 3,
        titulo: 'Acompanhe as Respostas em Tempo Real',
        descricao: 'Veja o histórico de mensagens, respostas oficiais da administração e status de resolução particular da sua unidade.',
        alvoSelector: '#tour-chamados-lista, #tour-chamados-kpis, #tour-chamados-btn-novo',
      },
    ],
    dicas: [
      'Privacidade total: Os chamados e as mensagens trocadas são visíveis unicamente para você e para a administração.',
      'Você pode enviar réplicas e mensagens adicionais a qualquer momento clicando no chamado na lista.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Outros moradores conseguem ver o que relatei?',
        resposta: 'Não. Os chamados e mensagens são particulares da sua unidade.',
      },
      {
        pergunta: 'O que significa o status "Em Andamento"?',
        resposta: 'Significa que a administração acolheu a solicitação e acionou a equipe de manutenção ou prestadores terceirizados para resolver.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: GESTÃO DE CHAMADOS (/sindico/chamados)
  // ----------------------------------------------------
  '/sindico/chamados': {
    titulo: 'Gestão e Triagem de Chamados',
    subtitulo: 'Acompanhamento centralizado e respostas particulares às unidades',
    icone: 'wrench',
    temTourAnimado: true,
    resumo: 'Gerencie todas as ocorrências abertas pelos moradores do condomínio, filtre por status e categoria, altere o ciclo de vida e envie orientações e respostas oficiais diretamente ao morador.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Triagem pelos Cards de Indicadores',
        descricao: 'Confira os cards no topo com a contagem de chamados "Aguardando Análise". Clique no card para filtrar rapidamente os itens pendentes.',
        alvoSelector: '#tour-sindico-chamados-triagem',
      },
      {
        passo: 2,
        titulo: 'Lista de Chamados das Unidades',
        descricao: 'Visualize o solicitante, o apartamento, a foto anexada e a descrição da ocorrência enviada pelo morador.',
        alvoSelector: '#tour-sindico-chamados-tabela, #tour-sindico-chamados-triagem',
      },
      {
        passo: 3,
        titulo: 'Atender, Responder e Atualizar Status',
        descricao: 'Clique no botão "Atender & Responder" para abrir a gaveta lateral, enviar orientações oficiais ao morador e marcar como Em Andamento ou Realizada.',
        alvoSelector: '#tour-sindico-chamados-atender, #tour-sindico-chamados-tabela, #tour-sindico-chamados-triagem',
      },
    ],
    dicas: [
      'Mantenha os chamados com status atualizado para que os moradores acompanhem a evolução e reduzam mensagens repetidas na portaria.',
      'Ao finalizar um chamado como "Realizada", a data e hora de fechamento são gravadas automaticamente para auditoria.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Onde o morador visualiza a minha resposta?',
        resposta: 'Na aba "Abrir Chamado" do painel do morador, dentro do histórico particular do chamado.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: NOVA RESERVA (/morador/reservar)
  // ----------------------------------------------------
  '/morador/reservar': {
    titulo: 'Como Fazer uma Reserva de Espaço',
    subtitulo: 'Guia passo a passo para agendar áreas de lazer e espaços comuns',
    icone: 'calendar',
    temTourAnimado: true,
    resumo: 'Agende salões de festas, churrasqueiras, quadras e demais espaços reservados do condomínio em 4 etapas simples, com validação instantânea de disponibilidade.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Escolha o Espaço Desejado',
        descricao: 'Clique no card da área comum que deseja utilizar (ex.: Churrasqueira, Salão de Festas, Espaço Gourmet). Espaços com taxa no boleto possuem aviso de valor.',
        alvoSelector: '#tour-passo-area',
      },
      {
        passo: 2,
        titulo: 'Selecione a Data no Calendário',
        descricao: 'Escolha o dia no calendário. Dias com bolinha possuem reservas ativas. Dias em cinza/bloqueados respeitam a antecedência mínima ou manutenções.',
        alvoSelector: '#tour-passo-calendario, #tour-passo-area',
      },
      {
        passo: 3,
        titulo: 'Escolha o Horário (Slot Livre)',
        descricao: 'Na coluna à direita, clique no horário verde ("LIVRE") desejado. Horários cinzas estão ocupados ou com antecedência mínima vencida.',
        alvoSelector: '#tour-passo-horarios, #tour-passo-calendario, #tour-passo-area',
      },
      {
        passo: 4,
        titulo: 'Informe Convidados e Confirme',
        descricao: 'Digite a quantidade estimada de pessoas respeitando o limite máximo da área e clique no botão verde "Confirmar Reserva".',
        alvoSelector: '#tour-passo-confirmar, #tour-passo-horarios, #tour-passo-area',
      },
    ],
    dicas: [
      'Espaços de Uso Livre (como academia ou piscina) não precisam de reserva prévia — consulte a aba "Espaços de Uso Livre".',
      'Fique atento ao prazo de cancelamento gratuito exibido no cabeçalho do espaço.',
      'Se o espaço tiver taxa de reserva, o valor será cobrado no próximo boleto de condomínio da sua unidade.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Por que não consigo selecionar um determinado dia?',
        resposta: 'O condomínio define antecedência mínima (ex.: pelo menos 24h ou 48h antes) e antecedência máxima (ex.: até 30 dias no futuro). Datas fora desse intervalo ficam desabilitadas.',
      },
      {
        pergunta: 'O que significa "Vaga Parcial Disp."?',
        resposta: 'Áreas que permitem mais de uma unidade simultaneamente (como academia) indicam que outra residência já agendou, mas ainda há vagas disponíveis para a sua.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: MINHAS RESERVAS (/morador/reservas)
  // ----------------------------------------------------
  '/morador/reservas': {
    titulo: 'Minhas Reservas',
    subtitulo: 'Consulte, acompanhe e cancele seus agendamentos',
    icone: 'calendar',
    temTourAnimado: true,
    resumo: 'Acompanhe o histórico de todas as reservas feitas pela sua residência, tanto as futuras (ativas) quanto as passadas ou canceladas.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Visualize suas Reservas Ativas',
        descricao: 'No topo da página, estão destacadas suas reservas confirmadas para as próximas datas com horário de início e término.',
        alvoSelector: '#tour-minhas-reservas-ativas',
      },
      {
        passo: 2,
        titulo: 'Cancelar Reserva no Prazo Gratuito',
        descricao: 'Caso não vá mais utilizar o espaço, clique em "Cancelar Reserva" dentro do prazo limite estipulado pelo condomínio (ex.: até 24h antes).',
        alvoSelector: '#tour-minhas-reservas-cancelar, #tour-minhas-reservas-historico, #tour-minhas-reservas-ativas',
      },
      {
        passo: 3,
        titulo: 'Histórico Completo de Utilizações',
        descricao: 'Role até o final da tela para auditar utilizações passadas ou cancelamentos anteriores.',
        alvoSelector: '#tour-minhas-reservas-historico, #tour-minhas-reservas-ativas',
      },
    ],
    dicas: [
      'Cancelar com antecedência libera a vaga imediatamente para outro vizinho que esteja na fila de espera.',
      'Reservas que já ultrapassaram o horário de início mudam automaticamente para status Concluída.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Até quando posso cancelar sem penalidade?',
        resposta: 'Cada área possui um prazo de cancelamento configurado pelo condomínio (geralmente 24h antes do início). Esse prazo é exibido no card da reserva.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: ENCOMENDAS (/morador/encomendas)
  // ----------------------------------------------------
  '/morador/encomendas': {
    titulo: 'Minhas Encomendas',
    subtitulo: 'Pacotes e correspondências recebidos na portaria',
    icone: 'package',
    temTourAnimado: true,
    resumo: 'Consulte todas as encomendas recebidas pela portaria para a sua unidade e veja quem retirou cada pacote.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Indicadores de Encomendas Aguardando',
        descricao: 'No topo, veja a contagem de pacotes aguardando retirada física na portaria do condomínio.',
        alvoSelector: '#tour-encomendas-kpis',
      },
      {
        passo: 2,
        titulo: 'Detalhes do Pacote & Remetente',
        descricao: 'Confira a data/hora de recebimento pelo porteiro, transportadora e descrição do pacote.',
        alvoSelector: '#tour-encomendas-lista, #tour-encomendas-kpis',
      },
      {
        passo: 3,
        titulo: 'Histórico de Entregas Retiradas',
        descricao: 'Após a retirada na portaria física, o histórico grava quem retirou e a data exata da baixa.',
        alvoSelector: '#tour-encomendas-historico, #tour-encomendas-lista, #tour-encomendas-kpis',
      },
    ],
    dicas: [
      'Você recebe um aviso imediato assim que a portaria dá entrada em uma nova encomenda para seu apartamento.',
      'Mantenha as notificações ativas para ser avisado sem precisar atualizar a página.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Um terceiro ou visitante pode retirar minha encomenda?',
        resposta: 'Sim, o porteiro pode registrar a entrega para um terceiro autorizado mediante identificação no momento da retirada.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: MURAL DE AVISOS (/mural)
  // ----------------------------------------------------
  '/mural': {
    titulo: 'Mural de Avisos & Comunicados',
    subtitulo: 'Fique por dentro das novidades e comunicados oficiais',
    icone: 'megaphone',
    temTourAnimado: true,
    resumo: 'Canal oficial de comunicação do condomínio. Aqui são publicados avisos sobre manutenções, assembleias, regras de convivência e avisos individuais.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Filtre por Categoria',
        descricao: 'Use os botões de filtro para visualizar comunicados gerais, avisos de obras ou comunicados urgentes.',
        alvoSelector: '#tour-mural-filtros',
      },
      {
        passo: 2,
        titulo: 'Leia os Comunicados Oficiais',
        descricao: 'Navegue pelos comunicados publicados pela administração. Comunicados não lidos possuem destaque visual.',
        alvoSelector: '#tour-mural-cards, #tour-mural-filtros',
      },
      {
        passo: 3,
        titulo: 'Marque como Lido',
        descricao: 'Clique no botão "Marcar como lido" no card do comunicado para atualizar seu contador de notificações.',
        alvoSelector: '#tour-mural-lido, #tour-mural-cards, #tour-mural-filtros',
      },
    ],
    dicas: [
      'Comunicados individuais (como avisos sobre veículos ou chaves) são visíveis apenas para a sua unidade.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como sei quando há um novo aviso?',
        resposta: 'Um indicador com contador vermelho aparece no menu lateral e no topo da tela inicial sempre que houver avisos não lidos.',
      },
    ],
  },

  // ----------------------------------------------------
  // MORADOR: DEPENDENTES / FAMÍLIA (/morador/familia)
  // ----------------------------------------------------
  '/morador/familia': {
    titulo: 'Gestão de Dependentes da Unidade',
    subtitulo: 'Cadastre familiares e moradores do seu apartamento',
    icone: 'users',
    temTourAnimado: true,
    resumo: 'Permite que o titular proprietário ou inquilino solicite o cadastro de dependentes e moradores do mesmo apartamento, gerando código de primeiro acesso.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Clique em "Novo Dependente"',
        descricao: 'Abra o formulário de cadastro de novo morador para sua unidade.',
        alvoSelector: '#tour-familia-btn-novo',
      },
      {
        passo: 2,
        titulo: 'Lista de Familiares Cadastrados',
        descricao: 'Consulte os dependentes registrados para sua residência com grau de parentesco e dados de contato.',
        alvoSelector: '#tour-familia-lista, #tour-familia-btn-novo',
      },
      {
        passo: 3,
        titulo: 'Status de Moderação & Código de Acesso',
        descricao: 'Acompanhe a aprovação do síndico. Assim que aprovado, entregue o código "OASIS-XXXXX" para o dependente criar sua senha.',
        alvoSelector: '#tour-familia-status, #tour-familia-lista, #tour-familia-btn-novo',
      },
    ],
    dicas: [
      'Apenas o titular proprietário ou titular inquilino tem permissão para cadastrar dependentes.',
      'O status de aprovação é atualizado em tempo real nesta tela assim que o síndico avalia a solicitação.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'O que o dependente pode fazer no sistema?',
        resposta: 'Dependentes aprovados podem consultar encomendas, ler avisos, fazer reservas de áreas comuns e consultar status de chaves.',
      },
    ],
  },

  // ----------------------------------------------------
  // PORTARIA: PAINEL PRINCIPAL (/portaria/painel)
  // ----------------------------------------------------
  '/portaria/painel': {
    titulo: 'Painel Geral da Portaria',
    subtitulo: 'Operação diária em tempo real da portaria',
    icone: 'home',
    temTourAnimado: true,
    resumo: 'Visão operacional consolidada para porteiros e operadores: quem está ocupando áreas comuns agora, encomendas pendentes e chaves em circulação.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Monitore as "Áreas Ocupadas Agora"',
        descricao: 'Veja quais moradores estão com reservas ativas neste exato momento, com contagem regressiva de minutos restantes.',
        alvoSelector: '#tour-portaria-ocupacao, #tour-portaria-registro',
      },
      {
        passo: 2,
        titulo: 'Registrar Visitante / Prestador',
        descricao: 'Clique no botão de ação rápida para registrar a entrada de visitantes ou entregadores com vinculação à unidade.',
        alvoSelector: '#tour-portaria-registro',
      },
      {
        passo: 3,
        titulo: 'Busca Rápida de Moradores & Unidades',
        descricao: 'Consulte moradores autorizados, telefone de contato e veículos pelo número do apartamento.',
        alvoSelector: '#tour-portaria-busca, #tour-portaria-registro',
      },
    ],
    dicas: [
      'Este painel se atualiza instantaneamente quando qualquer evento ocorre no condomínio, sem necessidade de recarregar a tela.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'O que fazer quando uma área comum encerra o horário?',
        resposta: 'O sistema encerra automaticamente a reserva ao término do horário contratado e remove o card de ocupação ativa.',
      },
    ],
  },

  // ----------------------------------------------------
  // PORTARIA: ENCOMENDAS (/portaria/encomendas)
  // ----------------------------------------------------
  '/portaria/encomendas': {
    titulo: 'Controle de Encomendas na Portaria',
    subtitulo: 'Entrada, armazenamento e baixa de entregas',
    icone: 'package',
    temTourAnimado: true,
    resumo: 'Gerencie a recepção e entrega de correspondências, pacotes dos correios e entregas de delivery para os apartamentos.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Registrar Nova Encomenda',
        descricao: 'Clique no botão "Registrar Encomenda", busque o morador ou apartamento destinatário, selecione o porte/tamanho e adicione uma descrição opcional.',
        alvoSelector: '#tour-portaria-encomenda-nova',
      },
      {
        passo: 2,
        titulo: 'Lista de Encomendas Aguardando Retirada',
        descricao: 'Consulte todas as encomendas armazenadas na portaria com o tempo em espera e apartamento de destino.',
        alvoSelector: '#tour-portaria-encomenda-lista, #tour-portaria-encomenda-nova',
      },
      {
        passo: 3,
        titulo: 'Dar Baixa na Retirada',
        descricao: 'Quando o morador vier buscar, clique em "Registrar Retirada", selecionando quem retirou para gravar a auditoria.',
        alvoSelector: '#tour-portaria-encomenda-entregar, #tour-portaria-encomenda-lista, #tour-portaria-encomenda-nova',
      },
    ],
    dicas: [
      'Use a barra de pesquisa rápida para filtrar encomendas por número de apartamento ou nome do morador.',
      'A lista prioriza sempre as encomendas "Aguardando Retirada" no topo.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como localizar pacotes antigos já retirados?',
        resposta: 'Alterne a aba ou filtro de status de "Aguardando" para "Histórico / Todas" para auditar retiradas antigas.',
      },
    ],
  },

  // ----------------------------------------------------
  // PORTARIA: CHAVES (/portaria/chaves)
  // ----------------------------------------------------
  '/portaria/chaves': {
    titulo: 'Controle de Chaves Físicas',
    subtitulo: 'Empréstimos, devoluções e rastreio de chaves',
    icone: 'key',
    temTourAnimado: true,
    resumo: 'Controle rigoroso de empréstimo de chaves das áreas comuns (salão de festas, academia, portões técnicos, churrasqueira) com registro do solicitante e tempo de posse.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Claviculário / Painel de Chaves',
        descricao: 'Localize a chave da área comum desejada e confira se está Disponível (verde) ou Em Posse (âmbar).',
        alvoSelector: '#tour-chaves-painel',
      },
      {
        passo: 2,
        titulo: 'Registrar Empréstimo',
        descricao: 'Clique em "Emprestar Chave", selecione o morador solicitante ou prestador de serviço e confirme a retirada.',
        alvoSelector: '#tour-chaves-emprestar, #tour-chaves-painel',
      },
      {
        passo: 3,
        titulo: 'Registrar Devolução',
        descricao: 'Assim que a chave for devolvida na portaria física, clique em "Registrar Devolução". A chave volta instantaneamente a ficar disponível.',
        alvoSelector: '#tour-chaves-devolver, #tour-chaves-emprestar, #tour-chaves-painel',
      },
    ],
    dicas: [
      'Chaves que ultrapassarem 24h em posse geram um alerta visual vermelho e enviam notificação automática ao morador.',
      'O histórico guarda o operador que entregou e o operador que recebeu a devolução para auditoria.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Posso emprestar uma chave para quem não possui reserva ativa?',
        resposta: 'Para áreas reserváveis que exigem agendamento, o sistema verifica a existência de reserva ativa no horário para segurança do condomínio.',
      },
    ],
  },

  // ----------------------------------------------------
  // PORTARIA: ÁREAS LIVRES (/portaria/areas-livres)
  // ----------------------------------------------------
  '/portaria/areas-livres': {
    titulo: 'Status de Áreas de Uso Livre',
    subtitulo: 'Controle de ocupação em tempo real de espaços sem agendamento',
    icone: 'clock',
    temTourAnimado: true,
    resumo: 'Acompanhe e alterne em tempo real o status de ocupação de espaços que não exigem reserva prévia (ex.: Piscina, Academia, Playground, Sauna).',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Verificar Situação Atual',
        descricao: 'Cada espaço exibe se está "LIVRE" (verde) ou "EM USO" (âmbar/azul), além da lotação permitida e horário de funcionamento.',
        alvoSelector: '#tour-areaslivres-cards',
      },
      {
        passo: 2,
        titulo: 'Alternar Status (Livre / Em Uso)',
        descricao: 'Ao notar entrada de moradores no espaço, a portaria pode clicar no botão de alternância para indicar que o local está ocupado.',
        alvoSelector: '#tour-areaslivres-alternar, #tour-areaslivres-cards',
      },
      {
        passo: 3,
        titulo: 'Detalhes de Lotação e Regras',
        descricao: 'Confira as regras específicas de cada espaço livre, horários permitidos e capacidade máxima de pessoas.',
        alvoSelector: '#tour-areaslivres-detalhes, #tour-areaslivres-cards',
      },
    ],
    dicas: [
      'A atualização de status de área livre reflete instantaneamente nas telas de todos os moradores conectados.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Qual a diferença entre Área Livre e Área Reservável?',
        resposta: 'Áreas Livres (como piscina ou academia) podem ser utilizadas livremente sem reserva prévia, enquanto Áreas Reserváveis (salão de festas, churrasqueira) exigem agendamento com data e horário fixos.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: PAINEL ADMINISTRATIVO (/sindico/painel)
  // ----------------------------------------------------
  '/sindico/painel': {
    titulo: 'Painel Geral do Condomínio & Relatórios',
    subtitulo: 'Visão executiva consolidada, receitas de áreas comuns e auditoria',
    icone: 'home',
    temTourAnimado: true,
    resumo: 'Acompanhe a governança do condomínio em padrão executivo: super cards de arrecadação financeira, agendamentos, chamados de manutenção, gráficos multi-mês, previsão de fluxo de caixa e exportação oficial de relatórios em PDF e CSV.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Super Cards de Desempenho Executivo',
        descricao: 'Acompanhe a arrecadação de áreas comuns (com variação % vs. mês anterior), taxa de resolução de chamados, ocupação e encomendas pendentes.',
        alvoSelector: '#tour-sindico-kpis',
      },
      {
        passo: 2,
        titulo: 'Filtro de Período e Exportação de Relatórios',
        descricao: 'Navegue entre os meses com as setas ou seletor e gere com um clique os relatórios oficiais em PDF (Geral e Cobrança de Áreas) e a planilha CSV para a administradora.',
        alvoSelector: '#tour-sindico-exportar, #tour-sindico-kpis',
      },
      {
        passo: 3,
        titulo: 'Gráficos Históricos e Projeção Futura',
        descricao: 'Visualize a evolução multi-mês de arrecadação e reservas, o donut de status e a projeção de receita confirmada para os próximos 90 dias.',
        alvoSelector: '#tour-sindico-graficos, #tour-sindico-kpis',
      },
      {
        passo: 4,
        titulo: 'Tabelas Analíticas e Espelho de Cobrança',
        descricao: 'Acesse o espelho contábil para lançamento em boleto das cotas condominiais, ranking das unidades com maior engajamento e histórico paginado de agendamentos.',
        alvoSelector: '#tour-sindico-tabelas, #tour-sindico-kpis',
      },
    ],
    dicas: [
      'Você pode exportar a planilha CSV para importar diretamente no sistema da sua administradora contábil sem digitação manual.',
      'O espelho de cobrança em PDF já traz os CPFs dos moradores devidamente mascarados para conformidade com a LGPD.',
      'Ao mudar o mês no seletor do topo, todos os cards, gráficos, projeções e downloads acompanham a competência selecionada.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como funciona o espelho de cobrança de taxas?',
        resposta: 'Ele consolida todas as reservas com taxa realizada no mês, com bloco, apartamento, morador, data e valor exato a ser lançado no boleto de cota.',
      },
      {
        pergunta: 'As reservas futuras aparecem no relatório do mês atual?',
        resposta: 'Não, elas são computadas na seção de Projeção Futura (próximos 90 dias) e na competência do mês em que o evento ocorrerá.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: GESTÃO DE PESSOAS (/sindico/pessoas)
  // ----------------------------------------------------
  '/sindico/pessoas': {
    titulo: 'Pessoas & Unidades do Condomínio',
    subtitulo: 'Controle de moradores, proprietários, prestadores e moderação',
    icone: 'users',
    temTourAnimado: true,
    resumo: 'Cadastre e edite moradores, proprietários e funcionários, vincule unidades, gerencie códigos de primeiro acesso e aprove novos dependentes.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Navegação por Abas',
        descricao: 'Alterne entre a listagem de Pessoas, a aba de Aprovações Pendentes e a Gestão Estrutural & Vagas.',
        alvoSelector: '#tour-pessoas-abas',
      },
      {
        passo: 2,
        titulo: 'Filtros e Busca Abrangente',
        descricao: 'Filtre por Bloco, Unidade, Papel (Morador, Inquilino, Proprietário, Porteiro) ou busque por Nome/CPF.',
        alvoSelector: '#tour-pessoas-filtros, #tour-pessoas-abas',
      },
      {
        passo: 3,
        titulo: 'Cadastrar Nova Pessoa',
        descricao: 'Clique no botão "+ Nova Pessoa", preencha os dados e vincule ao apartamento.',
        alvoSelector: '#tour-pessoas-btn-novo, #tour-pessoas-abas',
      },
      {
        passo: 4,
        titulo: 'Tabela de Pessoas e Ações de Perfil',
        descricao: 'Consulte o histórico, edite dados, gere códigos de ativação ou aplique restrições de segurança.',
        alvoSelector: '#tour-pessoas-tabela, #tour-pessoas-filtros, #tour-pessoas-abas',
      },
    ],
    dicas: [
      'Você pode inativar um usuário a qualquer momento sem perder seu histórico legal de reservas ou encomendas.',
      'O sistema impede a exclusão permanente de pessoas que já possuam registros históricos na portaria ou reservas.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como o morador cria a senha dele?',
        resposta: 'O morador acessa a tela de Login, clica em "Primeiro Acesso?", digita o CPF e o Código de Ativação fornecido pela administração e define sua senha.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: ABA APROVAÇÕES PENDENTES (/sindico/pessoas/aprovacoes)
  // ----------------------------------------------------
  '/sindico/pessoas/aprovacoes': {
    titulo: 'Moderação de Aprovações Pendentes',
    subtitulo: 'Validação de solicitações de dependentes e novos moradores',
    icone: 'users',
    temTourAnimado: true,
    resumo: 'Avalie e aprove solicitações de vínculo de novos moradores e dependentes enviados pelos titulares das unidades habitacionais.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Lista de Cadastros Aguardando Moderação',
        descricao: 'Confira os moradores que solicitaram entrada no sistema e aguardam validação do síndico.',
        alvoSelector: '#tour-aprovacoes-lista, #tour-pessoas-abas',
      },
      {
        passo: 2,
        titulo: 'Conferência de Vínculo com a Unidade',
        descricao: 'Verifique quem é o titular responsável pelo cadastro, o grau de parentesco e se a pessoa reside no imóvel.',
        alvoSelector: '#tour-aprovacoes-detalhes, #tour-aprovacoes-lista, #tour-pessoas-abas',
      },
      {
        passo: 3,
        titulo: 'Aprovar ou Rejeitar Solicitação',
        descricao: 'Clique em "Aprovar" para liberar o código de ativação OASIS-XXXXX ou "Rejeitar" justificando o motivo.',
        alvoSelector: '#tour-aprovacoes-botoes, #tour-aprovacoes-detalhes, #tour-aprovacoes-lista, #tour-pessoas-abas',
      },
    ],
    dicas: [
      'Ao aprovar um dependente, o titular da unidade é notificado em tempo real com o código de acesso para entrega.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'O que acontece ao recusar um cadastro?',
        resposta: 'A solicitação é arquivada e o morador titular pode submeter novamente com as correções solicitadas.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: ÁREAS COMUNS & REGRAS (/sindico/areas)
  // ----------------------------------------------------
  '/sindico/areas': {
    titulo: 'Configuração de Áreas Comuns',
    subtitulo: 'Regras de agendamento, horários, fotos e manutenções',
    icone: 'calendar',
    temTourAnimado: true,
    resumo: 'Configure todos os espaços comuns do condomínio: defina horários de funcionamento por dia da semana, capacidade de pessoas, antecedência de reserva e registre manutenções.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Cadastrar Nova Área Comum',
        descricao: 'Clique no botão "+ Nova Área Comum" para criar salões, churrasqueiras, quadras ou piscinas.',
        alvoSelector: '#tour-sindico-areas-nova',
      },
      {
        passo: 2,
        titulo: 'Lista de Espaços Cadastrados',
        descricao: 'Consulte todos os espaços com capacidade máxima, tipo de uso (Uso Livre vs Reserva) e fotos cadastradas.',
        alvoSelector: '#tour-sindico-areas-lista, #tour-sindico-areas-nova',
      },
      {
        passo: 3,
        titulo: 'Regras, Horários e Manutenções',
        descricao: 'Configure a grade de horários por dia da semana, antecedência mínima/máxima de agendamento e interdições para obras.',
        alvoSelector: '#tour-sindico-areas-regras, #tour-sindico-areas-lista, #tour-sindico-areas-nova',
      },
    ],
    dicas: [
      'Você pode enviar fotos em alta definição para cada espaço, que são otimizadas automaticamente em formato WebP.',
      'Se o espaço necessitar de chave física, ative "Exige Chave" para integrar ao módulo da portaria.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'O que acontece com reservas existentes ao agendar uma manutenção?',
        resposta: 'O sistema cancela as reservas conflitantes no período da obra e registra o motivo de manutenção para auditoria.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: PUBLICAR AVISO (/sindico/avisos)
  // ----------------------------------------------------
  '/sindico/avisos': {
    titulo: 'Publicação de Comunicados',
    subtitulo: 'Emita avisos gerais para o mural do condomínio',
    icone: 'megaphone',
    temTourAnimado: true,
    resumo: 'Crie e publique comunicados oficiais para todos os moradores do condomínio ou avisos direcionados.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Redigir Título, Categoria e Mensagem',
        descricao: 'Escreva um título claro e objetivo, selecione a categoria (Geral, Obras, Assembleia) e digite as orientações.',
        alvoSelector: '#tour-avisos-form',
      },
      {
        passo: 2,
        titulo: 'Definir o Escopo de Destinatários',
        descricao: 'Selecione se o aviso é visível a todos os blocos ou direcionado a uma torre específica.',
        alvoSelector: '#tour-avisos-alvo, #tour-avisos-form',
      },
      {
        passo: 3,
        titulo: 'Publicar Instantaneamente no Mural',
        descricao: 'Ao clicar em "Publicar Comunicado", a mensagem aparece em tempo real para os moradores sem necessidade de recarregar a tela.',
        alvoSelector: '#tour-avisos-enviar, #tour-avisos-form',
      },
    ],
    dicas: [
      'Moradores conectados recebem atualização em tempo real sem precisar recarregar o sistema.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Posso apagar um aviso já publicado?',
        resposta: 'Sim, o síndico autor pode excluir avisos a qualquer momento na listagem do mural.',
      },
    ],
  },

  // ----------------------------------------------------
  // SUPERADMIN: ESTRUTURA FÍSICA (/superadmin/estrutura)
  // ----------------------------------------------------
  '/superadmin/estrutura': {
    titulo: 'Estrutura Física & Vagas',
    subtitulo: 'Blocos, andares, apartamentos e garagens com m²',
    icone: 'layers',
    temTourAnimado: true,
    resumo: 'Configuração da malha física do condomínio: criação de blocos ou torres, andares, apartamentos e vagas de garagem demarcadas.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Cards de Resumo Estrutural',
        descricao: 'Confira os totais de blocos, unidades habitacionais, vagas totais e área construída de garagens.',
        alvoSelector: '#tour-super-estrutura-kpis',
      },
      {
        passo: 2,
        titulo: 'Ações Estruturais & Gerador em Lote',
        descricao: 'Utilize o "Gerador Estrutural em Lote" para erguer prédios inteiros automaticamente com regras de 4 aptos por andar.',
        alvoSelector: '#tour-super-estrutura-acoes, #tour-super-estrutura-kpis',
      },
      {
        passo: 3,
        titulo: 'Seletor de Blocos / Torres',
        descricao: 'Alterne entre os blocos cadastrados para visualizar a distribuição de apartamentos e garagens.',
        alvoSelector: '#tour-super-estrutura-blocos, #tour-super-estrutura-kpis',
      },
      {
        passo: 4,
        titulo: 'Grade de Andares, Aptos e Vagas',
        descricao: 'Gerencie cada unidade, adicione novos andares, vincule vagas de garagem com metragem e visualize moradores vinculados.',
        alvoSelector: '#tour-super-estrutura-andares, #tour-super-estrutura-blocos, #tour-super-estrutura-kpis',
      },
    ],
    dicas: [
      'A exclusão de blocos ou apartamentos vazios é permitida; unidades com moradores ativos exigem desvinculação prévia para segurança dos dados.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como funciona a numeração automática de apartamentos?',
        resposta: 'O sistema segue o padrão de 4 aptos por andar onde o prefixo numérico identifica o andar (ex: 51..54 = 5º andar; 101..104 = 10º andar).',
      },
    ],
  },

  // ----------------------------------------------------
  // SUPERADMIN: GESTÃO GLOBAL DE PESSOAS (/superadmin/pessoas)
  // ----------------------------------------------------
  '/superadmin/pessoas': {
    titulo: 'Gestão Global de Contas (Superadmin)',
    subtitulo: 'Administração de contas mestras e papéis de sistema',
    icone: 'users',
    temTourAnimado: true,
    resumo: 'Controle de privilégios elevados, contas técnicas e operadores em nível de infraestrutura.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Busca Global de Usuários',
        descricao: 'Pesquise por qualquer pessoa cadastrada na base do condomínio por nome, CPF ou papel.',
        alvoSelector: '#tour-super-pessoas-busca',
      },
      {
        passo: 2,
        titulo: 'Tabela de Contas e Credenciais',
        descricao: 'Verifique quais usuários possuem privilégios de Administrador, Porteiro ou Superadmin.',
        alvoSelector: '#tour-super-pessoas-tabela, #tour-super-pessoas-busca',
      },
      {
        passo: 3,
        titulo: 'Atribuição de Papéis & Auditoria',
        descricao: 'Nomeie novos síndicos, redefina senhas técnicas ou efetue bloqueios globais de segurança.',
        alvoSelector: '#tour-super-pessoas-papeis, #tour-super-pessoas-tabela, #tour-super-pessoas-busca',
      },
    ],
    dicas: [
      'A proteção de segurança do sistema nunca permite a exclusão ou inativação do último administrador ativo.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Quem pode acessar esta tela?',
        resposta: 'Apenas usuários autenticados com o perfil de Superadmin têm acesso a este módulo.',
      },
    ],
  },

  // ----------------------------------------------------
  // GESTÃO DE CONDOMÍNIOS (SUPERADMIN)
  // ----------------------------------------------------
  '/superadmin/condominios': {
    titulo: 'Gestão Multi-Condomínio',
    subtitulo: 'Cadastro e governança de instâncias da plataforma',
    icone: 'building',
    temTourAnimado: true,
    resumo: 'Painel central onde o Superadmin cadastra novos condomínios, audita instâncias ativas e alterna o contexto de trabalho com 1 clique.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Cadastrar Novo Condomínio',
        descricao: 'Clique no botão "+ Novo Condomínio", informe nome, identificador (slug), CNPJ, endereço e cidade.',
        alvoSelector: '#tour-super-condominios-novo',
      },
      {
        passo: 2,
        titulo: 'Cards de Condomínios Cadastrados',
        descricao: 'Consulte os condomínios gerenciados e alterne a instância ativa com 1 clique.',
        alvoSelector: '#tour-super-condominios-cards, #tour-super-condominios-novo',
      },
      {
        passo: 3,
        titulo: 'Ativação de Módulos Funcionais',
        descricao: 'Ative ou desative módulos individuais (Chamados, Portaria, Reservas, Chaves) conforme o contrato de cada condomínio.',
        alvoSelector: '#tour-super-condominios-modulos, #tour-super-condominios-cards, #tour-super-condominios-novo',
      },
    ],
    dicas: [
      'O identificador URL (slug) é gerado automaticamente a partir do nome e serve para distinguir cada condomínio de forma amigável.',
      'Você também pode alternar o condomínio ativo rapidamente pelo seletor no cabeçalho superior.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Os dados de moradores e blocos se misturam?',
        resposta: 'Não. Cada condomínio possui isolamento estrito de dados (multi-tenancy) a nível de banco de dados e APIs.',
      },
      {
        pergunta: 'Quem pode ver este painel?',
        resposta: 'Apenas usuários com a credencial global de SUPERADMIN.',
      },
    ],
  },
};

// Aliases para cobrir variações de chaves e rotas legadas
AJUDA_CONFIG['/morador/nova-reserva'] = AJUDA_CONFIG['/morador/reservar'];
AJUDA_CONFIG['nova-reserva'] = AJUDA_CONFIG['/morador/reservar'];
AJUDA_CONFIG['minhas-reservas'] = AJUDA_CONFIG['/morador/reservas'];
AJUDA_CONFIG['encomendas-morador'] = AJUDA_CONFIG['/morador/encomendas'];
AJUDA_CONFIG['/morador/dependentes'] = AJUDA_CONFIG['/morador/familia'];
AJUDA_CONFIG['dependentes'] = AJUDA_CONFIG['/morador/familia'];
AJUDA_CONFIG['/morador/mural'] = AJUDA_CONFIG['/mural'];
AJUDA_CONFIG['mural'] = AJUDA_CONFIG['/mural'];
AJUDA_CONFIG['/portaria'] = AJUDA_CONFIG['/portaria/painel'];
AJUDA_CONFIG['portaria-painel'] = AJUDA_CONFIG['/portaria/painel'];
AJUDA_CONFIG['portaria-encomendas'] = AJUDA_CONFIG['/portaria/encomendas'];
AJUDA_CONFIG['portaria-chaves'] = AJUDA_CONFIG['/portaria/chaves'];
AJUDA_CONFIG['portaria-areas-livres'] = AJUDA_CONFIG['/portaria/areas-livres'];
AJUDA_CONFIG['/sindico'] = AJUDA_CONFIG['/sindico/painel'];
AJUDA_CONFIG['sindico-painel'] = AJUDA_CONFIG['/sindico/painel'];
AJUDA_CONFIG['sindico-areas'] = AJUDA_CONFIG['/sindico/areas'];
AJUDA_CONFIG['sindico-pessoas'] = AJUDA_CONFIG['/sindico/pessoas'];
AJUDA_CONFIG['sindico-aprovacoes'] = AJUDA_CONFIG['/sindico/pessoas/aprovacoes'];
AJUDA_CONFIG['/sindico/publicar-aviso'] = AJUDA_CONFIG['/sindico/avisos'];
AJUDA_CONFIG['sindico-avisos'] = AJUDA_CONFIG['/sindico/avisos'];
AJUDA_CONFIG['superadmin-estrutura'] = AJUDA_CONFIG['/superadmin/estrutura'];
AJUDA_CONFIG['superadmin-pessoas'] = AJUDA_CONFIG['/superadmin/pessoas'];
AJUDA_CONFIG['superadmin-condominios'] = AJUDA_CONFIG['/superadmin/condominios'];

/** Função para obter a ajuda da tela atual com resolução precisa */
export function obterAjudaPorRota(pathname: string, chaveManual?: string): AjudaTela | null {
  if (chaveManual && AJUDA_CONFIG[chaveManual]) {
    return AJUDA_CONFIG[chaveManual];
  }

  // Tenta correspondência exata
  if (AJUDA_CONFIG[pathname]) {
    return AJUDA_CONFIG[pathname];
  }

  const rotaLimpa = pathname.split('?')[0].replace(/\/+$/, '');
  if (AJUDA_CONFIG[rotaLimpa]) {
    return AJUDA_CONFIG[rotaLimpa];
  }

  // Mapeamentos específicos por prefixo das rotas reais do App.tsx
  if (rotaLimpa.startsWith('/morador/chamados')) {
    return AJUDA_CONFIG['/morador/chamados'];
  }
  if (rotaLimpa.startsWith('/sindico/chamados')) {
    return AJUDA_CONFIG['/sindico/chamados'];
  }
  if (rotaLimpa.startsWith('/morador/reservar') || rotaLimpa.startsWith('/morador/nova-reserva')) {
    return AJUDA_CONFIG['/morador/reservar'];
  }
  if (rotaLimpa.startsWith('/morador/reservas')) {
    return AJUDA_CONFIG['/morador/reservas'];
  }
  if (rotaLimpa.startsWith('/morador/encomendas')) {
    return AJUDA_CONFIG['/morador/encomendas'];
  }
  if (rotaLimpa.startsWith('/morador/familia') || rotaLimpa.startsWith('/morador/dependentes')) {
    return AJUDA_CONFIG['/morador/familia'];
  }
  if (rotaLimpa.startsWith('/mural') || rotaLimpa.startsWith('/morador/mural')) {
    return AJUDA_CONFIG['/mural'];
  }
  if (rotaLimpa.startsWith('/portaria/painel') || rotaLimpa === '/portaria') {
    return AJUDA_CONFIG['/portaria/painel'];
  }
  if (rotaLimpa.startsWith('/portaria/areas-livres')) {
    return AJUDA_CONFIG['/portaria/areas-livres'];
  }
  if (rotaLimpa.startsWith('/portaria/encomendas')) {
    return AJUDA_CONFIG['/portaria/encomendas'];
  }
  if (rotaLimpa.startsWith('/portaria/chaves')) {
    return AJUDA_CONFIG['/portaria/chaves'];
  }
  if (rotaLimpa.startsWith('/sindico/painel') || rotaLimpa === '/sindico') {
    return AJUDA_CONFIG['/sindico/painel'];
  }
  if (rotaLimpa.startsWith('/sindico/areas')) {
    return AJUDA_CONFIG['/sindico/areas'];
  }
  if (rotaLimpa.startsWith('/sindico/pessoas/aprovacoes')) {
    return AJUDA_CONFIG['/sindico/pessoas/aprovacoes'];
  }
  if (rotaLimpa.startsWith('/sindico/pessoas')) {
    return AJUDA_CONFIG['/sindico/pessoas'];
  }
  if (rotaLimpa.startsWith('/sindico/avisos') || rotaLimpa.startsWith('/sindico/publicar-aviso')) {
    return AJUDA_CONFIG['/sindico/avisos'];
  }
  if (rotaLimpa.startsWith('/superadmin/condominios')) {
    return AJUDA_CONFIG['/superadmin/condominios'];
  }
  if (rotaLimpa.startsWith('/superadmin/estrutura')) {
    return AJUDA_CONFIG['/superadmin/estrutura'];
  }
  if (rotaLimpa.startsWith('/superadmin/pessoas')) {
    return AJUDA_CONFIG['/superadmin/pessoas'];
  }

  return AJUDA_CONFIG['/inicio'] || null;
}
