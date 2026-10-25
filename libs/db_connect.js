const mongoose = require('mongoose');
const config = require('../config');

const db = mongoose.createConnection(config.mongodb.uri, {
  serverSelectionTimeoutMS: 5000
});

db.on('error', (err) => console.error('[mongodb] erro de conexão:', err.message));

module.exports = db;
