# Frontend — Interface web (React + Vite + Tailwind)

Interface do OASIS na porta **5173**.

## Rodar
```bash
npm install
npm run dev
```
Suba o backend antes. O Vite faz proxy de `/api` para `localhost:3000`,
então não é preciso configurar CORS.

## Telas por perfil
- **Morador:** nova reserva (grade de horários), minhas reservas, mural.
- **Porteiro:** encomendas (registrar + alterar status), chaves, mural.
- **Síndico:** painel, CRUD de áreas, CRUD de pessoas, publicar aviso, mural.

## Login de teste
Todos com a senha `Teste@2026` (valor de `DEV_SENHA` no backend):
`carlos.silva@teste.com` (morador), `roberto.lima@teste.com` (porteiro),
`ana.souza@teste.com` (síndica).

O cliente HTTP fica em `src/api.ts`: guarda o token, anexa o `Authorization`
em toda chamada e traduz os erros da API (inclusive as mensagens `RNxx`) para
exibição na tela.
