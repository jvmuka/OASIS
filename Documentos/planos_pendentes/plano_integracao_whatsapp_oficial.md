# Plano de Implementação: Notificações Automáticas via API Oficial do WhatsApp (Meta Cloud API)

**Data:** 15/10/2026  
**Sistema:** OASIS - Sistema de Gestão Condominial  
**Status:** Planejado para Implementação  
**Objetivo:** Integrar a **API Oficial do WhatsApp (WhatsApp Business Cloud API / Meta Graph API v21.0+)** ao OASIS para envio automático e seguro de notificações no WhatsApp de moradores e condôminos em dois momentos críticos:
1. **Chegada e registro de Encomenda na Portaria** (destinatário individual).
2. **Publicação de Comunicados e Avisos no Mural** (disparo em lote para todos os moradores ou blocos específicos).

---

## 1. Visão Geral e Arquitetura da Solução

### 1.1. Por que usar a API Oficial (Cloud API da Meta)?
* **Estabilidade e Confiabilidade:** Sem risco de banimento de número (diferente de automações não oficiais com emuladores de Web WhatsApp / Baileys).
* **Alta Disponibilidade e Escalabilidade:** Infraestrutura hospedada diretamente nos data centers da Meta, com suporte a alta taxa de disparos (80+ mensagens por segundo).
* **Templates Auditados e Categoria Utilidade:** Entregabilidade garantida com selo institucional e modelo de mensagens homologado pela Meta.

### 1.2. Regra Fundamental da Meta: Message Templates (Modelos de Mensagem)
Como o sistema OASIS precisa iniciar a conversa com o morador (mensagem ativa/outbound), a Meta exige o uso de **Message Templates** pré-aprovados na categoria **`UTILITY`** (Utilidade/Transacional).
* Mensagens de texto livre só são permitidas quando o morador responde ao WhatsApp do condomínio (abrindo a *Janela de Serviço ao Cliente de 24 horas*).
* Portanto, as notificações de encomendas e avisos serão implementadas estritamente via **Templates homologados**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      FLUXO DE NOTIFICAÇÃO NO OASIS                     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│  PORTARIA REGISTRA ENCOMENDA     │        │    SÍNDICO PUBLICA NOVO AVISO    │
│  (POST /portaria/encomendas)     │        │       (POST /avisos)             │
└────────────────┬─────────────────┘        └────────────────┬─────────────────┘
                 │                                           │
                 │ Destinatário único                        │ Em lote (Mural / Bloco)
                 ▼                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SERVIÇO DE FILA: WhatsappQueueService                     │
│  • Consulta telefone(s) na tabela `pessoa` (campo `celular`)                │
│  • Valida se `pessoa.whatsapp_opt_in = TRUE` e perfil ativo                  │
│  • Normaliza telefone para formato internacional E.164 (+55 DDD 9XXXXXXXX)   │
│  • Enfileira na tabela `notificacao_whatsapp` (status 'PENDENTE')            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     DISPARADOR: WhatsappClientService                        │
│  • Dispara POST https://graph.facebook.com/v21.0/{PHONE_ID}/messages         │
│  • Autenticação: Bearer System User Token permanente                         │
│  • Payload: Template 'oasis_nova_encomenda' ou 'oasis_novo_aviso'            │
│  • Salva o `wamid` (ID único da Meta) e atualiza status para 'ENVIADO'       │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                   WEBHOOK DE STATUS: WhatsappWebhookController               │
│  • Recebe callbacks da Meta: 'sent' -> 'delivered' -> 'read' / 'failed'      │
│  • Atualiza auditoria e telemetria no banco de dados                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modelos de Mensagem (Templates Meta) a Homologar

