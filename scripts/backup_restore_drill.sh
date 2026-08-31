#!/usr/bin/env bash
# 백업·복구 리허설 (NFR-01 검증 수단)
#
# 무엇을 하나: 격리된 임시 컨테이너에 v2 스키마와 합성 데이터를 넣고
#             pg_dump → 컨테이너 파괴 → pg_restore → 체크섬 비교까지 자동 수행.
# 안전성    : 운영 볼륨(ledger_db_data)을 절대 건드리지 않는다. 포트 5433, 별도 볼륨.
# 사용법    : bash scripts/backup_restore_drill.sh
# 근거      : docs/재설계/07_보안_NFR.md §4, docs/재설계/adr/ADR-011-복구-이중화.md
set -euo pipefail

C=ledger_drill
WORK=$(mktemp -d)
trap 'docker rm -f -v "$C" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "[0] 격리 컨테이너 기동 (운영 볼륨 미접촉)"
docker rm -f -v "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -e POSTGRES_DB=ledger -e POSTGRES_USER=ledger \
  -e POSTGRES_PASSWORD=drillonly -p 5433:5432 postgres:16 >/dev/null
for _ in $(seq 1 30); do docker exec "$C" pg_isready -U ledger >/dev/null 2>&1 && break; sleep 1; done

say "[1] v2 스키마 + 합성 데이터 (거래 22,047 / 분류 302 / 규칙 8,521)"
docker exec -i "$C" psql -U ledger -d ledger -q <<'SQL'
CREATE TABLE categories(id serial PRIMARY KEY, parent_id int REFERENCES categories(id),
  code varchar(11), name varchar(100) NOT NULL, kind varchar(20) NOT NULL DEFAULT 'consumption',
  is_active boolean NOT NULL DEFAULT true);
CREATE TABLE accounts(id serial PRIMARY KEY, institution varchar(50) NOT NULL,
  name varchar(100) NOT NULL, type varchar(20) NOT NULL);
CREATE TABLE transactions(id bigserial PRIMARY KEY, occurred_at timestamp NOT NULL,
  amount numeric(14,2) NOT NULL, type varchar(10) NOT NULL,
  account_id int REFERENCES accounts(id), category_id int REFERENCES categories(id),
  raw_merchant text, item_name text, biz_no varchar(20), external_ref varchar(50),
  bearer varchar(10) NOT NULL DEFAULT 'self', balance_after numeric(14,2),
  is_cancelled boolean NOT NULL DEFAULT false, source varchar(20) NOT NULL, batch_id uuid);
CREATE INDEX ix_tx_occurred ON transactions(occurred_at);
CREATE INDEX ix_tx_category ON transactions(category_id);
CREATE UNIQUE INDEX ux_tx_extref ON transactions(external_ref) WHERE external_ref IS NOT NULL;
CREATE TABLE merchant_rules(id serial PRIMARY KEY, match_type varchar(20) NOT NULL,
  pattern text NOT NULL, biz_no varchar(20), category_id int REFERENCES categories(id),
  confidence numeric(4,3));
INSERT INTO accounts(institution,name,type) VALUES
 ('우리은행','입출금','bank'),('우체국','파킹통장','bank'),('KB','체크카드','card'),('네이버페이','간편결제','pay');
INSERT INTO categories(code,name,kind,is_active)
SELECT lpad(g::text,11,'0'),'cat_'||g,
  CASE WHEN g%17=0 THEN 'saving' WHEN g%23=0 THEN 'investment' WHEN g%31=0 THEN 'transfer' ELSE 'consumption' END,
  (g<=132) FROM generate_series(1,302) g;
INSERT INTO transactions(occurred_at,amount,type,account_id,category_id,raw_merchant,item_name,
  biz_no,external_ref,bearer,balance_after,is_cancelled,source,batch_id)
SELECT timestamp '2018-01-01'+(g%3100)*interval '1 day'+(g%86400)*interval '1 second',
  round((random()*90000+500)::numeric,2), CASE WHEN g%40=0 THEN 'income' ELSE 'expense' END,
  1+(g%4), 1+(g%132), 'merchant_'||(g%3000), 'item_'||(g%8521), lpad((g%9000)::text,10,'0'),
  'APV'||lpad(g::text,10,'0'), CASE WHEN g%7=0 THEN 'child' ELSE 'self' END,
  round((random()*5000000)::numeric,2), (g%97=0),
  CASE WHEN g%3=0 THEN 'bank' WHEN g%3=1 THEN 'card' ELSE 'oppadu' END, gen_random_uuid()
