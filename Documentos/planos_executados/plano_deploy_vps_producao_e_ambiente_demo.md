# Plano Executado: Deploy em Produção na VPS Oracle Cloud, Domínio Próprio e Segregação de Ambientes (Dev vs. Prod)

**Data de Início:** 03/11/2026  
**Data de Conclusão:** 04/11/2026  
**Status:** Concluído com Sucesso ✅  
**Ambiente:** Oracle Cloud Infrastructure (OCI) + Nginx Proxy Reverso + SSL Let's Encrypt  
**Domínio Oficial:** [https://oasiscondo.com.br](https://oasiscondo.com.br) | **IP:** `163.176.4.14`

---

## 1. Contexto e Motivação

Com o amadurecimento dos módulos funcionais do OASIS (portaria, reservas, estrutura física, avisos, encomendas e perfil unificado de usuários), tornou-se necessário:
1. Publicar a aplicação em um ambiente de nuvem acessível pela internet (*Deploy de Produção*).
2. Vincular o domínio registrado `oasiscondo.com.br` com HTTPS e certificado SSL seguro.
3. Separar o comportamento da aplicação entre **Desenvolvimento Local** (onde atalhos de teste e pré-preenchimento facilitam o trabalho diário dos desenvolvedores) e **Produção** (onde a interface deve ser 100% limpa, segura e sem nenhum atalho ou vazamento de códigos).
4. Fornecer ao usuário Superadmin credenciais definitivas e o banco higienizado de testes para início do cadastro de dados reais.

---

## 2. Entregas Realizadas

### 2.1. Infraestrutura Cloud (Oracle Cloud Always Free)
* Provisionamento de VPS com forma `VM.Standard.E2.1.Micro` (AMD EPYC, 1 OCPU, 1 GB RAM, 46.6 GB disco NVMe).
* Configuração de rede virtual privada (VCN) com sub-rede pública e IP público efêmero `163.176.4.14`.
* Configuração de 2.0 GB de memória virtual (*swapfile*) para estabilização de picos de memória e prevenção de falhas por *OOM Killer*.
* Liberação de portas 80 (HTTP) e 443 (HTTPS) na Lista de Segurança da Oracle e no firewall interno do Ubuntu (`iptables` / `ufw`).

### 2.2. Domínio e Proxy Reverso com SSL
* Apontamento de DNS no Registro.br das entradas A (`@` e `www`) para `163.176.4.14`.
* Instalação e configuração do **Nginx** na máquina hospedeira para roteamento de tráfego reverso para o contêiner do frontend na porta 5173.
* Obtenção e configuração automática de certificado SSL da Let's Encrypt via **Certbot** com renovação automática agendada.
* Redirecionamento permanente forçado de HTTP para HTTPS (porta 80 -> 443).

### 2.3. Segregação de Ambientes por Variáveis (`.env`)
* **Frontend:**
  * Criação da variável `VITE_MODO_DEMO`.
  * Condicionamento dos botões de "Acesso Rápido para Teste (1 Clique)", "Testar com Código de Exemplo" e banner de código de recuperação à flag `modoDemo`.
  * Em desenvolvimento local (`npm run dev`), os atalhos permanecem visíveis automaticamente.
  * Em produção (`VITE_MODO_DEMO=false`), a interface de login fica completamente limpa.
  * Inclusão do botão de **Superadmin** no grid de testes local (4 botões: Morador, Síndica, Porteiro e Superadmin).
* **Backend:**
  * Proteção do mecanismo `DEV_SENHA`: quando `NODE_ENV=production` ou `DEV_SENHA` for omitido, o login exige hash de senha criptografada real.
  * Remoção do campo `codigo_dev` em payloads JSON de rotas de recuperação em ambiente de produção.
* **Banco de Dados:**
  * Inclusão do valor `SUPERADMIN` no tipo enumerado `tipo_perfil_enum` do script mestre `oasis_banco_completo.sql`.
  * Criação e ativação do usuário master `superadmin@oasis.com`.

### 2.4. Higienização de Dados para Entrada em Produção
* Execução de rotina SQL em transação para limpeza de movimentações e usuários de teste (Carlos, Maria, João, Ana, Roberto, Helena).
* **Preservação integral** da estrutura predial (Blocos, Andares, Apartamentos, Vagas de Garagem, Áreas Comuns, Horários e Chaves).
* Definição da senha inicial do Superadmin (`Admin@2026`) para início do cadastro de moradores e administradores reais.

---

## 3. Arquivos Criados e Modificados

| Arquivo | Ação | Descrição |
| :--- | :---: | :--- |
| `Documentos/infraestrutura/guia_vps_producao_oracle.md` | Criado | Guia completo da VPS, Nginx, Certbot e procedimentos de manutenção. |
| `Documentos/planos_executados/plano_deploy_vps_producao_e_ambiente_demo.md` | Criado | Este documento de registro do plano executado. |
| `frontend/src/pages/Login.tsx` | Modificado | Condicionamento de atalhos a `VITE_MODO_DEMO` e adição do atalho Superadmin. |
| `frontend/src/vite-env.d.ts` | Criado | Definição de tipos TypeScript para variáveis de ambiente Vite. |
| `frontend/Dockerfile` | Modificado | Suporte a build arg `VITE_MODO_DEMO`. |
| `docker-compose.yml` | Modificado | Passagem de `VITE_MODO_DEMO` e `NODE_ENV`. |
| `backend/src/auth/auth.service.ts` | Modificado | Travas de produção para `DEV_SENHA` e supressão de `codigo_dev`. |
| `backend/src/db/db.service.ts` | Modificado | Garantia de existência e ativação do usuário `superadmin@oasis.com`. |
| `banco/oasis_banco_completo.sql` | Modificado | Adição de `SUPERADMIN` em `tipo_perfil_enum` e seed mestre do Superadmin. |
| `.env.exemplo` e `.env` | Modificados | Documentação de `VITE_MODO_DEMO` e padrões para desenvolvimento e produção. |

---

## 4. Testes e Validações Executados

1. **Acesso HTTPS no Navegador:**
   * Testada a URL `https://oasiscondo.com.br` com sucesso.
   * Certificado válido emitido pela Let's Encrypt Authority.
   * Redirecionamento de `http://` para `https://` verificado.
2. **Interface Limpa:**
   * Verificada a tela de login em produção: os botões de atalho rápido e de teste não aparecem.
3. **Persistência de Dados e Firewall:**
   * Regras de firewall persistidas no sistema operacional (`netfilter-persistent save`).
   * Volumes Docker (`oasis_pgdata` e `oasis_uploads`) verificados e montados corretamente.