### 2.1. Template de Encomenda: `oasis_nova_encomenda`
* **Categoria:** `UTILITY`
* **Idioma:** `pt_BR` (Português - Brasil)
* **Cabeçalho (Opcional):** Texto: `📦 OASIS - Encomenda Chegou`
* **Corpo (Body):**
  > Olá, **{{1}}**! Uma nova encomenda foi recebida na portaria do condomínio.
  >
  > 📦 **Descrição:** {{2}}
  > 📏 **Porte:** {{3}}
  > 📍 **Local de Retirada:** Portaria Principal
  >
  > Por gentileza, compareça à portaria apresentando documento para retirar.
* **Rodapé (Footer):** `Sistema de Gestão Condominial OASIS`
* **Parâmetros Dinâmicos:**
  * `{{1}}` = Nome do Morador (ex: *Gabriel Silva*)
  * `{{2}}` = Descrição/Código (ex: *Pacote Mercado Livre / Correios*)
  * `{{3}}` = Porte da encomenda (ex: *PEQUENO*, *MEDIO*, *GRANDE*)

### 2.2. Template de Aviso Geral: `oasis_novo_aviso`
* **Categoria:** `UTILITY`
* **Idioma:** `pt_BR`
* **Cabeçalho (Opcional):** Texto: `📢 OASIS - Comunicado do Condomínio`
* **Corpo (Body):**
  > Olá, **{{1}}**! A administração do condomínio publicou um novo comunicado oficial:
  >
  > 📌 **Título:** {{2}}
  > 📝 **Resumo:** {{3}}
  >
  > Acesse o aplicativo ou portal OASIS para conferir o comunicado na íntegra.
* **Rodapé (Footer):** `Condomínio Residencial OASIS`
* **Botão de Ação Rápida (URL Dinâmica):**
  * Tipo: `URL`
  * Texto: `Ver no Portal`
  * URL: `https://oasis.seucondominio.com.br/morador/avisos`

---

## 3. Alterações no Banco de Dados (PostgreSQL 16)

### 3.1. Preferências de WhatsApp na Tabela `pessoa`
Adicionar preferências de consentimento (opt-in) para conformidade com a LGPD e políticas da Meta:

```sql
-- Adiciona controle de opt-in de WhatsApp para cada pessoa
ALTER TABLE pessoa
  ADD COLUMN IF NOT EXISTS whatsapp_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS whatsapp_valido BOOLEAN NOT NULL DEFAULT TRUE;
```

### 3.2. Nova Tabela de Auditoria e Fila: `notificacao_whatsapp`
Para garantir que nenhuma notificação se perca e manter histórico de entrega:

```sql
DO $$ BEGIN
    CREATE TYPE tipo_notificacao_whatsapp_enum AS ENUM ('ENCOMENDA', 'AVISO', 'SISTEMA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_disparo_whatsapp_enum AS ENUM ('PENDENTE', 'ENVIANDO', 'ENVIADO', 'ENTREGUE', 'LIDO', 'FALHA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS notificacao_whatsapp (
    id_notificacao_whatsapp  SERIAL PRIMARY KEY,
    id_pessoa                INTEGER NOT NULL REFERENCES pessoa(id_pessoa) ON DELETE CASCADE,
    telefone_destino         VARCHAR(20) NOT NULL,
    tipo                     tipo_notificacao_whatsapp_enum NOT NULL,
    referencia_id            INTEGER, -- id_encomenda ou id_aviso
    template_nome            VARCHAR(100) NOT NULL,
    payload_enviado          JSONB NOT NULL,
    whatsapp_message_id      VARCHAR(128), -- wamid retornado pela Meta
    status                   status_disparo_whatsapp_enum NOT NULL DEFAULT 'PENDENTE',
    tentativas               INTEGER NOT NULL DEFAULT 0,
    erro_mensagem            TEXT,
    data_hora_criacao        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_hora_envio          TIMESTAMP,
    data_hora_entrega        TIMESTAMP,
    data_hora_leitura        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notif_wpp_pessoa ON notificacao_whatsapp(id_pessoa);
CREATE INDEX IF NOT EXISTS idx_notif_wpp_status ON notificacao_whatsapp(status);
CREATE INDEX IF NOT EXISTS idx_notif_wpp_wamid ON notificacao_whatsapp(whatsapp_message_id);
```

