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
    resumo: 'Aqui você tem uma visão unificada de todas as atividades essenciais: encomendas para retirar, próximas reservas de áreas comuns, avisos recentes e chaves em sua posse.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Acompanhe os Cards de Resumo',
        descricao: 'No topo da tela, você visualiza rapidamente se tem encomendas aguardando, reservas ativas no dia ou novos comunicados no mural.',
      },
      {
        passo: 2,
        titulo: 'Acesse Atalhos Rápidos',
        descricao: 'Clique nos cards temáticos (Reservar Espaço, Minhas Encomendas, etc.) para ir diretamente à funcionalidade desejada.',
      },
      {
        passo: 3,
        titulo: 'Confira Chaves em Posse',
        descricao: 'Se houver chaves de áreas comuns retiradas pela sua residência, elas aparecerão com o tempo decorrido e alertas de devolução.',
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
    resumo: 'Registre ocorrências diretamente para a administração do condomínio com privacidade total por unidade habitacional. Seus vizinhos não têm acesso aos seus chamados.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Clique em "+ Abrir Novo Chamado"',
        descricao: 'No topo da página, clique no botão principal para abrir o formulário de abertura de ocorrência.',
      },
      {
        passo: 2,
        titulo: 'Escolha a Categoria e Detalhes',
        descricao: 'Selecione a categoria correspondente (Limpeza, Avaria / Quebrado, Manutenção, Convivência ou Outros), informe o título resumido e indique o local específico se aplicável.',
      },
      {
        passo: 3,
        titulo: 'Anexe uma Foto (Opcional)',
        descricao: 'Se desejar, envie uma foto do item quebrado ou da área que necessita de reparos para acelerar o diagnóstico da equipe.',
      },
      {
        passo: 4,
        titulo: 'Acompanhe as Respostas em Tempo Real',
        descricao: 'Quando a síndica ou administrador responder ou alterar o status para Em Andamento ou Realizada, a tela atualizará instantaneamente.',
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
    resumo: 'Gerencie todas as ocorrências abertas pelos moradores do condomínio, filtre por status e categoria, altere o ciclo de vida e envie orientações e respostas oficiais diretamente ao morador.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Triagem pelos Cards de Indicadores',
        descricao: 'Confira os cards no topo com a contagem de chamados "Aguardando Análise". Clique no card para filtrar rapidamente os itens pendentes.',
      },
      {
        passo: 2,
        titulo: 'Abra o Painel de Atendimento',
        descricao: 'Clique em "Atender & Responder" em qualquer chamado da lista para abrir a gaveta lateral com os dados completos e a foto enviada pelo morador.',
      },
      {
        passo: 3,
        titulo: 'Atualize o Status com 1 Clique',
        descricao: 'Alterne o status para "Em Andamento" ao acionar a equipe operacional, ou "Realizada" assim que o reparo for executado.',
      },
      {
        passo: 4,
        titulo: 'Envie Respostas Particulares',
        descricao: 'Utilize o campo de resposta na gaveta para orientar o morador sobre prazos e soluções. O morador é notificado em tempo real sem precisar de F5.',
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
        alvoSelector: '#tour-passo-calendario',
      },
      {
        passo: 3,
        titulo: 'Escolha o Horário (Slot Livre)',
        descricao: 'Na coluna à direita, clique no horário verde ("LIVRE") desejado. Horários cinzas estão ocupados ou com antecedência mínima vencida.',
        alvoSelector: '#tour-passo-horarios',
      },
      {
        passo: 4,
        titulo: 'Informe Convidados e Confirme',
        descricao: 'Digite a quantidade estimada de pessoas respeitando o limite máximo da área e clique no botão verde "Confirmar Reserva".',
        alvoSelector: '#tour-passo-confirmar',
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
    resumo: 'Acompanhe o histórico de todas as reservas feitas pela sua residência, tanto as futuras (ativas) quanto as passadas ou canceladas.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Visualize suas Reservas Ativas',
        descricao: 'No topo da página, estão destacadas suas reservas confirmadas para as próximas datas com horário de início e término.',
      },
      {
        passo: 2,
        titulo: 'Cancelar uma Reserva',
        descricao: 'Caso não vá mais utilizar o espaço, clique em "Cancelar Reserva" dentro do prazo limite estipulado pelo condomínio (ex.: até 24h antes).',
      },
      {
        passo: 3,
        titulo: 'Histórico Completo',
        descricao: 'Role até o final da tela para auditar utilizações passadas ou cancelamentos anteriores.',
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
    resumo: 'Consulte todas as encomendas recebidas pela portaria para a sua unidade e veja quem retirou cada pacote.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Verifique Encomendas Aguardando Retirada',
        descricao: 'Pacotes pendentes aparecem no topo com aviso em destaque, contendo a data/hora de recebimento pelo porteiro e descrição da embalagem.',
      },
      {
        passo: 2,
        titulo: 'Compareça à Portaria',
        descricao: 'Dirija-se à portaria física para retirar seu pacote. Qualquer morador da unidade pode retirar informando seu nome ao porteiro.',
      },
      {
        passo: 3,
        titulo: 'Confira o Histórico de Retiradas',
        descricao: 'Após a entrega, o status muda em tempo real para "RETIRADA", registrando o nome do recebedor e o porteiro de plantão.',
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
    resumo: 'Canal oficial de comunicação do condomínio. Aqui são publicados avisos sobre manutenções, assembleias, regras de convivência e avisos individuais.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Leia os Comunicados Oficiais',
        descricao: 'Navegue pelos comunicados publicados pela administração. Comunicados não lidos possuem destaque visual.',
      },
      {
        passo: 2,
        titulo: 'Marque como Lido',
        descricao: 'Clique no botão "Marcar como lido" no card do comunicado para atualizar seu contador de notificações.',
      },
      {
        passo: 3,
        titulo: 'Filtre por Categoria',
        descricao: 'Use os botões de filtro para visualizar comunicados gerais, avisos individuais ou mensagens urgentes.',
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
    resumo: 'Permite que o titular proprietário ou inquilino solicite o cadastro de dependentes e moradores do mesmo apartamento, gerando código de primeiro acesso.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Clique em "Novo Dependente"',
        descricao: 'Abra o formulário de cadastro de novo morador para sua unidade.',
      },
      {
        passo: 2,
        titulo: 'Preencha os Dados Obrigatórios',
        descricao: 'Informe o nome completo, CPF, data de nascimento, e-mail e grau de parentesco.',
      },
      {
        passo: 3,
        titulo: 'Aguarde a Aprovação do Síndico',
        descricao: 'Para segurança de todos, novos cadastros passam por moderação da administração. Assim que aprovado, o código de primeiro acesso é liberado.',
      },
      {
        passo: 4,
        titulo: 'Entregue o Código de Ativação',
        descricao: 'O dependente utilizará o código de ativação na tela de login para criar sua própria senha.',
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
    resumo: 'Visão operacional consolidada para porteiros e operadores: quem está ocupando áreas comuns agora, encomendas pendentes e chaves em circulação.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Monitore as "Áreas Ocupadas Agora"',
        descricao: 'Veja quais moradores estão com reservas ativas neste exato momento, com contagem regressiva de minutos restantes.',
      },
      {
        passo: 2,
        titulo: 'Acompanhe Alertas de Chaves (+24h)',
        descricao: 'Identifique imediatamente chaves que foram retiradas e ainda não foram devolvidas após o período regulamentar.',
      },
      {
        passo: 3,
        titulo: 'Acesse Ações Rápidas',
        descricao: 'Use os botões de ação rápida para Registrar Encomenda ou Emprestar Chave sem perder tempo de navegação.',
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
    resumo: 'Gerencie a recepção e entrega de correspondências, pacotes dos correios e entregas de delivery para os apartamentos.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Registrar Nova Encomenda',
        descricao: 'Clique no botão "Registrar Encomenda", busque o morador ou apartamento destinatário, selecione o porte/tamanho e adicione uma descrição opcional.',
      },
      {
        passo: 2,
        titulo: 'Notificação Automática',
        descricao: 'Ao salvar, o sistema dispara imediatamente uma notificação em tempo real no aplicativo do morador.',
      },
      {
        passo: 3,
        titulo: 'Dar Baixa na Retirada',
        descricao: 'Quando o morador ou terceiro autorizado vier buscar, localize o card e clique em "Registrar Retirada", selecionando quem retirou (próprio morador, familiar ou terceiro).',
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
    resumo: 'Controle rigoroso de empréstimo de chaves das áreas comuns (salão de festas, academia, portões técnicos, churrasqueira) com registro do solicitante e tempo de posse.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Registrar Empréstimo',
        descricao: 'Localize a chave da área com status "DISPONÍVEL" e clique em "Emprestar Chave". Selecione o morador solicitante ou prestador de serviço.',
      },
      {
        passo: 2,
        titulo: 'Acompanhar Posse',
        descricao: 'O card da chave passará a exibir o nome do responsável, apartamento e tempo decorrido desde a retirada.',
      },
      {
        passo: 3,
        titulo: 'Registrar Devolução',
        descricao: 'Assim que a chave for devolvida na portaria física, clique em "Registrar Devolução". A chave volta instantaneamente a ficar disponível.',
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
    resumo: 'Acompanhe e alterne em tempo real o status de ocupação de espaços que não exigem reserva prévia (ex.: Piscina, Academia, Playground, Sauna).',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Verificar Situação Atual',
        descricao: 'Cada espaço exibe se está "LIVRE" (verde) ou "EM USO" (âmbar/azul), além da lotação permitida e horário de funcionamento.',
      },
      {
        passo: 2,
        titulo: 'Alternar Status (Livre / Em Uso)',
        descricao: 'Ao notar entrada de moradores no espaço, a portaria pode clicar no botão de alternância para indicar que o local está ocupado.',
      },
      {
        passo: 3,
        titulo: 'Adicionar Observações',
        descricao: 'É possível registrar uma observação rápida (ex.: "Aula de natação até 11h" ou "Limpeza de rotina").',
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
    titulo: 'Painel do Síndico / Gestão',
    subtitulo: 'Central administrativa e estatísticas condominiais',
    icone: 'home',
    resumo: 'Visão macro da governança do condomínio: total de unidades, ocupação, cadastros pendentes de moderação e manutenções ativas.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Verifique Pendências de Aprovação',
        descricao: 'Se houver dependentes ou novos moradores aguardando moderação, clique no card de alerta para avaliar a aprovação.',
      },
      {
        passo: 2,
        titulo: 'Acompanhe Utilização das Áreas Comuns',
        descricao: 'Veja o volume de reservas realizadas no mês e as áreas mais demandadas pelos moradores.',
      },
      {
        passo: 3,
        titulo: 'Acesse Menus de Governança',
        descricao: 'Acesse rapidamente a Gestão de Pessoas, Cadastro de Áreas Comuns e Publicação de Comunicados.',
      },
    ],
    dicas: [
      'Mantenha as aprovações de novos moradores em dia para evitar atrasos na entrega de códigos de primeiro acesso.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como cadastrar um novo bloco ou prédio?',
        resposta: 'Use o módulo de Estrutura Física no menu Superadmin ou através das configurações globais do condomínio.',
      },
    ],
  },

  // ----------------------------------------------------
  // SÍNDICO: GESTÃO DE PESSOAS (/sindico/pessoas)
  // ----------------------------------------------------
  '/sindico/pessoas': {
    titulo: 'Gestão de Pessoas e Cadastros',
    subtitulo: 'Controle de moradores, proprietários, prestadores e moderação',
    icone: 'users',
    resumo: 'Cadastre e edite moradores, proprietários e funcionários, vincule unidades, gerencie códigos de primeiro acesso e aprove novos dependentes.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Aba "Aprovações Pendentes"',
        descricao: 'Avalie solicitações de dependentes feitas pelos moradores titulares. Clique em "Aprovar" para liberar o código de ativação ou "Recusar" informando o motivo.',
      },
      {
        passo: 2,
        titulo: 'Cadastrar Nova Pessoa',
        descricao: 'Clique no botão "Nova Pessoa", informe os dados pessoais, selecione o papel (Morador, Porteiro, Síndico, Prestador) e vincule à unidade quando aplicável.',
      },
      {
        passo: 3,
        titulo: 'Regras de Proprietário e Inquilino',
        descricao: 'O sistema garante a regra de integridade: apenas 1 Proprietário titular e 1 Inquilino titular por apartamento. Se o proprietário residir, não permite vincular inquilino.',
      },
      {
        passo: 4,
        titulo: 'Gerar / Reenviar Código de Ativação',
        descricao: 'Ao cadastrar ou aprovar, o código no formato "OASIS-XXXXX" é gerado para entrega ao usuário para seu primeiro acesso.',
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
  // SÍNDICO: ÁREAS COMUNS & REGRAS (/sindico/areas)
  // ----------------------------------------------------
  '/sindico/areas': {
    titulo: 'Configuração de Áreas Comuns',
    subtitulo: 'Regras de agendamento, horários, fotos e manutenções',
    icone: 'calendar',
    resumo: 'Configure todos os espaços comuns do condomínio: defina horários de funcionamento por dia da semana, capacidade de pessoas, antecedência de reserva e registre manutenções.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Criar ou Editar Espaço',
        descricao: 'Defina o nome da área, tipo de uso (Uso Livre vs Requer Reserva), capacidade máxima de pessoas e duração dos slots de horário.',
      },
      {
        passo: 2,
        titulo: 'Configurar Regras e Antecedência',
        descricao: 'Ajuste a antecedência mínima (horas ou dias), prazo máximo de cancelamento gratuito e limite de reservas semanais por unidade.',
      },
      {
        passo: 3,
        titulo: 'Definir Grade de Horários',
        descricao: 'Especifique os turnos e horários de funcionamento para cada dia da semana (ex.: Segunda a Domingo das 08:00 às 22:00).',
      },
      {
        passo: 4,
        titulo: 'Registrar Manutenção / Bloqueio',
        descricao: 'Interdite uma área temporariamente para obras ou reparos. O sistema cancela e avisa automaticamente reservas conflitantes no período.',
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
    resumo: 'Crie e publique comunicados oficiais para todos os moradores do condomínio ou avisos direcionados.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Redigir Título e Conteúdo',
        descricao: 'Escreva um título claro e objetivo, seguido do corpo da mensagem com todas as orientações necessárias.',
      },
      {
        passo: 2,
        titulo: 'Definir o Escopo',
        descricao: 'Selecione se o aviso é "GERAL" (visível a todos os blocos e moradores) ou direcionado.',
      },
      {
        passo: 3,
        titulo: 'Publicar Imediatamente',
        descricao: 'Ao clicar em "Publicar Comunicado", o aviso aparece instantaneamente em tempo real no mural de todos os moradores.',
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
    titulo: 'Estrutura Física do Condomínio',
    subtitulo: 'Blocos, torres, prédios e unidades',
    icone: 'home',
    resumo: 'Configuração da malha física do empreendimento: criação de blocos ou torres e cadastro de todos os apartamentos ou unidades habitacionais.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Cadastrar Blocos / Prédios',
        descricao: 'Crie as torres do condomínio (ex.: "Bloco A", "Edifício Araucária").',
      },
      {
        passo: 2,
        titulo: 'Adicionar Unidades (Apartamentos)',
        descricao: 'Vincule novos apartamentos a um bloco, informando o número da unidade e vagas de garagem.',
      },
      {
        passo: 3,
        titulo: 'Auditar Ocupação',
        descricao: 'Veja quais unidades já possuem proprietários ou inquilinos cadastrados e a listagem de moradores residentes.',
      },
    ],
    dicas: [
      'A exclusão de blocos ou apartamentos vazios é permitida; unidades com moradores ativos exigem desvinculação prévia para segurança dos dados.',
    ],
    duvidasFrequentes: [
      {
        pergunta: 'Como funciona a persistência dos dados?',
        resposta: 'Todas as unidades cadastradas são salvas no banco de dados relacional PostgreSQL do condomínio.',
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
    resumo: 'Controle de privilégios elevados, contas técnicas e operadores em nível de infraestrutura.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Consultar Lista Geral',
        descricao: 'Pesquise por qualquer pessoa cadastrada na base do condomínio por nome, CPF ou papel.',
      },
      {
        passo: 2,
        titulo: 'Auditar Permissões',
        descricao: 'Verifique quais usuários possuem privilégios de Administrador, Porteiro ou Superadmin.',
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
    icone: 'apartment',
    resumo: 'Painel central onde o Superadmin cadastra novos condomínios, audita instâncias ativas e alterna o contexto de trabalho com 1 clique.',
    passoAPasso: [
      {
        passo: 1,
        titulo: 'Cadastrar Novo Condomínio',
        descricao: 'Clique no botão "+ Novo Condomínio", informe nome, identificador (slug), CNPJ, endereço e cidade.',
      },
      {
        passo: 2,
        titulo: 'Alternar de Instância Ativa',
        descricao: 'Clique no botão "Acessar Condomínio" em qualquer card para mudar o contexto global de trabalho da plataforma.',
      },
      {
        passo: 3,
        titulo: 'Gerenciar Status e Edição',
        descricao: 'Pause ou reative condomínios a qualquer momento usando a chave de status nos cards.',
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
