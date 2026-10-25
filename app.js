const express = require('express');
const path = require('node:path');
const http = require('node:http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const consign = require('consign');
const compression = require('compression');
const helmet = require('helmet');
const expressSession = require('express-session');
const RedisStore = require('connect-redis').default;
const methodOverride = require('method-override');
const config = require('./config');
const db = require('./libs/db_connect');
const redisConnect = require('./libs/redis_connect');
const error = require('./middlewares/error');
const csrf = require('./middlewares/csrf');
const flash = require('./middlewares/flash');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const redisDados = redisConnect.createClient('dados');
const redisPub = redisConnect.createClient('pub');
const redisSub = redisConnect.createClient('sub');
io.adapter(createAdapter(redisPub, redisSub, { key: config.socketAdapterKey }));

const session = expressSession({
  store: new RedisStore({ client: redisDados, prefix: config.redisStore.prefix }),
  resave: false,
  saveUninitialized: false,
  name: config.sessionKey,
  secret: config.sessionSecret,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure
  }
});

app.set('redis', redisDados);
app.set('trust proxy', config.trustProxy);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      upgradeInsecureRequests: config.isProduction ? [] : null
    }
  },
  strictTransportSecurity: config.isProduction
}));
app.use(compression());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: config.cache.maxAge }));
app.use(session);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(flash);
app.use(csrf.token);

io.engine.use(session);

consign({ verbose: false })
  .include('models')
  .then('controllers')
  .then('routes')
  .then('sockets')
  .into(app, io);

app.use(error.notFound);
app.use(error.serverError);

const ready = () => Promise.all([db.asPromise(), redisConnect.connectAll()]);

const start = async (port = config.port) => {
  await ready();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, resolve);
  });
  console.log(`LiveTalk no ar na porta ${server.address().port} (pid ${process.pid}, ${config.env}).`);
  return server;
};

const stop = async () => {
  io.disconnectSockets(true);
  await app.get('aguardarDesconexoes')();
  io.close();
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  await Promise.all([db.close(), redisConnect.quitAll()]);
};

module.exports = { app, server, io, ready, start, stop };

if (require.main === module) {
  const encerrar = () => stop().finally(() => process.exit(0));
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
  start().catch((err) => {
    console.error('Falha ao iniciar o LiveTalk:', err.message);
    process.exit(1);
  });
}
