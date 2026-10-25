const path = require('node:path');
const fs = require('node:fs');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile) && process.env.NODE_ENV !== 'test') {
  process.loadEnvFile(envFile);
}

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const sessionKey = process.env.SESSION_NAME || 'livetalk.id';

const defaults = {
  development: {
    mongodb: 'mongodb://localhost:27017/ntalk',
    redis: 'redis://localhost:6379/0'
  },
  test: {
    mongodb: 'mongodb://localhost:27017/ntalk_test',
    redis: 'redis://localhost:6379/1'
  }
};

const fromEnv = (name, fallback) => {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
};

const sessionSecret = isProduction
  ? fromEnv('SESSION_SECRET')
  : process.env.SESSION_SECRET || 'livetalk_dev_secret_nao_use_em_producao';

module.exports = {
  env,
  isProduction,
  port: Number(process.env.PORT) || 3000,
  trustProxy: process.env.TRUST_PROXY === 'true',
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProduction,
  sessionKey,
  sessionSecret,
  mongodb: {
    uri: fromEnv('MONGODB_URI', defaults[env]?.mongodb)
  },
  redis: {
    url: fromEnv('REDIS_URL', defaults[env]?.redis)
  },
  redisStore: {
    prefix: `${sessionKey}:`
  },
  socketAdapterKey: `livetalk:socket.io:${env}`,
  chat: {
    maxHistorico: 200,
    maxMensagem: 1000
  },
  cache: {
    maxAge: 3600000
  }
};
