#!/usr/bin/env bash
# Runs every migration and the SQL integration tests against a throwaway local PostgreSQL (needs the postgres user / psql).
set -euo pipefail
DB=${1:-tt_test}
PSQL="psql -q -v ON_ERROR_STOP=1 -d $DB"
dropdb --if-exists "$DB"; createdb "$DB"
$PSQL -f tests/sql/stub.sql
for f in supabase/migrations/*.sql supabase/seed.sql; do $PSQL -f "$f"; done
$PSQL -f tests/sql/integration.sql
