# OASIS — Sistema de Reservas e Controle de Acesso para Condomínios

O OASIS é uma aplicação web para a gestão de um condomínio residencial: reserva de áreas comuns, controle de encomendas e de chaves na portaria, mural de avisos e cadastro de moradores, dependentes e unidades. Foi desenvolvido como trabalho da disciplina de Projeto de Software da Universidade Estadual de Ponta Grossa (UEPG), em 2026.

O sistema é composto por três camadas, todas executadas em contêineres Docker:

| Camada | Tecnologia | Endereço |
| :--- | :--- | :--- |
| Interface web | React + Vite + Tailwind, servida por Nginx | http://localhost:5173 |
| API REST | NestJS + TypeScript | http://localhost:3000/api |
| Banco de dados | PostgreSQL 16 | `localhost:5433` |

O documento completo do projeto (requisitos, casos de uso, diagramas, modelo de dados e plano de testes) está em [`Documentos/referencias_do_Projeto/OASIS_Projeto.pdf`](Documentos/referencias_do_Projeto/OASIS_Projeto.pdf).

---

## 1. Requisitos

- **Docker Desktop** instalado e **em execução** ([download](https://www.docker.com/products/docker-desktop/)). No Windows, o Docker Desktop utiliza o WSL 2; se for a primeira instalação, siga o assistente até o fim e reinicie o computador se solicitado.
- **Conexão com a internet na primeira execução**, para baixar as imagens base e as dependências (cerca de 1 GB). As execuções seguintes não precisam de internet.
- **Portas livres**: `5173`, `3000` e `5433`.

Não é necessário instalar Node.js nem PostgreSQL: tudo é compilado e executado dentro dos contêineres.

---

## 2. Como executar

### Windows

1. Clique com o botão direito no arquivo `OASIS_entrega.zip` e escolha **Extrair Tudo**. Não execute os arquivos de dentro do zip sem extrair.
2. Abra o **Docker Desktop** e aguarde até que ele indique que o mecanismo está em execução (*Engine running*).
3. Na pasta extraída `OASIS`, dê um duplo clique em **`iniciar.bat`**.
   - Se o Windows exibir "O Windows protegeu o computador", clique em **Mais informações** e depois em **Executar assim mesmo**. O aviso aparece porque o script veio de um arquivo baixado.
4. Aguarde. Na primeira execução a construção leva alguns minutos. Ao final, o script exibe o endereço e os usuários de teste e abre o navegador em http://localhost:5173.

### Linux ou macOS

```bash
cd OASIS
bash iniciar.sh
```

### Execução manual (qualquer sistema)

Na pasta `OASIS`, com o Docker em execução:

```bash
docker compose up -d --build
```

Aguarde cerca de um minuto após o término do comando e acesse http://localhost:5173.

> O arquivo `.env` incluído no pacote contém **valores de demonstração** (senha do banco, chave de assinatura dos tokens e senha de teste). Eles servem apenas para execução local e **não devem ser usados em produção**. Uma cópia de segurança está em `.env.demonstracao`; os scripts de inicialização recriam o `.env` a partir dela se ele for apagado.

---

## 3. Acesso ao sistema

### Usuários de teste

A senha de todos os usuários é **`Teste@2026`**.

| Nome | E-mail | Perfis | Unidade | Acesso rápido |
| :--- | :--- | :--- | :--- | :--- |
| Carlos Silva | `carlos.silva@teste.com` | Morador | Bloco A, apto 51 — proprietário | Botão **Morador** |
| Ana Paula Souza | `ana.souza@teste.com` | Síndica e moradora | Bloco A, apto 61 — proprietária | Botão **Síndica** |
| Roberto Lima | `roberto.lima@teste.com` | Porteiro | — | Botão **Porteiro** |
| Maria Santos | `maria.santos@teste.com` | Moradora | Bloco A, apto 52 — inquilina | — |
| Joao Oliveira | `joao.oliveira@teste.com` | Morador | Bloco A, apto 51 — dependente (filho) de Carlos | — |
| Helena Braga | `helena.braga@teste.com` | Moradora | Bloco A, apto 53 — inquilina | — |

Na tela de login, a seção **Acesso Rápido para Teste (1 Clique)** entra diretamente como Morador (Carlos), Síndica (Ana) ou Porteiro (Roberto).

### Primeiro acesso e recuperação de senha

- **Primeiro acesso**: na aba **Primeiro Acesso (Código)**, informe um código de ativação e o e-mail correspondente para definir uma senha pessoal. A carga inicial traz os códigos `OASIS-7489` (Carlos), `OASIS-1234` (Maria) e `OASIS-5678` (Joao), válidos por 7 dias após a criação do banco. O link **Testar com Código de Exemplo (Carlos Silva)** preenche o código do Carlos. Quando a síndica cadastra uma nova pessoa, o sistema gera um novo código, exibido na tela **Pessoas & Unidades**.
- **Recuperação de senha**: em **Esqueci minha senha**, informe o e-mail. Como o ambiente é de demonstração e não envia e-mails, o código de recuperação (`REC-...`) é exibido na própria tela.

> **Atenção:** a senha de demonstração `Teste@2026` continua aceita mesmo depois que o usuário define uma senha própria, e entrar com ela **substitui a senha própria do usuário** pela senha de demonstração. Esse comportamento existe apenas para facilitar a avaliação.

### Menus por perfil

- **Morador**: Início, Nova Reserva, Minhas Reservas, Minhas Encomendas, Minha Família (dependentes) e Mural de Avisos.
- **Porteiro**: Início, Painel da Portaria, Áreas de Uso Livre, Encomendas, Controle de Chaves, Pessoas & Cadastros e Mural de Avisos.
- **Síndica**: Início, Painel Geral, Painel da Portaria, Áreas de Uso Livre, Controle de Chaves, Áreas Comuns, Pessoas & Unidades, Publicar Avisos e Mural de Avisos. Como a Ana também é moradora, o menu inclui as opções de morador.

---

## 4. Roteiro de demonstração sugerido

1. **Reserva (morador)** — Entre como **Morador**. Em **Nova Reserva**, escolha a **Academia**, uma data a partir de amanhã e um horário livre; confirme. A reserva aparece em **Minhas Reservas**.
2. **Regra de negócio no banco** — Ainda como Carlos, faça uma segunda reserva da Academia na mesma semana e tente uma terceira: o banco recusa com a mensagem `RN07: a unidade atingiu o limite de 2 reserva(s) semanal(is) nesta area.` As mensagens `RNxx` são geradas pelos gatilhos do PostgreSQL e exibidas sem alteração pela interface.
3. **Encomendas (porteiro)** — Entre como **Porteiro**. Em **Encomendas**, registre um pacote para Carlos Silva (RN11 gera um aviso individual para ele) e depois registre a retirada (RN12).
4. **Chaves (porteiro)** — Em **Controle de Chaves**, empreste a chave do Salão de Festas (RN09) e registre a devolução (RN10).
5. **Administração (síndica)** — Entre como **Síndica**. Veja os indicadores em **Painel Geral**; em **Áreas Comuns**, ajuste regras de uma área ou crie um bloqueio de manutenção (RN02); em **Publicar Avisos**, publique um comunicado (RN13) e confira-o no **Mural de Avisos** de outro usuário (RN14 registra a leitura).
6. **Cadastro (síndica)** — Em **Pessoas & Unidades**, cadastre um novo morador e use o código de ativação gerado na aba **Primeiro Acesso (Código)** da tela de login.

Para voltar aos dados iniciais a qualquer momento, veja a seção 6.

---

## 5. Regras de negócio

As regras de negócio críticas são implementadas como gatilhos PL/pgSQL no banco de dados (`banco/04_gatilhos.sql`). Assim, a integridade é garantida mesmo que os dados sejam manipulados fora da API. Quando uma regra é violada, o gatilho gera uma exceção iniciada por `RNxx:`, que a API converte em erro HTTP 400 e a interface exibe ao usuário. A numeração segue o Quadro 42 do documento do projeto.

| ID | Regra | Tabela / evento |
| :--- | :--- | :--- |
| RN01 | Controlar conflito de horário: a mesma unidade não pode ter reservas sobrepostas na mesma área, e o número de unidades no mesmo horário é limitado | `reserva` (antes de inserir/alterar) |
| RN02 | Impedir reserva em área bloqueada (manutenção, limpeza, evento, obra) | `reserva` |
| RN03 | Impedir reserva de morador com penalidade vigente | `reserva` |
| RN04 | Validar a capacidade de pessoas da área no horário | `reserva` |
| RN05 | Validar a janela de funcionamento do dia da semana | `reserva` |
| RN06 | Impedir reserva no passado e validar antecedência mínima e máxima | `reserva` |
| RN07 | Limitar reservas por unidade no período (diário, semanal ou mensal) | `reserva` |
| RN08 | Controlar cancelamento: prazo mínimo, proibição para reserva concluída e registro da data | `reserva` (antes de alterar) |
| RN09 | Controlar empréstimo de chave: somente chave disponível | `entrega_chave` (inserção) |
| RN10 | Controlar devolução de chave: data posterior à retirada e funcionário informado | `entrega_chave` (alteração) |
| RN11 | Avisar o morador da chegada de encomenda | `encomenda` (após inserir) |
| RN12 | Controlar retirada de encomenda: quem retirou, quem entregou e nome do terceiro | `encomenda` (antes de alterar) |
| RN13 | Distribuir os avisos do mural a todos os perfis ativos | `aviso` (após inserir) |
| RN14 | Registrar a data e a hora de leitura do aviso | `aviso_perfil` (antes de alterar) |
| RN15 | Validar vínculo de dependente: o responsável deve ser titular ativo da mesma unidade | `pessoa_unidade` |
| RN16 | Validar a idade mínima exigida pela área | `reserva` |
| RN17 | Aplicar penalidade: cancelar automaticamente as reservas ativas atingidas | `bloqueio_perfil` (após inserir) |

---

## 6. Parar, reiniciar e restaurar os dados

Execute os comandos na pasta `OASIS`:

| Ação | Comando |
| :--- | :--- |
| Parar o sistema, mantendo os dados | `docker compose down` |
| Iniciar novamente | `iniciar.bat` (ou `docker compose up -d`) |
| Restaurar os dados iniciais (apaga tudo o que foi criado) | `docker compose down -v` e depois `iniciar.bat` |
| Ver o estado dos contêineres | `docker compose ps` |
| Ver os registros (logs) | `docker compose logs -f backend` |

O banco é criado a partir de `banco/oasis_banco_completo.sql` apenas quando o volume de dados está vazio, ou seja, na primeira execução ou depois de um `docker compose down -v`.

---

## 7. Solução de problemas

| Sintoma | Causa provável e solução |
| :--- | :--- |
| "Docker Desktop não está em execução" | Abra o Docker Desktop e aguarde *Engine running* antes de executar o script. |
| "docker-compose.yml não encontrado" | O script foi aberto de dentro do zip. Extraia o zip por completo e execute a partir da pasta extraída. |
| "A porta ... já está em uso" | Outro programa usa a porta 5173, 3000 ou 5433. Encerre-o (ou pare outro projeto Docker) e execute novamente. |
| A primeira execução demora muito | É esperado: as imagens e as dependências são baixadas e compiladas. Redes com proxy ou firewall podem bloquear o Docker Hub ou o npm. |
| O navegador mostra "502 Bad Gateway" | O backend ainda está iniciando. Aguarde alguns segundos e recarregue a página. |
| Os usuários de teste não entram ou os dados parecem antigos | Pode haver um volume de uma execução anterior. Execute `docker compose down -v` e inicie novamente. |
| Código de primeiro acesso "expirado" | Os códigos da carga inicial valem 7 dias após a criação do banco. Restaure os dados com `docker compose down -v`. |

Para investigar outros erros: `docker compose logs backend` e `docker compose logs banco`.

---

## 8. Estrutura do pacote

```
OASIS/
├── README.md             este arquivo
├── iniciar.bat           inicialização no Windows
├── iniciar.sh            inicialização no Linux/macOS
├── docker-compose.yml    orquestração dos três contêineres
├── .env                  configuração de demonstração (uso local)
├── .env.demonstracao     cópia de segurança do .env
├── .env.exemplo          modelo para uma configuração própria
├── banco/                scripts SQL: tipos, tabelas, carga inicial e gatilhos (RN01 a RN17)
├── backend/              API REST em NestJS (um módulo por funcionalidade)
├── frontend/             interface web em React + Vite
└── Documentos/
    ├── referencias_do_Projeto/OASIS_Projeto.pdf   documento do projeto
    ├── diagramas/        casos de uso, classes, sequência, DER, modelo lógico e mapa de navegação
    ├── guia_docker.md    guia detalhado de execução com Docker
    ├── Logos/ e Fontes/  identidade visual
    └── README.md         índice da pasta Documentos
```

Detalhes adicionais de cada camada estão em `banco/README.md`, `backend/README.md` e `frontend/README.md`.

---

## 9. Autores

- João Pedro Borsato de Ramos
- João Vitor Carvalho de Andrade

Universidade Estadual de Ponta Grossa (UEPG) — Projeto de Software, 2026.

Licença MIT (arquivo `LICENSE`).