---

## 4. Implementação no Backend (NestJS)

### 4.1. Novo Módulo: `backend/src/whatsapp/`
O módulo será isolado e reutilizável em qualquer ponto da aplicação:

```
backend/src/whatsapp/
├── whatsapp.module.ts            # Registro do módulo, controladores e providers
├── whatsapp.service.ts           # Cliente HTTP da Meta Graph API (envio de templates)
├── whatsapp-queue.service.ts     # Fila interna assíncrona com controle de taxa e retentativas
├── whatsapp.controller.ts        # Endpoint para teste manual e consulta de telemetria
├── whatsapp-webhook.controller.ts# Webhook da Meta (validação de token e status receipt)
├── whatsapp.constants.ts         # Nomes de templates, endpoints e status
└── utils/
    └── phone-formatter.util.ts   # Higienização de celular brasileiro para padrão E.164 (+55)
```

### 4.2. Formatação e Higienização de Telefone Brasileiro (`phone-formatter.util.ts`)
A Meta exige formato E.164 estrito (ex: `5511987654321`):
* Remove parênteses, traços, espaços e símbolos.
* Valida DDD (2 dígitos) e número com o nono dígito (9 dígitos).
* Adiciona o código do país do Brasil (`55`) caso o usuário tenha preenchido apenas `(11) 98765-4321`.
* Rejeita números fixos (iniciados com dígitos de 2 a 5) ou sequências inválidas.

### 4.3. Envio Assíncrono e Resiliente (`whatsapp-queue.service.ts`)
* Quando o síndico publica um aviso para 200 moradores, o endpoint `POST /avisos` responde imediatamente com HTTP 201.
* A fila interna processa os disparos em segundo plano com intervalo seguro (ex: 20 a 40 disparos/segundo), evitando sobrecarga de rede e respeitando os limites da Meta.
* Caso ocorra erro temporário de rede ou rate limit (HTTP 429), a notificação é reagendada com recuo exponencial (*exponential backoff*).

### 4.4. Integração com a Portaria (`portaria.module.ts`)
No endpoint `POST /portaria/encomendas`:
```typescript
// Após o INSERT com sucesso da encomenda:
await this.whatsappQueue.enfileirarNotificacaoEncomenda({
  id_encomenda: encomenda.id_encomenda,
  id_pessoa_destinatario: b.id_pessoa_destinatario,
  descricao: b.descricao || 'Pacote sem descrição',
  tamanho: b.tamanho,
});
```

### 4.5. Integração com os Avisos (`avisos.module.ts`)
No endpoint `POST /avisos`:
```typescript
// Se o aviso estiver publicado imediatamente (data_hora_publicacao <= agora):
await this.whatsappQueue.enfileirarNotificacaoAviso({
  id_aviso: aviso.id_aviso,
  titulo: b.titulo,
  conteudo: b.conteudo,
  escopo: 'MURAL',
});
```

---

## 5. Variáveis de Ambiente Necessárias (`.env`)

Adicionar ao arquivo `.env` e `.env.exemplo`:

```ini
# ==================================================
# Integração Oficial WhatsApp Business (Meta Cloud API)
# ==================================================
WHATSAPP_ENABLED=true
WHATSAPP_API_URL=https://graph.facebook.com/v21.0
WHATSAPP_PHONE_NUMBER_ID=109283746592817
WHATSAPP_WABA_ID=283746192837465
WHATSAPP_ACCESS_TOKEN=EAAG...TokenPermanenteSystemUser...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=oasis_whatsapp_webhook_secret_2026
WHATSAPP_APP_SECRET=a1b2c3d4e5f6...

# Nomes dos Templates aprovados na Meta
WHATSAPP_TEMPLATE_ENCOMENDA=oasis_nova_encomenda
WHATSAPP_TEMPLATE_AVISO=oasis_novo_aviso
```

---

