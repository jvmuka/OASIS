# Plano de Implementação: Otimização da Tela "Minhas Reservas"

**Data:** 09/10/2026  
**Contexto:** OASIS - Módulo do Morador  
**Objetivo:** Alinhar o comportamento da tela de agendamentos e reservas do morador com o padrão de excelência das telas de Avisos e Encomendas, exibindo por padrão apenas reservas futuras/ativas, disponibilizando filtros para histórico/concluídas e adicionando filtro específico por área comum.

---

## 1. Diagnóstico do Estado Atual

Na versão atual da tela `MinhasReservas`:
1. **Filtro Padrão Inicial:** Abre selecionado em `Todas`, fazendo com que o morador veja imediatamente uma lista cheia de reservas passadas (`CONCLUÍDA`, `CANCELADA`) em vez do que ele tem agendado para o futuro.
2. **Ausência de Filtro por Área Comum:** Se o morador utiliza com frequência múltiplas áreas (Academia, Salão de Festas, Churrasqueira), não há como filtrar ou buscar por espaço específico.
3. **Ordenação no Backend:** A rota `GET /api/reservas/minhas` ordena estritamente por `data_hora_inicio DESC`. Quando não filtrado, reservas antigas recentes misturam-se sem priorização visual clara de proximidade cronológica dos próximos eventos.

---

## 2. Requisitos e Regras de Negócio

### R1. Exibição Padrão Prioritária (Futuras / Ativas)
- Ao acessar a página, o estado inicial do filtro de status deve ser **"Futuras / Ativas"** (`FUTURAS`).
- Apenas reservas com status `ATIVA` e cujo horário de término ainda não tenha passado (`data_hora_fim >= agora`) devem ser listadas por padrão.
- Se não houver reservas futuras, apresentar o componente `EmptyState` com mensagem acolhedora: *"Você não possui reservas futuras agendadas no momento"* e botão de atalho para *"Agendar Espaço"*.

### R2. Filtro por Abas de Status com Contadores
Adotar a mesma experiência do Mural de Avisos e de Encomendas:
- **Aba 1 (Padrão): "Futuras / Ativas"**  
  Badge com a contagem de reservas futuras pendentes (ex: `Futuras (2)` ou `0`).
- **Aba 2: "Concluídas / Histórico"**  
  Lista de agendamentos que já foram finalizados (`CONCLUÍDA`) ou cancelados (`CANCELADA`).
- **Aba 3: "Todas as Reservas"**  
  Visão unificada de todo o histórico do morador.

### R3. Filtro Dinâmico por Área Comum
- Adicionar um seletor suspenso (`<select>`) elegante e responsivo alinhado aos botões de status.
- Opção inicial: `"Todas as áreas"`.
- Lista populada dinamicamente com os nomes das áreas comuns disponíveis (ex: *Academia*, *Churrasqueira 1*, *Piscina*, *Salão de Festas*).
- O filtro funciona cumulativamente com a aba de status (ex: "Academia" + "Histórico" ou "Salão de Festas" + "Futuras").

### R4. Ordenação Cronológica Inteligente
- **Para Reservas Futuras:** Ordenação cronológica crescente (`ASC`), colocando a reserva mais próxima de acontecer no topo da lista (próximo evento primeiro).
- **Para Histórico / Encerradas:** Ordenação decrescente (`DESC`), colocando a mais recente concluída no topo.
- **No Backend (`reservas.module.ts`):** 
  Ajustar a consulta SQL de `GET /api/reservas/minhas` para ordenar prioritariamente:
  ```sql
  ORDER BY 
    (CASE WHEN r.status = 'ATIVA' AND r.data_hora_fim >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END),
    CASE WHEN r.status = 'ATIVA' AND r.data_hora_fim >= CURRENT_TIMESTAMP THEN r.data_hora_inicio END ASC,
    r.data_hora_inicio DESC
  ```

### R5. Paginação
- Manter o limite estrito de **20 itens por página**, utilizando o componente `<Paginacao />`.
- Resetar a página para `1` sempre que o usuário alternar de aba de status ou mudar o filtro de área comum.

---

## 3. Arquitetura e Arquivos Impactados

| Camada | Arquivo | Alteração |
|---|---|---|
| **Frontend** | `frontend/src/pages/morador/MinhasReservas.tsx` | - Mudar estado inicial para `FUTURAS`<br>- Implementar badges de contagem nas abas<br>- Adicionar select de filtro por área comum<br>- Ordenação inteligente (próximas primeiro)<br>- Reset de paginação nos filtros |
| **Backend** | `backend/src/reservas/reservas.module.ts` | - Atualizar a cláusula `ORDER BY` do endpoint `GET /api/reservas/minhas` para priorizar ativas/futuras em ordem ascendente |
| **Deploy/Runtime** | Docker Compose | - Recompilar frontend e backend para disponibilizar em `localhost:5173` |

---

## 4. Plano de Execução Passo a Passo

1. **Backend:**
   - Atualizar a ordenação em `backend/src/reservas/reservas.module.ts` para que reservas futuras venham primeiro por ordem de aproximação (`ASC`), seguidas por histórico (`DESC`).
2. **Frontend:**
   - Atualizar `MinhasReservas.tsx`:
     - Definir `const [filtroStatus, setFiltroStatus] = useState<'FUTURAS' | 'HISTORICO' | 'TODAS'>('FUTURAS')`.
     - Definir `const [filtroArea, setFiltroArea] = useState<string>('TODAS')`.
     - Extrair a lista única de áreas registradas e ordenar alfabeticamente.
     - Calcular contadores: `totalFuturas`, `totalHistorico`, `totalGeral`.
     - Adicionar barra de filtros contendo as 3 abas com badges e o `<select>` de área comum estilizado com tema claro/escuro.
     - Ajustar lógica de filtragem e ordenação no cliente.
3. **Validação & Testes:**
   - Testar navegação entre as abas (Futuras, Histórico, Todas).
   - Testar combinação de filtro por área comum com cada aba.
   - Testar cancelamento de reserva futura dentro e fora do prazo.
   - Validar contadores e paginação de 20 itens.
4. **Build & Atualização no Docker:**
   - Executar `docker compose up -d --build` para que as alterações fiquem disponíveis imediatamente no ambiente em execução.
