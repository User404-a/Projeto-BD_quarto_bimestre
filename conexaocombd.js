const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'seu_usuario',
  password: 'sua_senha',
  database: 'seu_banco'
});

client.connect()
  .then(() => console.log('Conectado ao PostgreSQL'))
  .catch(err => console.error('Erro de conexão:', err));

module.exports = client;
