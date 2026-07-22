import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: "postgresql://postgres.acecvqmgbywgthagkcha:SolutionDhahabu%402025@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
});

// uuidv7 conforme RFC 9562 - format: tttttttttttt-7xxx-Vxxx-xxxx-xxxxxxxxxxxx
// tttttttttttt = 12 hex chars (ms timestamp), version=7, variant=8/9/a/b
const sql = `
CREATE OR REPLACE FUNCTION public.uuidv7() RETURNS uuid AS $$
declare
  v_ms  bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  v_ts  text   := lpad(to_hex(v_ms), 12, '0');
  v_r1  text   := lpad(to_hex(floor(random() * 4096)::int), 3, '0');
  v_r2  text   := lpad(to_hex((8 + floor(random() * 4)::int) * 4096 + floor(random() * 4096)::int), 4, '0');
  v_r3  text   := lpad(to_hex(floor(random() * 65536)::int), 4, '0');
  v_r4  text   := lpad(to_hex(floor(random() * 4294967296)::bigint), 8, '0');
begin
  -- format: 8-4-4-4-12 hex chars with dashes
  -- groups: [ts:8]-[ts:4]-[7xxx]-[Vxxx]-[rrrrrrrrrrrr]
  return (
    substring(v_ts, 1, 8) || '-' ||
    substring(v_ts, 9, 4) || '-' ||
    '7' || v_r1            || '-' ||
    v_r2                   || '-' ||
    v_r3 || v_r4
  )::uuid;
end;
$$ LANGUAGE plpgsql VOLATILE;
`;

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    const test = await client.query('SELECT uuidv7()::text AS uid');
    console.log('Fonction uuidv7() corrigee. Test:', test.rows[0].uid);
    await client.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
