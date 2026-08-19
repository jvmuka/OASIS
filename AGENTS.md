# Diretrizes e Regras Gerais do Projeto OASIS

## 1. Relatório de Alterações em Commits e Push Remoto
- **Obrigatoriedade**: Sempre que for realizado um commit e envio (`git push`) para o repositório remoto, deve ser gerado um relatório detalhado das mudanças realizadas na branch.
- **Estrutura do Relatório**:
  1. **Identificação**: Nome da branch, autor e data/horário.
  2. **Objetivo**: Descrição do que foi implementado, corrigido ou refatorado.
  3. **Resumo das Alterações**:
     - Arquivos criados, modificados ou excluídos.
     - Camadas impactadas (`backend`, `frontend`, `banco`).
  4. **Detalhamento Técnico**:
     - Endpoints/rotas adicionadas ou modificadas.
     - Componentes ou telas criadas/atualizadas.
     - Alterações no esquema de banco de dados ou regras de negócio (gatilhos/constraints).
  5. **Procedimento de Validação**: Passos executados ou recomendados para validar as alterações localmente.
- **Apresentação**: O relatório deve ser exibido de forma clara no chat e/ou registrado no repositório conforme o fluxo de trabalho estabelecido.

## 2. Padrões de Desenvolvimento
- Manter todas as comunicações, documentações e mensagens em português do Brasil.
- Tom estritamente profissional, técnico e conciso, sem emojis.
- Respeitar a arquitetura em três camadas (NestJS, React/Vite, PostgreSQL).
- As regras de negócio críticas residem nos gatilhos e constraints do banco de dados; a API atua como mediadora e tradutora de exceções.
