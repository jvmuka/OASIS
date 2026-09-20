# Plano de Implementação: Descrição, Taxa no Boleto e Gestão de Áreas Comuns

- **Data**: 2026-09-18
- **Status**: Aprovado conceitualmente / Aguardando execução
- **Branch base**: `correcoes-e-melhorias-gerais`

---

## 1. Visão Geral
Este plano descreve a implementação de três melhorias para o módulo de Áreas Comuns e Reservas do sistema OASIS:
1. **Taxa de Reserva & Descrição Geral**:
   - O Síndico/Administrador poderá definir uma descrição geral completa do espaço (regras, comodidades) e configurar se há taxa de reserva (R$).
   - **Regra de Exibição de Taxa**: Áreas gratuitas (`valor = 0`) não exibem nenhum aviso ou tag de gratuidade, mantendo a interface limpa. Áreas com cobrança (`valor > 0`) exibem o valor no card e avisos explícitos no agendamento e no modal de confirmação indicando que a cobrança será realizada via boleto condominial.
2. **Ocupação em Tempo Real de Áreas com Agendamento**:
   - Moradores visualizam diretamente nos cards de áreas reserváveis se o espaço está `Em uso agora` ou `Livre agora`, apurado dinamicamente a partir das reservas ativas no banco de dados.
3. **Áreas de Uso Livre (Sem Agendamento) & Controle da Portaria**:
   - Espaços que não requerem reserva prévia (ex.: piscina, academia, parquinho) ficam disponíveis para consulta de regras e ocupação pelos moradores.
   - **Visibilidade Condicional**: Se não houver nenhuma área de uso livre cadastrada, a seção/aba não é exibida para o morador.
   - **Painel do Porteiro**: Nova aba/tela (`/portaria/areas-livres`) para o porteiro alternar o status do espaço (`Livre` ou `Em Uso`) com 1 clique e registrar observações rápidas.

---

## 2. Alterações Arquiteturais e de Código

### 2.1 Banco de Dados (`backend/src/db/db.service.ts`)
Execução de auto-migração segura no `onModuleInit()`:
```sql
ALTER TABLE area_comum ALTER COLUMN descricao TYPE TEXT;
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS requer_reserva BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre VARCHAR(20) NOT NULL DEFAULT 'LIVRE';
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_observacao VARCHAR(255);
ALTER TABLE area_comum ADD COLUMN IF NOT EXISTS status_livre_porteiro VARCHAR(100);
```

### 2.2 Backend (`backend/src/areas/areas.module.ts` e `reservas.module.ts`)
- `GET /areas`: Retorna os novos campos e adiciona o campo booleano `em_uso_agora`, checando a vigência de reservas ativas no momento:
  ```sql
  EXISTS (
    SELECT 1 FROM reserva r
     WHERE r.id_area_comum = a.id_area_comum
       AND r.status = 'ATIVA'
       AND CURRENT_TIMESTAMP BETWEEN r.data_hora_inicio AND r.data_hora_fim
  ) AS em_uso_agora
  ```
- `POST /areas` e `PUT /areas/:id`: Persistência de `descricao`, `valor` e `requer_reserva`.
- `PATCH /areas/:id/status-livre`: Endpoint para `PORTEIRO` e `SINDICO` alternar `status_livre` (`LIVRE` / `EM_USO`) e atualizar `status_livre_observacao`, `status_livre_atualizado_em` e nome do porteiro.
- `reservas.module.ts`: Bloqueia criação de reserva caso `requer_reserva = false` ("Este espaço é de uso livre e não requer agendamento prévio").

### 2.3 Frontend

#### 2.3.1 Síndico (`frontend/src/pages/sindico/Areas.tsx`)
- Modal de criação e edição:
  - Textarea para **Descrição Geral**;
  - Seletor de modalidade: **Com Agendamento Prévio** vs **Uso Livre (Sem Agendamento)**;
  - Campo de **Taxa de Reserva (R$)** com aviso explicativo de lançamento no boleto.
- Tabela de áreas com coluna/badge identificando áreas livres vs reserváveis e valor da taxa quando existente.

#### 2.3.2 Morador (`frontend/src/pages/morador/NovaReserva.tsx`)
- Cards com indicação em tempo real de ocupação (`Livre agora` / `Em uso agora`).
- Badge de taxa visível **somente** se `valor > 0` (áreas com `valor = 0` não mostram nada de gratuidade).
- Alerta visual no resumo da reserva e no modal de confirmação para áreas com taxa informando a cobrança no boleto.
- Exibição de áreas livres apenas se `areasLivres.length > 0`.

#### 2.3.3 Portaria (`frontend/src/pages/porteiro/AreasLivres.tsx`) [NOVO]
- Nova tela com cards de cada área livre para alternar status em 1 clique (`Marcar como Em Uso` / `Liberar Área`) e observações.
- Rota registrada em `App.tsx` e menu em `Layout.tsx`.

---

## 3. Roteiro de Validação
1. Validar ausência de badges/mensagens de taxa em áreas gratuitas.
2. Validar alerta de cobrança no boleto em áreas com taxa (card, resumo e modal).
3. Validar se a ocupação em tempo real de áreas reserváveis reflete as reservas ativas.
4. Validar que a seção de áreas livres só aparece para o morador quando houver áreas livres ativas.
5. Validar a atualização do status livre pela portaria e o reflexo imediato para o morador.
