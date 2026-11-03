#!/usr/bin/env bash
# End-to-end: real PostgreSQL + PostgREST + the real Next.js app. Run as root on a machine with postgresql installed and a PostgREST binary at $POSTGREST.
set -euo pipefail
cd "$(dirname "$0")/.."
POSTGREST=${POSTGREST:-/tmp/postgrest}; DB=tt_e2e
ANON=$(node tests/e2e/keys.mjs anon); SERVICE=$(node tests/e2e/keys.mjs service)
pg_ctlcluster 16 main start 2>/dev/null || true; sleep 2
pkill -f "$POSTGREST" 2>/dev/null || true; pkill -f tests/e2e/proxy.mjs 2>/dev/null || true; pkill -f "next start" 2>/dev/null || true; ps -eo pid,comm | awk '$2 ~ /^next-server/ {print $1}' | xargs -r kill 2>/dev/null || true; sleep 1
su postgres -c "dropdb --if-exists $DB; createdb $DB; psql -q -v ON_ERROR_STOP=1 -d $DB -f $PWD/tests/sql/stub.sql" 2>&1 | grep -v "wal_level\|HINT" || true
for f in supabase/migrations/*.sql supabase/seed.sql; do su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB -f $PWD/$f"; done
su postgres -c "psql -q -d $DB -c \"do \\\$\\\$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login password 'authpw'; end if; end \\\$\\\$; grant anon, authenticated, service_role to authenticator;\""
cat > /tmp/pgrst.conf <<CONF
db-uri = "postgres://authenticator:authpw@127.0.0.1:5432/$DB"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "super-secret-jwt-token-with-at-least-32-characters-long"
server-port = 3000
CONF
$POSTGREST /tmp/pgrst.conf >/tmp/pgrst.log 2>&1 & 
node tests/e2e/proxy.mjs & sleep 3
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON SUPABASE_SERVICE_ROLE_KEY=$SERVICE
if [ -z "${SKIP_BUILD:-}" ]; then rm -rf .next; npx next build >/tmp/next-build.log 2>&1 || { tail -30 /tmp/next-build.log; exit 1; }; fi
npx next start -p 3100 >/tmp/next-start.log 2>&1 &
for i in $(seq 1 40); do curl -sf -o /dev/null http://127.0.0.1:3100/menu && curl -sf -o /dev/null "http://127.0.0.1:54321/rest/v1/products?limit=1" && break; sleep 1; done
trap 'ps -eo pid,comm | awk "\$2 ~ /^next-server/ {print \$1}" | xargs -r kill 2>/dev/null; pkill -f "next start" 2>/dev/null; pkill -f tests/e2e/proxy.mjs 2>/dev/null; pkill -f "$POSTGREST" 2>/dev/null' EXIT
if [ -n "${HOLD:-}" ]; then sleep "$HOLD"; fi
node --test --test-concurrency=1 tests/e2e/*.test.mjs
