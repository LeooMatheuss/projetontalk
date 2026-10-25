const crypto = require('node:crypto');
const validacao = require('../libs/validacao');

module.exports = (app) => {
  const ChatController = {
    index(req, res) {
      const { sala } = req.query;
      if (!validacao.sala(sala)) {
        const novaSala = crypto.randomBytes(16).toString('hex');
        return res.redirect(`/chat?sala=${novaSala}`);
      }
      return res.render('chat/index', { sala });
    }
  };
  return ChatController;
};
