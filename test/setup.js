const config = require('../config');
const db = require('../libs/db_connect');
const { ready, stop, app } = require('../app');

exports.mochaHooks = {
  async beforeAll() {
    await ready();
    if (config.env !== 'test' || !db.name.endsWith('_test')) {
      throw new Error(`Testes devem rodar com NODE_ENV=test em um banco *_test (atual: ${config.env}/${db.name}).`);
    }
    await db.dropDatabase();
    await app.models.usuario.syncIndexes();
    await app.get('redis').flushDb();
  },
  async afterAll() {
    await stop();
  }
};
