# Portal de Documentação do Sistema OASIS

Bem-vindo ao portal central de documentação técnica, arquitetural, visual e de processos do **OASIS** (Sistema de Reservas e Controle de Acesso para Condomínios).

Todas as instruções rápidas de execução em ambiente local com Docker, credenciais de demonstração e roteiro de testes estão descritas no [README.md da raiz do projeto](../README.md).

---

## 🗺️ Mapa de Navegação da Documentação

```
Documentos/
├── README.md                              <- Este portal de navegação
├── AGENTS.md                              <- Diretrizes para agentes de IA e automação
│
├── padroes/                               <- [NOVO] Normas, Design System e Guias de Qualidade
│   ├── padrao_ux_ui.md                    <- Guia completo de UI/UX, Design System, Tabelas, Filtros e Modais
│   └── diretrizes_desenvolvimento.md      <- Padrões de engenharia, arquitetura em 3 camadas e commits
│
├── infraestrutura/                        <- Manuais operacionais, Docker e Cloud (Produção)
│   ├── guia_vps_producao_oracle.md        <- [NOVO] Manual de produção: VPS Oracle, Nginx, SSL e operação
│   ├── guia_docker.md                     <- Guia prático de comandos Docker e Docker Compose
│   └── diferencas_e_impactos_docker.md    <- Análise técnica comparativa da conteinerização
│
├── referencias_do_Projeto/
│   └── OASIS_Projeto.pdf                  <- Especificação completa original (Requisitos, Casos de Uso, DER e Testes)
│
├── diagramas/                             <- Modelagem visual do sistema (PlantUML e PNG)
│   ├── 01_casos_de_uso.*                  <- Diagrama de Casos de Uso
│   ├── 02a_classes_arquitetura.*          <- Diagrama de Classes da Arquitetura
│   ├── 02b1_classes_entidades_cadastro.*  <- Classes de Entidades de Cadastros
│   ├── 02b2_classes_entidades_areas.*     <- Classes de Entidades de Áreas Comuns
│   ├── 08_der.*                           <- Diagrama Entidade-Relacionamento conceitual
│   ├── 09a_logico_cadastro.*              <- Modelo Lógico de Cadastros
│   ├── 09b_logico_areas.*                 <- Modelo Lógico de Áreas e Reservas
│   ├── 10_mapa_navegacao.*                <- Mapa de Navegação da Interface
│   ├── diagramas_sequencia/               <- Diagramas de Sequência (UC01, UC03, UC06, UC07, UC14)
│   └── sql_consolidado/                   <- Scripts SQL históricos de referência dos diagramas
│
├── planos_executados/                     <- Funcionalidades já desenvolvidas, testadas e entregues
│   ├── plano_deploy_vps_producao_e_ambiente_demo.md <- [NOVO] Deploy em produção VPS Oracle, SSL e modo demo
│   ├── plano_gestao_estrutural_administrador.md
│   ├── plano_implementacao_superadmin_estrutural.md
│   ├── plano_separacao_cadastros_visitantes_predio.md
│   ├── plano_bloqueio_exclusao_edicao_moradores.md
│   ├── plano_melhorias_minhas_reservas.md
│   ├── plano_melhorias_tabelas_avisos_encomendas.md
│   ├── plano_edicao_exclusao_chaves_2026-09-20.md
│   ├── plano_gestao_chaves_areas_comuns_2026-09-18.md
│   ├── plano_descricao_taxa_boleto_e_areas_livres_2026-09-18.md
│   ├── relatorio_conclusao_edicao_exclusao_chaves_2026-09-20.md
│   └── relatorio_conclusao_gestao_chaves_2026-09-18.md
│
├── planos_pendentes/                      <- Estudos arquiteturais e planos para desenvolvimento futuro
│   ├── plano_integracao_whatsapp_oficial.md
│   └── estudo_arquitetura_multicondominio.md
│
├── relatorios_commits/                    <- Relatórios detalhados de cada commit enviado ao repositório
│   └── commit_*.md
│
└── Logos/ e Fontes/                       <- Ativos da identidade visual da marca OASIS
```

---

## 1. 🎨 Padrões de Interface & Design System (UX/UI)

Para garantir consistência e evitar que novas telas sejam criadas com comportamentos ou visuais divergentes, consulte a documentação oficial:

