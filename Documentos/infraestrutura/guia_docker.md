# Guia de Execução com Docker — Sistema OASIS

Este guia detalha o procedimento para compilar, executar e gerenciar o ecossistema do **OASIS** em contêineres Docker via Docker Compose.

---

## 1. Pré-requisitos
- **Docker Desktop** (com suporte a Docker Compose v2) instalado e em execução no sistema.

---

## 2. Estrutura dos Serviços Docker

| Serviço | Contêiner | Imagem Base | Porta Interna | Porta Exposta no Host |
| :--- | :--- | :--- | :--- | :--- |
| **Banco** | `oasis-banco` | `postgres:16-alpine` | `5432` | `localhost:5433` |
| **Backend** | `oasis-backend` | `node:20-alpine` | `3000` | `localhost:3000` |
| **Frontend** | `oasis-frontend` | `nginx:alpine` | `80` | `localhost:5173` |

---

## 3. Comandos Principais

### A. Iniciar todos os serviços em segundo plano
```bash
docker compose up -d --build
```
> Esse comando compila as imagens do backend e frontend, baixa a imagem oficial do PostgreSQL, inicializa o banco com o script DDL/DML e inicia todos os contêineres na rede `oasis-net`.

### B. Visualizar logs em tempo real
```bash
# Logs de todos os serviços:
docker compose logs -f

# Logs específicos do backend:
docker compose logs -f backend

# Logs específicos do banco:
docker compose logs -f banco

# Logs específicos do frontend:
docker compose logs -f frontend
```

### C. Verificar o status dos contêineres
```bash
docker compose ps
```

### D. Parar todos os serviços (mantendo os dados do banco)
```bash
docker compose down
```

### E. Parar todos os serviços e resetar o banco de dados (exclusão de volumes)
```bash
docker compose down -v
```

---

## 4. Acessos aos Serviços

- **Aplicação Web (Frontend)**: [http://localhost:5173](http://localhost:5173)
- **API REST (Backend)**: [http://localhost:3000/api](http://localhost:3000/api)
- **Banco de Dados PostgreSQL**: `localhost:5433` (Usuário: `postgres`, Senha: `OasisDemo2026`, Database: `oasis`). As credenciais vêm do arquivo `.env`; os valores indicados são os do `.env` de demonstração incluído no pacote de entrega.

---

## 5. Credenciais de Acesso Rápido para Demonstração

| Perfil | E-mail | Senha Padrão |
| :--- | :--- | :--- |
| **Morador (Carlos)** | `carlos.silva@teste.com` | `Teste@2026` |
| **Síndica (Ana)** | `ana.souza@teste.com` | `Teste@2026` |
| **Porteiro (Roberto)** | `roberto.lima@teste.com` | `Teste@2026` |