## 6. Configuração no Painel da Meta for Developers (Passo a Passo)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CONFIGURAÇÃO NO META FOR DEVELOPERS                  │
├───────┬────────────────────────────────────────────────────────────────┤
│ Passo │ Ação Necessária                                                │
├───────┼────────────────────────────────────────────────────────────────┤
│   1   │ Criar conta empresarial no Meta Business Manager               │
│       │ (business.facebook.com) e vincular o CNPJ do condomínio/gestora│
├───────┼────────────────────────────────────────────────────────────────┤
│   2   │ Criar um App do tipo "Business" em developers.facebook.com     │
│       │ e adicionar o produto "WhatsApp".                              │
├───────┼────────────────────────────────────────────────────────────────┤
│   3   │ Cadastrar o número de telefone oficial do condomínio e         │
│       │ verificar via SMS ou ligação telefônica.                       │
├───────┼────────────────────────────────────────────────────────────────┤
│   4   │ Criar os Message Templates no Gerenciador do WhatsApp:         │
│       │ • 'oasis_nova_encomenda' (categoria UTILITY)                   │
│       │ • 'oasis_novo_aviso' (categoria UTILITY)                       │
│       │ (Aprovação geralmente leva entre 2 minutos e 2 horas).         │
├───────┼────────────────────────────────────────────────────────────────┤
│   5   │ Criar um "System User" (Usuário do Sistema) com perfil Admin   │
│       │ e gerar um Token de Acesso Permanente sem expiração com        │
│       │ escopo `whatsapp_business_messaging`.                          │
├───────┼────────────────────────────────────────────────────────────────┤
│   6   │ Configurar o Webhook:                                          │
│       │ URL: https://api.oasis.seucondominio.com.br/whatsapp/webhook   │
│       │ Inscrever-se nos tópicos: `messages`.                          │
└───────┴────────────────────────────────────────────────────────────────┘
```

---

## 7. Ajustes no Frontend

### 7.1. Cadastro e Perfil do Morador
* Campo `celular` com máscara padronizada `(XX) 9XXXX-XXXX` e indicação visual de que o número é usado para notificações via WhatsApp.
* Toggle/Checkbox: *"Receber avisos e notificações de encomendas pelo WhatsApp"*.

### 7.2. Tela de Registro de Encomendas (Portaria)
* Feedback visual ao registrar a encomenda:
  * Exibição de um badge verde: *"📲 Notificação WhatsApp enviada para o morador"* caso o morador possua celular válido.
  * Alerta cinza: *"⚠️ Morador sem celular cadastrado para WhatsApp"* caso não possua.

### 7.3. Tela de Publicação de Avisos (Síndico)
* Checkbox opcional na publicação: *"Enviar comunicado também por WhatsApp para os moradores"*.
* Exibição de contagem estimada de destinatários habilitados.

---

## 8. Cronograma de Execução em Fases

| Fase | Etapa | Entregáveis |
|---|---|---|
| **Fase 1** | **Infraestrutura Meta & Banco** | • Criação do app na Meta e submissão dos 2 templates.<br>• Migration da tabela `notificacao_whatsapp` e colunas na tabela `pessoa`.<br>• Configuração das variáveis de ambiente. |
| **Fase 2** | **Módulo Base do Backend** | • `WhatsappModule` e `phone-formatter.util.ts`.<br>• `WhatsappService` integrado à API REST Graph da Meta.<br>• Testes unitários de formatação de número e disparo isolado. |
| **Fase 3** | **Fila e Integração com Negócio** | • `WhatsappQueueService` com controle de concorrência e retentativas.<br>• Disparo automático ao registrar encomenda (`portaria.module.ts`).<br>• Disparo em lote ao publicar aviso (`avisos.module.ts`). |
| **Fase 4** | **Webhook e Telemetria** | • `WhatsappWebhookController` para atualização dos recibos de entrega (`sent`/`delivered`/`read`).<br>• Logs estruturados de auditoria de disparos. |
| **Fase 5** | **Interface & Homologação** | • Badges e preferências no frontend.<br>• Testes ponta a ponta com números de homologação e validação de entrega real. |
