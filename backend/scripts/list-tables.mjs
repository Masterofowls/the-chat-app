import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const { rows } = await client.query(`
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and table_schema in ('public', 'test')
  order by table_schema, table_name
`);
console.log(rows.map((row) => `${row.table_schema}.${row.table_name}`).join("\n"));
await client.end();
