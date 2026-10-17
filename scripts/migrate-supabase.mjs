import fs from 'node:fs';
import path from 'node:path';

/**
 * Executa um arquivo de migration no Supabase Cloud via Management API.
 *
 * Uso:
 *   node --env-file=.env.local scripts/migrate-supabase.mjs [caminho-da-migration.sql]
 *
 * Sem argumento, executa a migration inicial. Requer SUPABASE_ACCESS_TOKEN e
 * NEXT_PUBLIC_SUPABASE_URL (o ref do projeto é extraído da URL).
 */
async function migrate() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!token || !url) {
    console.error('Defina SUPABASE_ACCESS_TOKEN e NEXT_PUBLIC_SUPABASE_URL no .env.local.');
    process.exit(1);
  }
  const ref = new URL(url).hostname.split('.')[0];

  const file = process.argv[2] ?? 'supabase/migrations/20261011000000_init_regulaon.sql';
  const sqlPath = path.resolve(file);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Executando ${path.basename(sqlPath)} no Supabase Cloud (Ref: ${ref})...`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Erro na migration (Status ${res.status}):`, errorText);
    process.exit(1);
  }

  const result = await res.json();
  console.log('Migration executada com sucesso no Supabase PostgreSQL!');
  console.log('Resultado:', result);
}

migrate();
