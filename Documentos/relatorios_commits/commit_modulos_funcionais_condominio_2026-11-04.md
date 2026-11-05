# Relatório de Commit: Fase 2 - Módulos Funcionais e Feature Flags por Condomínio

**Data:** 04/11/2026  
**Branch:** `feat/arquitetura-multicondominio`  
**Tipo:** `feat` (Funcionalidade Modular / Feature Flags Multi-Condomínio)

---

## 1. 🎯 Objetivo da Alteração

Implementação da **Fase 2** do plano arquitetural multi-condomínio:
- Permitir que cada condomínio ative ou desative de forma independente funcionalidades do sistema OASIS (Modularização / Feature Flags).
- Permitir que o **Superadmin** administre o catálogo de módulos de cada condomínio com switches na interface `/superadmin/condominios`.
- Garantir passe-livre universal do Superadmin (omnipresence / bypass de módulos).
- Proteger rotas da API no backend com guard e decorator dedicado (`@ExigeModulo`, `ModuloGuard`).
- Ocultar no frontend abas, rotas e itens de navegação lateral para módulos inativos.
- Emitir atualizações em tempo real via SSE (`topico: 'MODULOS'`).

---

## 2. 🧱 Módulos Disponíveis no Catálogo

1. `RESERVAS_AREAS`: Reservas de Áreas Comuns (Salão, Churrasqueira, etc.)
2. `AREAS_LIVRES`: Áreas de Uso Livre (Academia, Piscina, monitoramento de lotação)
3. `ENCOMENDAS_PACOTES`: Gestão e Notificações de Encomendas
4. `CONTROLE_CHAVES`: Gestão de Empréstimo e Posse de Chaves
5. `MURAL_AVISOS`: Mural de Avisos e Comunicados Oficiais
6. `CHAMADOS_OCORRENCIAS`: Gestão Particular de Chamados e Avarias
7. `DEPENDENTES_FAMILIA`: Cadastro e Aprovação de Dependentes / Familiares

---

## 3. 🛠️ Modificações Realizadas

### 3.1. Banco de Dados (PostgreSQL 16)
- **Tabelas criadas**:
  - `modulo_sistema`: Catálogo de 7 módulos com código, nome, descrição, categoria, ícone e ordem.
  - `condominio_modulo`: Associação condomínio <-> módulo com status `ativo`, `data_ativacao`, `data_desativacao`.
- **Scripts sincronizados**:
  - `banco/migracoes/20261106_modulos_condominio.sql` (migração idempotente executada).
  - `banco/02_tabelas.sql` e `banco/oasis_banco_completo.sql`.
  - `backend/src/db/db.service.ts` (`onModuleInit` com autocriação e seeding de módulos padrão).

### 3.2. Backend (NestJS)
- **`backend/src/auth/modulo.guard.ts`**:
  - `@ExigeModulo('CODIGO_MODULO')`: Decorator de rota ou classe.
  - `ModuloGuard`: Intercepta requisições HTTP, consulta o status na tabela `condominio_modulo` e bloqueia requisições não autorizadas com `403 Forbidden`.
  - Superadmin universal bypass: se o usuário possui perfil `SUPERADMIN`, a rota é liberada independentemente do status do condomínio ativo.
- **Controladores Protegidos**:
  - `ChamadosController`: `@ExigeModulo('CHAMADOS_OCORRENCIAS')`
  - `ReservasController`: `@ExigeModulo('RESERVAS_AREAS')`
  - `AreasController`: `@ExigeModulo('RESERVAS_AREAS')`
  - `AvisosController`: `@ExigeModulo('MURAL_AVISOS')`
  - `PortariaController`: rotas segregadas com `@ExigeModulo('ENCOMENDAS_PACOTES')`, `@ExigeModulo('CONTROLE_CHAVES')`, `@ExigeModulo('AREAS_LIVRES')`
  - `CadastrosController`: rotas de dependentes com `@ExigeModulo('DEPENDENTES_FAMILIA')`
- **Sessão e Endpoints**:
  - `AuthService.gerarSessaoParaPessoa`: inclui `modulosAtivos: string[]` diretamente no payload da sessão.
  - `GET /api/auth/meus-modulos`: Retorna lista detalhada dos módulos do condomínio ativo.
  - `GET /api/superadmin/condominios/:id/modulos`: Lista módulos e status de qualquer condomínio.
  - `PATCH /api/superadmin/condominios/:id/modulos`: Ativa/desativa módulos em lote e emite SSE com `topico: 'MODULOS'`.

### 3.3. Frontend (React + Vite)
- **`frontend/src/contexts/ModulosContext.tsx`**:
  - Hook `useModulos()` provendo `modulosAtivos: string[]`, `temModulo(codigo: string): boolean`, `recarregarModulos()`.
  - Para o Superadmin, `temModulo` sempre retorna `true`.
- **`frontend/src/components/Layout.tsx`**:
  - Itens de menu lateral são ocultados dinamicamente se o condomínio atual não tiver o módulo habilitado.
- **`frontend/src/App.tsx`**:
  - `<Protegida modulo="CODIGO_MODULO">`: Redireciona para rota inicial se o usuário tentar acessar URL direta de recurso desativado.
- **`frontend/src/pages/superadmin/Condominios.tsx`**:
  - Botão de engrenagem ("Módulos do Condomínio") na listagem de condomínios.
  - Modal interativo com cards de cada módulo, ícones, descrição e switch de ativação/desativação.

---

## 4. 🧪 Testes Automatizados E2E

Executado o script `scratch/test_modulos_e2e.js` com validação de:
1. Autenticação e carga instantânea de módulos na sessão.
2. Consulta de catálogo `/api/auth/meus-modulos`.
3. Desativação de módulos via Superadmin (`CHAMADOS_OCORRENCIAS` e `ENCOMENDAS_PACOTES`).
4. Verificação de **Passe-Livre Universal (Bypass)** do Superadmin.
5. Bloqueio automático **403 Forbidden** com mensagem clara para moradores ao tentar acessar módulo desativado.
6. Reativação com liberação imediata (200 OK).

---

## 5. 📦 Arquivos Afetados

- `Documentos/README.md`
- `Documentos/planos_executados/plano_modulos_funcionais_condominio.md`
- `banco/02_tabelas.sql`
- `banco/oasis_banco_completo.sql`
- `banco/migracoes/20261106_modulos_condominio.sql`
- `backend/src/db/db.service.ts`
- `backend/src/auth/modulo.guard.ts`
- `backend/src/auth/guards.ts`
- `backend/src/auth/auth.module.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/superadmin/superadmin.controller.ts`
- `backend/src/sync/sync.service.ts`
- `backend/src/areas/areas.module.ts`
- `backend/src/reservas/reservas.module.ts`
- `backend/src/avisos/avisos.module.ts`
- `backend/src/portaria/portaria.module.ts`
- `backend/src/cadastros/cadastros.module.ts`
- `backend/src/chamados/chamados.module.ts`
- `frontend/src/api.ts`
- `frontend/src/contexts/ModulosContext.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/superadmin/Condominios.tsx`
