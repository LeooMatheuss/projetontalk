const redis = require('redis');
const config = require('../config');

const clients = [];

exports.createClient = (nome) => {
  const client = redis.createClient({ url: config.redis.url });
  client.on('error', (err) => console.error(`[redis:${nome}] erro:`, err.message));
  clients.push(client);
  return client;
};

exports.connectAll = () => Promise.all(
  clients.filter((c) => !c.isOpen).map((c) => c.connect())
);

exports.quitAll = () => Promise.all(
  clients.filter((c) => c.isOpen).map((c) => c.quit())
);
