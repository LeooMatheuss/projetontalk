const { isValidObjectId } = require('mongoose');

const EMAIL = /^[^\s@]+@[^\s@]+$/;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

exports.pessoa = (dados) => {
  const nome = texto(dados?.nome);
  const email = texto(dados?.email);
  const erros = [];
  if (!nome) erros.push('Informe o nome.');
  else if (nome.length > 60) erros.push('O nome deve ter no máximo 60 caracteres.');
  if (!EMAIL.test(email)) erros.push('Informe um e-mail válido.');
  else if (email.length > 120) erros.push('O e-mail deve ter no máximo 120 caracteres.');
  return { valores: { nome, email }, erros };
};

exports.objectId = (valor) => typeof valor === 'string' && isValidObjectId(valor) && /^[a-f0-9]{24}$/i.test(valor);

exports.sala = (valor) => typeof valor === 'string' && /^[a-f0-9]{32}$/.test(valor);
