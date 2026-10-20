# Documentos do OASIS

Esta pasta reúne a documentação do projeto OASIS. As instruções de execução, os usuários de teste, o roteiro de demonstração e a lista de regras de negócio estão no [README.md da raiz do projeto](../README.md).

| Caminho | Conteúdo |
| :--- | :--- |
| `referencias_do_Projeto/OASIS_Projeto.pdf` | Documento completo do projeto: requisitos, casos de uso, diagramas, modelo de dados, regras de negócio (Quadro 42) e plano de testes |
| `diagramas/` | Fontes PlantUML (`.puml`) e imagens (`.png`) dos diagramas de casos de uso, classes, DER, modelo lógico e mapa de navegação |
| `diagramas/diagramas_sequencia/` | Diagramas de sequência dos casos de uso UC01, UC03, UC06, UC07 e UC14 |
| `guia_docker.md` | Guia detalhado de execução e gerenciamento dos contêineres Docker |
| `Logos/` e `Fontes/` | Identidade visual do sistema |

Material de uso interno da equipe, mantido apenas no repositório (não incluído no pacote de entrega):

| Caminho | Conteúdo |
| :--- | :--- |
| `AGENTS.md` | Diretrizes de trabalho e padrão de relatórios de commit |
| `relatorios_commits/` | Relatórios detalhados de cada commit enviado ao repositório remoto |
| `planos_executados/` | Planos de implementação e relatórios de funcionalidades já concluídas |
| `planos_pendentes/` | Planos de implementação e estudos técnicos planejados para execução futura |
| `diferencas_e_impactos_docker.md` | Análise da migração para Docker |
| `diagramas/sql_consolidado/` | Cópia histórica dos scripts SQL usada na elaboração dos diagramas; a versão vigente está em `banco/` |

---

## Índice de Planos de Implementação

### ⏳ Planos Pendentes (A Executar)

| Documento | Escopo / Objetivo |
| :--- | :--- |
| [`planos_pendentes/estudo_arquitetura_multicondominio.md`](planos_pendentes/estudo_arquitetura_multicondominio.md) | Estudo arquitetural e plano de transição para múltiplos condomínios (Multi-Tenancy) no servidor de produção com banco compartilhado. |

### ✅ Planos Já Executados

| Documento | Data / Conclusão | Escopo / Funcionalidade Entregue |
| :--- | :---: | :--- |
| [`planos_executados/plano_implementacao_superadmin_estrutural.md`](planos_executados/plano_implementacao_superadmin_estrutural.md) | 15/10/2026 | Perfil `SUPERADMIN`, gestão estrutural de Blocos, Andares, Apartamentos por Andar, Vagas de garagem com metragem útil ($m^2$) e governança global de pessoas. |
| [`planos_executados/plano_separacao_cadastros_visitantes_predio.md`](planos_executados/plano_separacao_cadastros_visitantes_predio.md) | 13/10/2026 | Separação do cadastro de usuários do sistema vs. visitantes e prestadores de serviço, campos opcionais e vínculo institucional com o prédio. |
| [`planos_executados/plano_bloqueio_exclusao_edicao_moradores.md`](planos_executados/plano_bloqueio_exclusao_edicao_moradores.md) | 09/10/2026 | Bloqueio de edição de dados sensíveis de moradores (Nome, CPF, E-mail) e travas para impedir exclusão definitiva de moradores com histórico. |
| [`planos_executados/plano_melhorias_minhas_reservas.md`](planos_executados/plano_melhorias_minhas_reservas.md) | 09/10/2026 | Visualização prioritária de reservas futuras/ativas, abas de histórico/concluídas e filtro dinâmico por área comum. |
| [`planos_executados/plano_melhorias_tabelas_avisos_encomendas.md`](planos_executados/plano_melhorias_tabelas_avisos_encomendas.md) | 08/10/2026 | Paginação padrão limitada a 20 registros por página em todas as tabelas, priorização de avisos não lidos e encomendas aguardando retirada. |
| [`planos_executados/plano_edicao_exclusao_chaves_2026-09-20.md`](planos_executados/plano_edicao_exclusao_chaves_2026-09-20.md) | 20/09/2026 | Edição e exclusão segura de chaves com auditoria e verificação de chaves emprestadas. |
| [`planos_executados/plano_gestao_chaves_areas_comuns_2026-09-18.md`](planos_executados/plano_gestao_chaves_areas_comuns_2026-09-18.md) | 18/09/2026 | Módulo de portaria para controle de empréstimo e devolução de chaves de áreas comuns. |
| [`planos_executados/plano_descricao_taxa_boleto_e_areas_livres_2026-09-18.md`](planos_executados/plano_descricao_taxa_boleto_e_areas_livres_2026-09-18.md) | 18/09/2026 | Inclusão de taxa de boleto nas reservas pagas e visualização de áreas livres na portaria. |

