# Changelog

## 1.0.0 — Modernização e novo nome: LiveTalk (2026-10-24)

### Renomeação Ntalk → LiveTalk
- Nome exibido nas telas, título das páginas, rodapé, logs, README e `package.json` (`livetalk`).
- Cookie de sessão `ntalk.id` → `livetalk.id`. As sessões antigas deixam de valer e os usuários precisam entrar de novo.
- Chaves do Redis `ntalk:*` → `livetalk:*` (presença online, histórico do chat e canal do adapter). Esses dados são temporários; o histórico de chat anterior fica órfão no Redis.
- **Mantidos de propósito:** os bancos MongoDB `ntalk` / `ntalk_test`, para não perder usuários e contatos já cadastrados. Para mudar, defina `MONGODB_URI` depois de migrar os dados (`mongodump` / `mongorestore`).

### Estado anterior (0.0.1, 2021)
- `npm test` não executava nenhum teste (padrão `test/*.js`, mas os testes ficavam em `test/requests/`).
- Mongoose 4 / driver legado incompatível com MongoDB >= 5.1 (`Unsupported OP_QUERY command`): login e todo o CRUD quebrados.
- 57 vulnerabilidades em dependências (15 críticas, 27 altas).
- O consign carregava a pasta inexistente `events`, então `sockets/chat.js` nunca rodava. Em seu lugar, um handler de teste em `app.js` repassava HTML sem escape a todos os clientes.
- A sessão não era compartilhada com o Socket.IO, e os eventos de cliente e servidor tinham nomes divergentes (`join`/`create-room`, `notify-offline`/`notify-offlines`).

### Corrigido (segurança)
- **NoSQL injection no login**: `usuario[email][$ne]=x` permitia entrar como outro usuário. Agora as entradas são validadas e convertidas em texto.
- **IDOR**: o PUT de contato atualizava qualquer contato pelo id, sem verificar o dono. Agora todas as operações são restritas ao usuário da sessão.
- **XSS**: as views usavam `<%-` (sem escape), a página de erro exibia `error.message` cru e o chat usava `innerHTML`. Agora há escape em todas as saídas, CSP via Helmet e scripts externos.
- CSRF: token de sincronização em todos os POST/PUT/DELETE (o `csurf` estava instalado, mas sem uso).
- Sessão: segredo via `SESSION_SECRET` (obrigatório em produção), `regenerate` no login (evita *session fixation*), cookie `HttpOnly`/`SameSite=Lax`/`Secure`, `saveUninitialized: false`.
- Salas de chat geradas com `crypto.randomBytes` (antes: MD5 do timestamp, previsível). O parâmetro `sala` é validado.
- Socket.IO exige sessão autenticada.

### Corrigido (funcional)
- Chat real funcionando: histórico ao entrar na sala, entrada e saída de participantes, mensagens só na sala correta, notificação "Mensagem"/"Responder" na agenda e link correto (`?sala=`).
- Status online e offline com contagem de abas/conexões, sem spam O(n²) de eventos.
- Editar contato preserva o `_id`. Contato inexistente ou id inválido retorna 404 (antes: erro 500 ou redirecionamento silencioso).
- Erros de banco não são mais escondidos em `redirect('/')`: vão para a página de erro e para o log.
- Login com e-mail já cadastrado sob outro nome exibe uma mensagem clara.
- `bin/www.js` criava um segundo servidor na mesma porta: removido. `app.js` só escuta quando é executado diretamente.

### Atualizado
- express 4.15 → 5.2.1, ejs 2.5 → 3.1.10 (sintaxe `include()`), mongoose 4 → 8.24.5, socket.io 2 → 4.8.3, redis 2.8 → 4.7.1, connect-redis 3 → 7.1.1, socket.io-redis → @socket.io/redis-adapter 8.3, mocha 4 → 12, supertest 3 → 7.
- Removidas por não terem uso ou estarem obsoletas: body-parser (nativo no Express), cookie, cookie-parser, csurf (descontinuado), express-load, bluebird, forever-monitor (dependências vulneráveis; substituído por reinício automático de workers em `clusters.js` e `restart: unless-stopped` no Docker).
- `npm audit`: 0 vulnerabilidades.

### Removido
- `server.js` (forever), `bin/www.js`, `config.json` e `libs/redis_connect.js` antigo (sem uso, API inexistente), `views/exit.ejs` e `views/contatos/notify_script.ejs` (incorporados ao header e a `public/javascripts`), `test/requests/mocha.opts` (substituído por `.mocharc.json`). Os logs de 2021 deixaram de ser versionados.

### Adicionado
- UX: meta viewport, `lang`, labels, `required`/`type=email`, mensagens flash de sucesso e erro, estado vazio, confirmação antes de excluir, botões Voltar/Cancelar, status de conexão do chat, Enter para enviar, rolagem automática, *skip link*, foco visível, layout móvel.
- Ambiente: `docker-compose.yml`, `Dockerfile`, `.env.example`, `.nvmrc`, `.gitignore`, `.dockerignore`, scripts `dev`, `services:up` e `services:down`, encerramento gracioso (SIGTERM).
- Testes: de 12 (3 falhando, e os testes "logados" nunca autenticavam) para 30 passando, cobrindo CSRF, IDOR, XSS, NoSQL injection, 404, CRUD completo e sockets (autenticação, sala, histórico, online/offline).
