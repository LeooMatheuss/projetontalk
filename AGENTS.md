# AGENTS.md

> Projeto **LiveTalk** (antigo Ntalk). Os bancos MongoDB mantêm o nome `ntalk` por compatibilidade com os dados existentes.

- Runtime: Node 22 (`.nvmrc`). Dependências fixadas em versões exatas, com lockfile.
- Serviços: `npm run services:up` (MongoDB 7 + Redis 7 via docker compose).
- Testes: `npm test` (Mocha; apaga o banco `ntalk_test` e o Redis DB 1). A suíte deve terminar com 0 falhas.
- Dev: `npm run dev` (processo único). Cluster: `npm start`.
- Auditoria: `npm audit` deve reportar 0 vulnerabilidades.
- Convenções: código e mensagens em português; módulos carregados pelo consign (`models` → `controllers` → `routes` → `sockets`) com assinatura `(app, io)`.
- Views: use sempre `<%= %>` para dados. Não use scripts inline (a CSP bloqueia); coloque o JS em `public/javascripts`.
- Rotas que alteram estado devem usar `autenticar` e o middleware `csrf.verificar`. Consultas a contatos devem filtrar pelo `_id` do usuário da sessão.
