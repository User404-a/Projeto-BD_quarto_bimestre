const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'seu_usuario',
  password: 'sua_senha',
  database: 'seu_banco'
});
client.connect(err => {
  if (err) console.log('Erro:', err);
  else {
    console.log('Conectado ao PostgreSQL');
    client.end();
  }
});
