import { useEffect, useState } from "react";

const API = "http://localhost:8000";
const won = (n: number) => "₩" + Math.abs(n).toLocaleString("ko-KR");

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// 상태 색상
const STATUS: Record<string, { bar: string; label: string; text: string }> = {
  ok: { bar: "#22c55e", label: "여유", text: "#16a34a" },
  near: { bar: "#f59e0b", label: "임박", text: "#b45309" },
  over: { bar: "#ef4444", label: "초과", text: "#dc2626" },
};

type Cat = { id: number; name: string; color: string | null; budget: number | null; spent: number; status: string | null; is_override: boolean };
type Status = {
  month: string;
  total: { budget: number | null; spent: number; remaining: number | null; days_left: number; daily_suggest: number | null; status: string | null; is_override: boolean };
  categories: Cat[];
  uncategorized: number;
};

export default function BudgetView() {
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<Status | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});

  function load() {
    fetch(`${API}/budget/status?month=${month}`).then((r) => r.json()).then((d: Status) => {
      setData(d);
      const io: Record<string, string> = { total: d.total.budget != null ? String(d.total.budget) : "" };
      d.categories.forEach((c) => { io["c" + c.id] = c.budget != null ? String(c.budget) : ""; });
      setInputs(io);
    });
  }
  useEffect(() => { load(); }, [month]);

  async function saveBudget(scope_type: string, ref: number | null, key: string, period: string) {
    const v = inputs[key] ?? "";
    await fetch(`${API}/budget/set`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope_type, scope_ref: ref, period, amount: v.trim() === "" ? null : Number(v) }),
    });
    load();
  }
  async function setOverride(scope_type: string, ref: number | null, label: string) {
    const cur = inputs[scope_type === "total" ? "total" : "c" + ref] ?? "";
    const v = prompt(`${label} — ${month}만 예산 (비우면 기본값 사용)`, cur);
    if (v === null) return;
    await fetch(`${API}/budget/set`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope_type, scope_ref: ref, period: month, amount: v.trim() === "" ? null : Number(v) }),
    });
    load();
  }

  if (!data) return <div style={S.page}>불러오는 중…</div>;
  const [y, m] = month.split("-").map(Number);
  const t = data.total;
  const pct = (spent: number, budget: number | null) => (budget && budget > 0 ? Math.min(100, (spent / budget) * 100) : 0);

  return (
    <div style={S.page}>
      <div style={S.head}>
        <h1 style={S.h1}>예산</h1>
        <div style={S.monthNav}>
          <button onClick={() => setMonth(shiftMonth(month, -1))} style={S.navBtn}>‹</button>
          <span style={S.monthLabel}>{y}년 {m}월</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} style={S.navBtn}>›</button>
        </div>
      </div>

      {/* 총예산 */}
      <div style={S.card}>
        <div style={S.totalHead}>
          <span style={S.cardTitle}>전체 예산 {t.status && <span style={{ ...S.badge, background: STATUS[t.status].bar + "22", color: STATUS[t.status].text }}>{STATUS[t.status].label}</span>}{t.is_override && <span style={S.ovBadge}>이 달만</span>}</span>
          <div style={S.setBox}>
            <input value={inputs.total ?? ""} onChange={(e) => setInputs({ ...inputs, total: e.target.value })} onBlur={() => saveBudget("total", null, "total", "*")} placeholder="기본 월예산" style={S.setInput} />
            <button onClick={() => setOverride("total", null, "전체")} style={S.ovBtn}>이 달만</button>
          </div>
        </div>
        <div style={S.bigNum}>
          <span style={{ color: t.status === "over" ? "#dc2626" : "#111827" }}>{won(t.spent)}</span>
          <span style={S.ofBudget}> / {t.budget != null ? won(t.budget) : "예산 미설정"}</span>
        </div>
        {t.budget != null && (
          <>
            <div style={S.barBg}><div style={{ ...S.barFill, width: `${pct(t.spent, t.budget)}%`, background: STATUS[t.status ?? "ok"].bar }} /></div>
            <div style={S.subInfo}>
              남음 {won(t.remaining ?? 0)}{t.days_left > 0 && ` · 남은 ${t.days_left}일`}{t.daily_suggest != null && ` · 하루 권장 ${won(t.daily_suggest)}`}
            </div>
          </>
        )}
      </div>

      {/* 카테고리별 */}
      <div style={S.card}>
        <div style={S.cardTitle}>카테고리별 (대분류)</div>
        <div style={S.catList}>
          {data.categories.map((c) => (
            <div key={c.id} style={S.catRow}>
              <div style={S.catTop}>
                <span style={S.catName}><span style={{ ...S.dot, background: c.color ?? "#9ca3af" }} />{c.name}
                  {c.status && <span style={{ ...S.badge, background: STATUS[c.status].bar + "22", color: STATUS[c.status].text }}>{STATUS[c.status].label}</span>}
                  {c.is_override && <span style={S.ovBadge}>이 달만</span>}
                </span>
                <span style={S.catAmt}>
                  {won(c.spent)} <span style={S.catBud}>/ {c.budget != null ? won(c.budget) : "—"}</span>
                </span>
              </div>
              <div style={S.barBg}><div style={{ ...S.barFill, width: `${pct(c.spent, c.budget)}%`, background: c.budget != null ? STATUS[c.status ?? "ok"].bar : "#e5e7eb" }} /></div>
              <div style={S.catSet}>
                <input value={inputs["c" + c.id] ?? ""} onChange={(e) => setInputs({ ...inputs, ["c" + c.id]: e.target.value })} onBlur={() => saveBudget("category", c.id, "c" + c.id, "*")} placeholder="예산 없음" style={S.catInput} />
                <button onClick={() => setOverride("category", c.id, c.name)} style={S.ovBtnSm}>이 달만</button>
              </div>
            </div>
          ))}
          {data.uncategorized > 0 && (
            <div style={S.catRow}>
              <div style={S.catTop}>
                <span style={S.catName}><span style={{ ...S.dot, background: "#9ca3af" }} />미분류</span>
                <span style={S.catAmt}>{won(data.uncategorized)} <span style={S.catBud}>/ —</span></span>
              </div>
              <div style={S.uncHint}>분류 안 된 소비 (총예산엔 포함). 거래에 카테고리를 지정하면 위 항목으로 이동해요.</div>
            </div>
          )}
        </div>
      </div>

      <div style={S.hint}>※ 예산은 신경 쓰고 싶은 카테고리만 매기면 돼요. 안 매긴 건 총예산으로만 관리됩니다. 저축·이체는 예산 대상이 아니에요(현금흐름에서).</div>
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  h1: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px" },
  monthNav: { display: "flex", alignItems: "center", gap: 12 },
  navBtn: { width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 17, cursor: "pointer", color: "#374151" },
  monthLabel: { fontSize: 16, fontWeight: 700 },
  card: { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 },
  badge: { fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5 },
  ovBadge: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: "#eef2ff", color: "#4338ca" },
  totalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  setBox: { display: "flex", gap: 6, alignItems: "center" },
  setInput: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", width: 120 },
  ovBtn: { padding: "6px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#6b7280", fontFamily: "inherit", cursor: "pointer" },
  bigNum: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums", marginBottom: 12 },
  ofBudget: { fontSize: 15, color: "#9ca3af", fontWeight: 600 },
  barBg: { height: 10, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 5, transition: "width .2s" },
  subInfo: { fontSize: 12.5, color: "#6b7280", marginTop: 8 },
  catList: { display: "flex", flexDirection: "column", gap: 16, marginTop: 14 },
  catRow: {},
  catTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  catName: { display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600 },
  dot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  catAmt: { fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  catBud: { color: "#9ca3af", fontWeight: 600 },
  catSet: { display: "flex", gap: 6, marginTop: 7 },
  catInput: { padding: "5px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 12.5, fontFamily: "inherit", width: 110 },
  ovBtnSm: { padding: "5px 9px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 11.5, color: "#9ca3af", fontFamily: "inherit", cursor: "pointer" },
  uncHint: { fontSize: 11.5, color: "#9ca3af", marginTop: 4 },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
};
