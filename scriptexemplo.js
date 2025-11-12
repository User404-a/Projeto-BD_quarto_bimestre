const db = require('./conexaocombd');

const tabela = 'alunos';
const atributos = ['ra', 'nome', 'curso', 'periodo'];

async function testar(A, B) {
  if (A === B) return;

  const sql = `
    SELECT 1
    FROM ${tabela}
    GROUP BY "${A}"
    HAVING COUNT(DISTINCT "${B}") > 1;
  `;
  const res = await db.query(sql);
  const valida = res.rowCount === 0;
  console.log(`${A} -> ${B}: ${valida ? 'válida' : 'inválida'}`);
}

async function main() {
  for (const A of atributos) {
    for (const B of atributos) {
      await testar(A, B);
    }
  }
  db.end();
}

main();
