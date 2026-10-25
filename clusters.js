const cluster = require('node:cluster');
const os = require('node:os');

if (cluster.isPrimary) {
  const total = Number(process.env.WEB_CONCURRENCY) || os.availableParallelism();
  const maxReinicios = 10;
  let reinicios = 0;
  let encerrando = false;

  for (let i = 0; i < total; i += 1) cluster.fork();

  cluster.on('listening', (worker) => {
    console.log(`Cluster ${worker.process.pid} conectado`);
  });
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Cluster ${worker.process.pid} finalizado (${signal || code})`);
    if (encerrando || code === 0) return;
    if (reinicios >= maxReinicios) {
      console.error(`Limite de ${maxReinicios} reinícios atingido; worker não será recriado.`);
      return;
    }
    reinicios += 1;
    setTimeout(() => cluster.fork(), 1000);
  });

  const encerrar = () => {
    encerrando = true;
    Object.values(cluster.workers).forEach((worker) => worker.process.kill('SIGTERM'));
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
} else {
  const { start, stop } = require('./app');
  const encerrar = () => stop().finally(() => process.exit(0));
  process.once('SIGINT', encerrar);
  process.once('SIGTERM', encerrar);
  start().catch((err) => {
    console.error(`Falha ao iniciar worker ${process.pid}:`, err.message);
    process.exit(1);
  });
}
