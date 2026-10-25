(function () {
  var app = document.getElementById('chat-app');
  var sala = app.getAttribute('data-sala');
  var chat = document.getElementById('chat');
  var form = document.getElementById('chat-form');
  var campo = document.getElementById('msg');
  var botao = document.getElementById('chat-enviar');
  var status = document.getElementById('chat-status');
  var socket = io({ transports: ['websocket'] });

  var definirEstado = function (texto, conectado) {
    status.textContent = texto;
    campo.disabled = !conectado;
    botao.disabled = !conectado;
  };

  var exibir = function (mensagem) {
    var linha = document.createElement('p');
    linha.className = 'chat-linha' + (mensagem.tipo === 'sistema' ? ' chat-sistema' : '');
    if (mensagem.nome) {
      var autor = document.createElement('strong');
      autor.textContent = mensagem.nome + ': ';
      linha.appendChild(autor);
    }
    linha.appendChild(document.createTextNode(mensagem.msg));
    if (mensagem.ts) {
      linha.title = new Date(mensagem.ts).toLocaleString('pt-BR');
    }
    chat.appendChild(linha);
    chat.scrollTop = chat.scrollHeight;
  };

  socket.on('connect', function () {
    chat.textContent = '';
    definirEstado('Conectado.', true);
    socket.emit('create-room', sala);
    campo.focus();
  });

  socket.on('disconnect', function () {
    definirEstado('Conexão perdida. Tentando reconectar...', false);
  });

  socket.on('connect_error', function (err) {
    definirEstado(err.message === 'não autenticado'
      ? 'Sua sessão expirou. Entre novamente.'
      : 'Não foi possível conectar ao chat. Tentando novamente...', false);
  });

  socket.on('history', function (mensagens) {
    mensagens.forEach(exibir);
  });

  socket.on('send-client', exibir);

  socket.on('chat-error', function (texto) {
    status.textContent = texto;
  });

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    var msg = campo.value.trim();
    if (!msg || !socket.connected) return;
    socket.emit('send-server', msg);
    campo.value = '';
    campo.focus();
  });
})();
