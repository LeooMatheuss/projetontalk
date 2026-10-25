const db = require('../libs/db_connect.js');
const { Schema } = require('mongoose');

module.exports = () => {
  if (db.models.usuarios) {
    return db.models.usuarios;
  }
  const contato = new Schema({
    nome: { type: String, trim: true, maxlength: 60 },
    email: { type: String, trim: true, maxlength: 120 }
  });
  const usuario = new Schema({
    nome: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60
    },
    email: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: { unique: true }
    },
    contatos: [contato]
  });
  return db.model('usuarios', usuario);
};
