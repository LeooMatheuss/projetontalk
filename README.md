<h1 align="center">LiveTalk</h1>

<p align="center">
  <strong>Agenda de contatos com presença online e chat em tempo real.</strong><br>
  Node.js · Express · Socket.IO · MongoDB · Redis
</p>

<p align="center">
  <a href="#visão-geral">Visão geral</a> ·
  <a href="#início-rápido">Início rápido</a> ·
  <a href="#configuração">Configuração</a> ·
  <a href="#testes">Testes</a> ·
  <a href="#implantação">Implantação</a> ·
  <a href="#referência-da-api">API</a> ·
  <a href="#segurança">Segurança</a>
</p>

---

## Visão geral

O **LiveTalk** é uma aplicação web em tempo real. Cada usuário mantém a própria agenda de contatos, vê quem está online no momento e conversa em salas de chat que podem ser compartilhadas por link.

| Recurso | Descrição |
|---|---|
| **Acesso sem atrito** | Entrada com nome + e-mail. A conta é criada no primeiro acesso. |
| **Agenda de contatos** | Cadastro, consulta, edição e exclusão, isolados por usuário. |
| **Presença em tempo real** | O status *Online* / *Offline* de cada contato é atualizado instantaneamente. |
| **Chat em salas** | Salas com identificador aleatório, histórico persistente e convite por link. |
| **Notificações** | Quando um contato envia uma mensagem, a agenda mostra *Mensagem* e o botão *Responder*. |
| **Escalável** | Modo cluster com sincronização de eventos entre processos via Redis. |

### Como funciona

```
 Navegador ──HTTP──▶ Express (EJS, sessão, CSRF) ──▶ MongoDB   usuários e contatos
     │                         │
     └──WebSocket──▶ Socket.IO ┴──────────────────▶ Redis     sessões, presença,
                      (adapter Redis entre workers)            histórico do chat
```

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 22 LTS (mínimo 20.12) |
| Servidor web | Express 5, EJS 3, Helmet, compression |
| Tempo real | Socket.IO 4 + `@socket.io/redis-adapter` |
| Banco de dados | MongoDB 7 via Mongoose 8 |
| Sessão e cache | Redis 7 via `connect-redis` |
| Testes | Mocha, should, supertest, socket.io-client |
| Infraestrutura | Docker, Docker Compose, Node Cluster |

## Início rápido