👉 **[`Documentos/padroes/padrao_ux_ui.md`](padroes/padrao_ux_ui.md)**

### Destaques Obrigatórios para Toda Nova Tela:
- **Tabelas Sempre Paginadas**: Paginação padrão de **20 registros por página** com o componente `<Paginacao />`.
- **Barra de Filtros e Busca**: Toda listagem deve conter campo de busca textual com `inputCls`, filtros rápidos em abas/pílulas e botão **"Limpar Filtros"** quando ativo.
- **Empty States**: Caso a busca ou o condomínio não possuam registros, utilizar `<EmptyState />` com mensagem orientativa e botão de ação.
- **Modais Padronizados**: Utilizar `<Modal />` para formulários e `<ModalConfirmacao />` para ações destrutivas (exclusões e inativações).
- **Sem Emojis Informais**: Uso exclusivo da biblioteca SVG vetorial `<Icone />`.
- **Dark Mode Completo**: Suporte nativo a tema claro e escuro em todos os elementos.

---

## 2. 💻 Engenharia, Arquitetura e Diretrizes Técnicas

Para diretrizes de desenvolvimento, regras de arquitetura em três camadas e fluxo de versionamento:

- 👉 **[`Documentos/padroes/diretrizes_desenvolvimento.md`](padroes/diretrizes_desenvolvimento.md)**: Padrões de desenvolvimento, convenções de código, integridade no banco de dados e governança de commits.
- 👉 **[`Documentos/AGENTS.md`](AGENTS.md)**: Regras operacionais para agentes automatizados, formatação de relatórios de commit e rastreabilidade.

---

## 3. 🐳 Infraestrutura, Docker & Nuvem de Produção

Instruções para deploy, gerenciamento e controle do ambiente Docker Compose e do servidor em produção:

- 👉 **[`Documentos/infraestrutura/guia_vps_producao_oracle.md`](infraestrutura/guia_vps_producao_oracle.md)**: Manual de produção na VPS Oracle Cloud, Nginx como Proxy Reverso, SSL oficial Let's Encrypt (Certbot), segurança e rotinas operacionais no domínio `oasiscondo.com.br`.
- 👉 **[`Documentos/infraestrutura/guia_docker.md`](infraestrutura/guia_docker.md)**: Comandos para compilar imagens, iniciar contêineres, acompanhar logs em tempo real e resetar volumes.
- 👉 **[`Documentos/infraestrutura/diferencas_e_impactos_docker.md`](infraestrutura/diferencas_e_impactos_docker.md)**: Comparativo detalhado entre a execução local nativa e a arquitetura em contêineres.

---

## 4. 📐 Requisitos, Especificação Acadêmica e Modelagem

- **Documento do Projeto**: [`referencias_do_Projeto/OASIS_Projeto.pdf`](referencias_do_Projeto/OASIS_Projeto.pdf) — Contém a especificação original completa: levantamento de requisitos funcionais e não-funcionais, Quadro 42 com a descrição detalhada das regras de negócio (RN01 a RN17), casos de uso e plano de testes.
- **Diagramas do Sistema**: [`diagramas/`](diagramas/) — Fontes PlantUML (`.puml`) e imagens de alta resolução (`.png`) contendo casos de uso, arquitetura, classes de domínio, DER e modelo lógico relacional.
- **Diagramas de Sequência**: [`diagramas/diagramas_sequencia/`](diagramas/diagramas_sequencia/) — Fluxo temporal dos casos de uso UC01 (login), UC03 (reserva), UC06 (chaves), UC07 (encomendas) e UC14 (leitura de avisos).

---

## 5. 📋 Planos de Implementação

### ⏳ Planos Pendentes (Futuras Evoluções)
| Documento | Escopo / Objetivo |
| :--- | :--- |
| [`planos_pendentes/plano_integracao_whatsapp_oficial.md`](planos_pendentes/plano_integracao_whatsapp_oficial.md) | Integração com a API Oficial do WhatsApp Cloud da Meta para notificações automáticas de chegada de encomendas e publicação de avisos com templates auditados. |
| [`planos_pendentes/estudo_arquitetura_multicondominio.md`](planos_pendentes/estudo_arquitetura_multicondominio.md) | Estudo arquitetural minucioso e plano de implementação para múltiplos condomínios (*Multi-Tenancy*), comparando Row-Level/RLS, Contêineres, Tablespaces e Particionamento Declarativo de Tabelas. |

