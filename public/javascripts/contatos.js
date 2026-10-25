(function () {
  var socket = io({ transports: ['websocket'] });

  var linhasDo = function (email) {
    return Array.prototype.filter.call(
      document.querySelectorAll('tr[data-email]'),
      function (tr) { return tr.getAttribute('data-email') === email; }
    );
  };

  var notificar = function (email, texto, classe) {
    linhasDo(email).forEach(function (tr) {
      var status = tr.querySelector('.js-status');
      status.textContent = texto;
      status.className = 'label js-status' + (classe ? ' ' + classe : '');
    });
  };

  socket.on('notify-onlines', function (email) {
    notificar(email, 'Online', 'label-success');
  });

  socket.on('notify-offlines', function (email) {
    notificar(email, 'Offline');
  });

  socket.on('new-message', function (data) {
    notificar(data.email, 'Mensagem', 'label-warning');
    linhasDo(data.email).forEach(function (tr) {
      var link = tr.querySelector('.js-chat');
      link.href = '/chat?sala=' + encodeURIComponent(data.sala);
      link.textContent = 'Responder';
    });
  });
})();