FROM generate_series(1,22047) g;
INSERT INTO merchant_rules(match_type,pattern,category_id,confidence)
SELECT 'item_exact','item_'||g,1+(g%132),0.97 FROM generate_series(0,8520) g;
SQL

CK="SELECT 'tx_count' k,count(*)::text v FROM transactions
UNION ALL SELECT 'tx_sum',to_char(sum(amount),'FM9999999999.00') FROM transactions
UNION ALL SELECT 'tx_cancel',count(*)::text FROM transactions WHERE is_cancelled
UNION ALL SELECT 'tx_child',count(*)::text FROM transactions WHERE bearer='child'
UNION ALL SELECT 'cat_active',count(*)::text FROM categories WHERE is_active
UNION ALL SELECT 'rule_cnt',count(*)::text FROM merchant_rules
UNION ALL SELECT 'digest',md5(string_agg(id||':'||amount||':'||coalesce(external_ref,''),',' ORDER BY id)) FROM transactions
ORDER BY 1;"
docker exec "$C" psql -U ledger -d ledger -t -A -F'|' -c "$CK" > "$WORK/before.txt"

say "[2] pg_dump"
time docker exec "$C" pg_dump -U ledger -d ledger -Fc > "$WORK/backup.dump"
ls -lh "$WORK/backup.dump" | awk '{print "    덤프 크기:",$5}'

say "[3] 재해 시뮬레이션 — 컨테이너+볼륨 완전 삭제"
docker rm -f -v "$C" >/dev/null
docker run -d --name "$C" -e POSTGRES_DB=ledger -e POSTGRES_USER=ledger \
  -e POSTGRES_PASSWORD=drillonly -p 5433:5432 postgres:16 >/dev/null
for _ in $(seq 1 30); do docker exec "$C" pg_isready -U ledger >/dev/null 2>&1 && break; sleep 1; done

say "[4] pg_restore"
time docker exec -i "$C" pg_restore -U ledger -d ledger --no-owner < "$WORK/backup.dump"
docker exec "$C" psql -U ledger -d ledger -t -A -c \
 "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public')||' 테이블, '||
         (SELECT count(*) FROM pg_indexes WHERE schemaname='public')||' 인덱스'" | sed 's/^/    복구 객체: /'

say "[5] 멱등성 (FR-28) — 부분 유니크 인덱스는 ON CONFLICT에 조건 명시 필수"
docker exec "$C" psql -U ledger -d ledger -t -A -c "
INSERT INTO transactions(occurred_at,amount,type,external_ref,source)
SELECT occurred_at,amount,type,external_ref,source FROM transactions WHERE external_ref IS NOT NULL
ON CONFLICT (external_ref) WHERE external_ref IS NOT NULL DO NOTHING;
SELECT '    재실행 후 건수: '||count(*) FROM transactions;"

say "[6] 배치 롤백 (FR-36)"
docker exec "$C" psql -U ledger -d ledger -t -A -c "
WITH b AS (SELECT gen_random_uuid() bid)
INSERT INTO transactions(occurred_at,amount,type,external_ref,source,batch_id)
SELECT now(),1000,'expense','DRILL'||g,'bank',(SELECT bid FROM b) FROM generate_series(1,200) g;
DELETE FROM transactions WHERE batch_id=(SELECT batch_id FROM transactions WHERE external_ref LIKE 'DRILL%' LIMIT 1);
SELECT '    롤백 후 건수: '||count(*) FROM transactions;"

say "[7] 판정"
docker exec "$C" psql -U ledger -d ledger -t -A -F'|' -c "$CK" > "$WORK/after.txt"
if diff -q "$WORK/before.txt" "$WORK/after.txt" >/dev/null; then
  printf '\033[32m    ✅ PASS — 체크섬 7종 완전 일치. 복구 가능성 확인\033[0m\n'
else
  printf '\033[31m    ❌ FAIL\033[0m\n'; diff "$WORK/before.txt" "$WORK/after.txt"; exit 1
fi