### ✅ Planos Já Executados e Validados
| Documento | Data / Conclusão | Funcionalidades Entregues |
| :--- | :---: | :--- |
| [`planos_executados/plano_deploy_vps_producao_e_ambiente_demo.md`](planos_executados/plano_deploy_vps_producao_e_ambiente_demo.md) | 04/11/2026 | Deploy em produção na VPS Oracle Cloud (Always Free) com domínio `oasiscondo.com.br`, HTTPS/SSL via Certbot, segregação de ambientes via `VITE_MODO_DEMO` e `NODE_ENV`, atalho de Superadmin e higienização do banco para início dos cadastros reais. |
| [`planos_executados/plano_gestao_estrutural_administrador.md`](planos_executados/plano_gestao_estrutural_administrador.md) | 16/10/2026 | Visualização estrutural de blocos, andares, apartamentos e vagas na tela do Administrador (somente leitura), modal unificado de perfil de usuário com botão de edição e alinhamento de ações. |
| [`planos_executados/plano_implementacao_superadmin_estrutural.md`](planos_executados/plano_implementacao_superadmin_estrutural.md) | 15/10/2026 | Perfil `SUPERADMIN`, gerador estrutural de Blocos, Andares, Apartamentos por Andar, Vagas de garagem com metragem útil ($m^2$) e governança global de pessoas. |
| [`planos_executados/plano_separacao_cadastros_visitantes_predio.md`](planos_executados/plano_separacao_cadastros_visitantes_predio.md) | 13/10/2026 | Separação do cadastro de usuários do sistema vs. visitantes e prestadores de serviço, campos opcionais e vínculo institucional com o prédio. |
| [`planos_executados/plano_bloqueio_exclusao_edicao_moradores.md`](planos_executados/plano_bloqueio_exclusao_edicao_moradores.md) | 09/10/2026 | Bloqueio de edição de dados sensíveis de moradores (Nome, CPF, E-mail) e travas para impedir exclusão definitiva de moradores com histórico. |
| [`planos_executados/plano_melhorias_minhas_reservas.md`](planos_executados/plano_melhorias_minhas_reservas.md) | 09/10/2026 | Visualização prioritária de reservas futuras/ativas, abas de histórico/concluídas e filtro dinâmico por área comum. |
| [`planos_executados/plano_melhorias_tabelas_avisos_encomendas.md`](planos_executados/plano_melhorias_tabelas_avisos_encomendas.md) | 09/10/2026 | Paginação padrão limitada a 20 registros por página em todas as tabelas, priorização de avisos não lidos e encomendas aguardando retirada. |
| [`planos_executados/plano_edicao_exclusao_chaves_2026-09-20.md`](planos_executados/plano_edicao_exclusao_chaves_2026-09-20.md) | 20/09/2026 | Edição e exclusão segura de chaves com auditoria e verificação de chaves emprestadas. |
| [`planos_executados/plano_gestao_chaves_areas_comuns_2026-09-18.md`](planos_executados/plano_gestao_chaves_areas_comuns_2026-09-18.md) | 18/09/2026 | Módulo de portaria para controle de empréstimo e devolução de chaves de áreas comuns. |
| [`planos_executados/plano_descricao_taxa_boleto_e_areas_livres_2026-09-18.md`](planos_executados/plano_descricao_taxa_boleto_e_areas_livres_2026-09-18.md) | 18/09/2026 | Inclusão de taxa de boleto nas reservas pagas e visualização de áreas livres na portaria. |

---

## 6. 📝 Histórico de Commits e Rastreabilidade

A pasta [`relatorios_commits/`](relatorios_commits/) reúne os relatórios gerados a cada alteração ou entrega no repositório remoto, contendo resumo das alterações, camadas impactadas e procedimentos de validação executados.

---

## 7. 🎨 Identidade Visual e Ativos

- **Logotipos**: [`Logos/`](Logos/) — Arquivos PNG do logotipo da marca OASIS (versão horizontal, quadrada e guia de aplicação).
- **Tipografia Institucional**: [`Fontes/`](Fontes/) — Fonte tipográfica oficial utilizada no branding do projeto (`Runiga.otf`).