**Pré-requisitos:** [Node.js 22](https://nodejs.org/) e [Docker](https://docs.docker.com/get-docker/). Se preferir não usar Docker, instale MongoDB e Redis localmente.

```bash
git clone <url-do-repositorio> livetalk
cd livetalk
npm install
npm run services:up   # MongoDB e Redis em containers (acessíveis só em 127.0.0.1)
npm run dev           # http://localhost:3000
```

Para experimentar o chat, abra duas janelas anônimas e entre com usuários diferentes. Em cada uma, cadastre o outro usuário como contato.

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia um único processo (desenvolvimento) |
| `npm start` | Inicia em modo cluster, um worker por CPU, com reinício automático |
| `npm test` | Executa a suíte de testes |
| `npm run services:up` | Sobe MongoDB e Redis via Docker Compose |
| `npm run services:down` | Para os serviços |

## Configuração

Toda a configuração vem de variáveis de ambiente. Em desenvolvimento, todas têm padrões funcionais. Para personalizar, copie o modelo:

```bash
cp .env.example .env
```

O arquivo `.env` é carregado automaticamente, exceto quando `NODE_ENV=test`.

| Variável | Padrão (desenvolvimento) | Observação |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` ou `production` |
| `PORT` | `3000` | |
| `SESSION_SECRET` | segredo de desenvolvimento | **Obrigatória em produção.** Sem ela, a aplicação não inicia. |
| `MONGODB_URI` | `mongodb://localhost:27017/ntalk` | Obrigatória em produção |
| `REDIS_URL` | `redis://localhost:6379/0` | Obrigatória em produção |
| `TRUST_PROXY` | `false` | Use `true` atrás de proxy reverso |
| `COOKIE_SECURE` | `true` em produção | O cookie de sessão só trafega em HTTPS |
| `SESSION_NAME` | `livetalk.id` | Nome do cookie de sessão |
| `WEB_CONCURRENCY` | nº de CPUs | Quantidade de workers no modo cluster |

Para gerar um segredo forte:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Estrutura do projeto

```
├── app.js               Composição da aplicação (Express + HTTP + Socket.IO)
├── clusters.js          Entrada de produção: gerencia os workers
├── config.js            Configuração centralizada
├── controllers/         Regras de cada tela (home, contatos, chat)
├── routes/              Mapeamento das rotas HTTP
├── sockets/             Eventos de tempo real (presença e chat)
├── models/              Schemas do Mongoose
├── middlewares/         Autenticação, CSRF, mensagens flash, erros
├── libs/                Conexões com MongoDB e Redis, validação
├── views/               Templates EJS
├── public/              CSS e JavaScript do cliente
└── test/                Testes HTTP (requests/) e de tempo real (sockets/)
```

Os módulos são carregados automaticamente pelo **consign** na ordem `models → controllers → routes → sockets` e recebem `(app, io)`.

## Testes

```bash
npm run services:up
npm test
```

A suíte cobre os fluxos de autenticação, o CRUD de contatos, o controle de acesso entre usuários, a proteção contra CSRF, XSS e NoSQL injection, e o chat (autenticação do socket, salas, histórico e presença).

> **Atenção:** os testes usam o banco `ntalk_test` e o Redis DB `1`, que são **apagados a cada execução**. Por proteção, a suíte se recusa a rodar se o banco não terminar em `_test`.

## Implantação

### Docker Compose

```bash
echo "SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" >> .env
docker compose up -d --build
```

O Compose sobe a aplicação em modo cluster junto com MongoDB e Redis. Inclui *healthchecks*, reinício automático e volumes persistentes (`mongo-data` e `redis-data`).

### Requisitos de produção

- **HTTPS:** publique a aplicação atrás de um proxy reverso com TLS (Nginx, Caddy, Traefik etc.) e defina `TRUST_PROXY=true`. O cookie de sessão é `secure`, então o login não funciona em HTTP puro. Para testar a imagem localmente sem TLS, use `COOKIE_SECURE=false`.
- **WebSocket:** o proxy precisa repassar os cabeçalhos `Upgrade` e `Connection`. O cliente usa apenas WebSocket, então o cluster dispensa *sticky sessions*.
- **Encerramento gracioso:** a aplicação trata `SIGTERM` e `SIGINT`. Ela desconecta os clientes, conclui as operações pendentes e fecha as conexões com os bancos.

### Backup e restauração

```bash
docker compose exec mongo mongodump --archive > livetalk-$(date +%F).dump
docker compose exec -T mongo mongorestore --archive < livetalk-AAAA-MM-DD.dump
```

## Referência da API

### Rotas HTTP

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| `GET` | `/` | público | Tela de entrada |
| `POST` | `/entrar` | público + CSRF | Entrar ou criar conta (`usuario[nome]`, `usuario[email]`) |
| `GET` | `/sair` | público | Encerrar sessão |
| `GET` | `/contatos` | autenticado | Listar contatos |
| `POST` | `/contato` | autenticado + CSRF | Criar contato (`contato[nome]`, `contato[email]`) |
| `GET` | `/contato/:id` | autenticado | Detalhes do contato |
| `GET` | `/contato/:id/editar` | autenticado | Formulário de edição |
| `PUT` | `/contato/:id` | autenticado + CSRF | Atualizar (formulário: `POST ?_method=PUT`) |
| `DELETE` | `/contato/:id` | autenticado + CSRF | Excluir (formulário: `POST ?_method=DELETE`) |
| `GET` | `/chat[?sala=<id>]` | autenticado | Abrir sala. Sem `sala` válida, cria uma nova. |

Contatos de outros usuários ou com id inválido retornam `404`.

### Eventos Socket.IO

A conexão exige uma sessão autenticada. Sem ela, é recusada com o erro `não autenticado`.

| Direção | Evento | Payload |
|---|---|---|
| cliente → servidor | `create-room` | `sala`: 32 caracteres hexadecimais |
| cliente → servidor | `send-server` | `msg`: texto de até 1000 caracteres |
| servidor → cliente | `history` | `[{ tipo, nome, msg, ts }]` |
| servidor → sala | `send-client` | `{ tipo: 'mensagem' \| 'sistema', nome, msg, ts }` |
| servidor → todos | `notify-onlines` · `notify-offlines` | `email` |
| servidor → demais | `new-message` | `{ email, sala }` |
| servidor → cliente | `chat-error` | mensagem de erro |

## Segurança

- Proteção CSRF em todas as operações que alteram dados.
- Cabeçalhos de segurança e *Content Security Policy* via Helmet. Não há scripts inline.
- Escape de toda saída nos templates. As mensagens do chat são exibidas como texto puro.
- Validação e normalização de entradas, com proteção contra NoSQL injection.
- Isolamento de dados por usuário em todas as consultas.
- Sessão regenerada no login, cookie `HttpOnly` / `SameSite=Lax` / `Secure`.
- Identificadores de sala gerados com `crypto.randomBytes`.

### Limitações conhecidas

| Item | Detalhe |
|---|---|
| Autenticação sem senha | Por design, o acesso usa apenas nome + e-mail. Não é adequado a dados sensíveis sem incluir uma etapa de verificação. |
| Privacidade das salas | Uma sala é acessível a quem conhece o link. O aviso `new-message` é enviado a todos os usuários conectados. |
| Presença após falhas | Se um processo cair abruptamente, um usuário pode continuar aparecendo como online até a próxima reconexão. |
| Logout via GET | A rota `/sair` não exige token CSRF (impacto baixo). |

## Roadmap

- [ ] Autenticação com senha ou link mágico por e-mail
- [ ] Notificações de mensagem direcionadas só aos contatos do remetente
- [ ] Logout via `POST`
- [ ] Pipeline de CI com testes e auditoria de dependências

## Histórico

Projeto originalmente desenvolvido em 2021 com o nome **Ntalk**, inspirado no exemplo do livro *Node.js: Aplicações web real-time* (Caio Ribeiro Pereira), e modernizado e renomeado para **LiveTalk** em 2026. Por compatibilidade com os dados existentes, os bancos MongoDB continuam se chamando `ntalk` e `ntalk_test`. Os detalhes de cada versão estão no [CHANGELOG](CHANGELOG.md).
