# Análise Técnica: Principais Diferenças e Impactos da Migração para Docker

Este documento descreve os impactos operacionais, arquiteturais e de desenvolvimento decorrentes da migração do sistema **OASIS** (PostgreSQL, NestJS e React/Vite) para contêineres Docker.

---

## 1. Visão Geral da Arquitetura em Contêineres

Na abordagem anterior, cada serviço era executado diretamente no sistema operacional do host (Windows), exigindo a instalação prévia e compatibilidade das versões de Node.js, npm e PostgreSQL.

Na abordagem com Docker, a aplicação é particionada em três contêineres isolados e gerenciados via Docker Compose:
- **`oasis-banco`**: PostgreSQL 16 Alpine com scripts de inicialização automática em `/docker-entrypoint-initdb.d/`.
- **`oasis-backend`**: NestJS executando em Node.js 20 Alpine com variáveis de ambiente injetadas.
- **`oasis-frontend`**: React/Vite compilado e servido por Nginx Alpine com suporte a SPA routing.

---

## 2. Comparativo de Diferenças e Impactos

| Aspecto | Execução Local (Node Nativo) | Execução com Docker |
| :--- | :--- | :--- |
| **Instalação de Dependências** | Exige instalação manual de Node.js, npm, TypeScript e PostgreSQL 16 no sistema operacional hospedeiro. | Exige apenas o Docker e Docker Compose instalados. Todas as dependências e binários ficam encapsulados nas imagens. |
| **Comunicação de Rede** | Serviços comunicam-se via `localhost` (ex.: `localhost:5433`, `localhost:3000`). | Serviços comunicam-se através de rede interna isolada do Docker (`bridge`) utilizando o nome dos serviços (`backend:3000`, `banco:5432`). |
| **Inicialização e Ciclo de Vida** | Inicialização manual em três terminais independentes (`pg_ctl`, `npm run start:dev`, `npm run dev`). | Inicialização unificada com um único comando: `docker compose up -d` ou via script `iniciar.bat` / `iniciar.sh`. |
| **Persistência de Dados** | Dados gravados diretamente no diretório do PostgreSQL instalado no host Windows. | Dados persistidos em volumes nomeados (`named volumes`), desacoplados do ciclo de vida dos contêineres. |
| **Hot Reload em Desenvolvimento** | Hot reload nativo instantâneo via Vite e Nest CLI. | Mantido através de compilação ou sincronização nos contêineres. |
| **Paridade entre Ambientes** | Risco de divergências entre máquinas de desenvolvimento e servidores ("na minha máquina funciona"). | Garantia de execução idêntica em qualquer ambiente (Windows, Linux, macOS ou nuvem). |
| **Prontidão para Produção** | Exige configuração manual de PM2, Nginx e certificados no servidor de produção. | As mesmas imagens validadas localmente podem ser enviadas para um Container Registry e implantadas diretamente. |

---

## 3. Mudanças Estruturais Implementadas no Projeto

1. **Backend**:
   - Criação de `Dockerfile` (multi-stage build para produção).
   - Criação de `.dockerignore`.
   - Ajuste das credenciais e conexão de banco para a rede interna `oasis-net`.

2. **Frontend**:
   - Criação de `Dockerfile` (build multi-stage com Nginx para servir arquivos estáticos otimizados).
   - Criação de `nginx.conf` com suporte a SPA (fallback para `index.html`).
   - Criação de `.dockerignore`.

3. **Banco de Dados**:
   - Script consolidado `banco/oasis_banco_completo.sql` executado automaticamente na criação do contêiner.

4. **Raiz do Projeto**:
   - Arquivo `docker-compose.yml` para orquestração de rede, portas e volumes.
   - Scripts de inicialização em 1 clique (`iniciar.bat` para Windows e `iniciar.sh` para Linux/macOS).
