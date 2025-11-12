SELECT curso, COUNT(DISTINCT periodo)
FROM alunos
GROUP BY curso
HAVING COUNT(DISTINCT periodo) > 1;
