# Guia de Infraestrutura e Produção: VPS Oracle Cloud & Nginx (OASIS)

**Data de Implementação:** 04/11/2026  
**Ambiente:** Produção (Cloud)  
**Domínio Oficial:** [https://oasiscondo.com.br](https://oasiscondo.com.br) / [https://www.oasiscondo.com.br](https://www.oasiscondo.com.br)  
**IP Público:** `163.176.4.14`

---

## 1. Visão Geral da Arquitetura de Produção

A aplicação OASIS está implantada em uma máquina virtual (VPS) na **Oracle Cloud Infrastructure (OCI)** dentro da camada **Always Free**, utilizando Docker Compose para gerenciamento dos contêineres e o **Nginx** como Proxy Reverso com terminação **SSL/TLS (HTTPS)** gratuito e automatizado pelo Certbot (Let's Encrypt).

```
                             [ Usuário na Internet ]
                                       │
                                       ▼ HTTPS (443) / HTTP (80)
                       ┌───────────────────────────────┐
                       │  Firewall OCI (Security List) │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │   Firewall Ubuntu (iptables)  │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            VPS UBUNTU (HOST)                                │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    NGINX (Proxy Reverso + SSL)                        │  │
│  │  • Let's Encrypt Fullchain                                            │  │
│  │  • Redirecionamento automático HTTP -> HTTPS                          │  │
│  │  • client_max_body_size 16M (uploads)                                 │  │
│  └───────────────────┬───────────────────────────────────────────────────┘  │
│                      │                                                      │
│                      │ proxy_pass http://127.0.0.1:5173                     │
│                      ▼                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         DOCKER COMPOSE                                │  │
│  │                                                                       │  │
│  │  ┌──────────────────────┐  ┌────────────────────┐  ┌───────────────┐  │  │
│  │  │ oasis-frontend       │  │ oasis-backend      │  │ oasis-banco   │  │  │
│  │  │ (React/Vite Nginx)   │──│ (NestJS REST API)  │──│ (Postgres 16) │  │  │
│  │  │ Porta interna: 5173  │  │ Porta: 3000        │  │ Porta: 5433   │  │  │
│  │  └──────────────────────┘  └────────────────────┘  └───────────────┘  │  │
│  │                                                                       │  │
│  │  Volumes Persistentes: oasis_pgdata (Banco) | oasis_uploads (Fotos)    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Recursos de Memória: 1 GB RAM Físico + 2 GB Swapfile Virtual               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Especificações da Máquina (VPS)

| Item | Especificação |
| :--- | :--- |
| **Provedor Cloud** | Oracle Cloud Infrastructure (OCI) — Região: `sa-saopaulo-1` (Brazil East) |
| **Forma de Computação (Shape)** | `VM.Standard.E2.1.Micro` (AMD EPYC) — Categoria *Always Free* |
| **Processador** | 1 OCPU (x86_64) |
| **Memória RAM Física** | 1.0 GB |
| **Memória Virtual (Swap)** | 2.0 GB (`/swapfile` em `/etc/fstab`) |
| **Armazenamento em Disco** | 46.6 GB (Volume de Inicialização NVMe com criptografia em trânsito) |
| **Sistema Operacional** | Ubuntu Server 22.04 LTS (x86_64) |
| **Usuário SSH Padrão** | `ubuntu` (autenticação exclusiva por par de chaves RSA) |

---

## 3. Configuração de Rede e Domínio

### 3.1. Apontamento de DNS (Registro.br)
No painel do Registro.br, o domínio `oasiscondo.com.br` está configurado com os servidores DNS próprios do Registro.br apontando as seguintes entradas:

* **Tipo A (`@` ou domínio raiz):** `163.176.4.14`
* **Tipo A (`www`):** `163.176.4.14`

### 3.2. Regras de Firewall (Segurança em 2 Camadas)

#### Camada 1: OCI Security List (Nuvem)
Na VCN `oasis-vcn` e Sub-rede `oasis-public-subnet`, a `Default Security List` contém:
* **Entrada (Ingress):**
  * Porta `22` (TCP) de `0.0.0.0/0` — Acesso SSH administrativo.
  * Portas `80, 443` (TCP) de `0.0.0.0/0` — Tráfego web HTTP e HTTPS.

#### Camada 2: Firewall Interno do Ubuntu (`iptables` e `ufw`)
As portas foram inseridas no topo da tabela `INPUT` e persistidas via `netfilter-persistent`:
```bash
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo netfilter-persistent save
```

---

## 4. Configuração do Nginx (Proxy Reverso)

O arquivo de configuração do Nginx no servidor está localizado em `/etc/nginx/sites-available/oasiscondo`:

```nginx
server {
    server_name oasiscondo.com.br www.oasiscondo.com.br 163.176.4.14;

    client_max_body_size 16M;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # gerenciado pelo Certbot
    ssl_certificate /etc/letsencrypt/live/oasiscondo.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oasiscondo.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.oasiscondo.com.br) {
        return 301 https://$host$request_uri;
    }
    if ($host = oasiscondo.com.br) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name oasiscondo.com.br www.oasiscondo.com.br 163.176.4.14;
    return 404;
}
```

---

## 5. Variáveis de Ambiente de Produção (`.env`)

O arquivo `.env` no servidor em `~/OASIS/.env` foi configurado especificamente para produção:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<SENHA_GERADA_ALEATORIA>
POSTGRES_PASSWORD_ENCODED=<SENHA_GERADA_ALEATORIA>
JWT_SECRET=<CHAVE_HEX_64_CHARS>

# Segurança em Produção
DEV_SENHA=
NODE_ENV=production
VITE_MODO_DEMO=false

# CORS
CORS_ORIGIN=https://oasiscondo.com.br,https://www.oasiscondo.com.br,http://163.176.4.14
```

> [!IMPORTANT]
> A combinação `NODE_ENV=production` e `VITE_MODO_DEMO=false` garante que:
> 1. Nenhum botão de atalho ou teste apareça na tela de login.
> 2. O backend rejeite qualquer tentativa de login sem senha real criptografada.
> 3. Nenhum código de recuperação ou ativação seja retornado em payloads JSON.

---

## 6. Procedimentos de Operação e Manutenção

### 6.1. Como Acessar a VPS via SSH (Termius)
* **Host / Endereço:** `163.176.4.14`
* **Porta:** `22`
* **Usuário:** `ubuntu`
* **Chave:** Chave privada `.key` gerada na criação da OCI.

### 6.2. Comandos do Dia a Dia

#### Ver status dos contêineres:
```bash
cd ~/OASIS
sudo docker compose ps
```

#### Ver logs em tempo real:
```bash
sudo docker compose logs -f --tail=100 backend
sudo docker compose logs -f --tail=100 banco
```

#### Atualizar a aplicação após um novo commit no GitHub:
```bash
cd ~/OASIS
git pull
sudo docker compose up -d --build
```

#### Reiniciar o Nginx:
```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

## 7. Acesso Administrativo Inicial em Produção

Após a limpeza de dados de teste e preservação da estrutura predial:
* **URL:** [https://oasiscondo.com.br](https://oasiscondo.com.br)
* **Usuário Superadmin:** `superadmin@oasis.com`
* **Senha Inicial:** `Admin@2026`
* **Ações Disponíveis:** Cadastro do Síndico real, porteiros e moradores vinculados às unidades.
