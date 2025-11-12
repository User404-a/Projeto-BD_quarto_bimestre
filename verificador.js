const { Pool } = require('pg');

const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'seu_usuario',
  password: 'sua_senha',
  database: 'seu_banco',
  ssl: false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};

const pool = new Pool(dbConfig);
const schema = 'public';

pool.on('error', err => {
  console.error('Erro inesperado no pool de conexões:', err);
  process.exit(-1);
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conexão estabelecida com sucesso.');
    await client.query('SET search_path TO ' + schema);
    client.release();
    return true;
  } catch (err) {
    console.error('Falha ao conectar com o PostgreSQL:', err);
    return false;
  }
};

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    await client.query('SET search_path TO ' + schema);
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Erro ao executar query:', error);
    throw error;
  } finally {
    client.release();
  }
};

const transaction = async callback => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET search_path TO ' + schema);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na transação:', error);
    throw error;
  } finally {
    client.release();
  }
};

async function pegarTabelas() {
  const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema='${schema}'`;
  const res = await query(sql);
  return res.rows.map(r => r.table_name);
}

async function pegarColunas(tabela) {
  const sql = `SELECT column_name FROM information_schema.columns WHERE table_name='${tabela}'`;
  const res = await query(sql);
  return res.rows.map(r => r.column_name);
}

function gerarCombinacoes(array, tamanho) {
  if (tamanho === 0) return [[]];
  if (tamanho > array.length) return [];
  const [primeiro, ...resto] = array;
  const comPrimeiro = gerarCombinacoes(resto, tamanho - 1).map(c => [primeiro, ...c]);
  const semPrimeiro = gerarCombinacoes(resto, tamanho);
  return [...comPrimeiro, ...semPrimeiro];
}

function gerarArgumentos(colunas, maxEsq = 3) {
  const argumentos = [];
  colunas.forEach(dir => {
    const restantes = colunas.filter(c => c !== dir);
    for (let tam = 1; tam <= Math.min(maxEsq, colunas.length - 1); tam++) {
      const combinacoes = gerarCombinacoes(restantes, tam);
      combinacoes.forEach(esq => argumentos.push({ esq, dir }));
    }
  });
  return argumentos;
}

async function testarDependencia(tabela, esq, dir) {
  const cond = [...esq, dir].map(c => `"${c}" IS NOT NULL`).join(' AND ');
  const group = esq.map(c => `"${c}"`).join(', ');
  const sql = `
    SELECT 1
    FROM ${schema}.${tabela}
    WHERE ${cond}
    GROUP BY ${group}
    HAVING COUNT(DISTINCT "${dir}") > 1
    LIMIT 1;
  `;
  const res = await query(sql);
  return res.rowCount === 0;
}

async function verificarTabela(tabela) {
  const colunas = await pegarColunas(tabela);
  const argumentos = gerarArgumentos(colunas);
  const validas = [];
  const inicio = Date.now();

  for (const arg of argumentos) {
    const valida = await testarDependencia(tabela, arg.esq, arg.dir);
    if (valida) validas.push(`${arg.esq.join(', ')} -> ${arg.dir}`);
  }

  const tempo = ((Date.now() - inicio) / 1000).toFixed(3);
  console.log(`Tabela: ${tabela}`);
  validas.forEach(d => console.log('✔', d));
  console.log(`Tempo total: ${tempo}s\n`);
}

async function verificarTodas() {
  const ok = await testConnection();
  if (!ok) return;
  const tabelas = await pegarTabelas();
  for (const tabela of tabelas) {
    await verificarTabela(tabela);
  }
  pool.end();
}

verificarTodas();
