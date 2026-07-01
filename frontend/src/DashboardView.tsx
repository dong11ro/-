import { useEffect, useState } from "react";

const API = "http://localhost:8000";
const won = (n: number) => "₩" + Math.abs(n).toLocaleString("ko-KR");

// 백엔드 응답 형태
type Summary = { income: number; expense: number; balance: number; count: number };
type RankItem = { name: string; color: string | null; amount: number; pct: number };
type Merchant = { name: string; visits: number; amount: number };
type Comparison = {
  this_expense: number; last_expense: number; change_pct: number | null;
  categories: { name: string; this: number; last: number; change_pct: number | null; color: string | null }[];
};

const thisMonth = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
};
function shiftMonth(month: string, delta: number): string {
  let [y, m] = month.split("-").map(Number);
  m += delta;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2, "0")}`;
}
// 증감 뱃지 색
function changeStyle(pct: number | null) {
  if (pct === null) return { label: "신규", bg: "#f1f5f9", color: "#64748b" };
  if (pct > 0) return { label: `▲ ${pct}%`, bg: "#fee2e2", color: "#dc2626" };
  if (pct < 0) return { label: `▼ ${Math.abs(pct)}%`, bg: "#dcfce7", color: "#16a34a" };
  return { label: "0%", bg: "#f1f5f9", color: "#64748b" };
}

export default function DashboardView() {
  const [month, setMonth] = useState(thisMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [cashflow, setCashflow] = useState<{ income: number; consumption: number; saving: number; investment: number; transfer: number; net: number } | null>(null);
  const [budget, setBudget] = useState<{ total: { budget: number | null; spent: number; remaining: number | null; status: string | null }; categories: { name: string; status: string | null }[] } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const q = `?month=${month}`;
    fetch(`${API}/dashboard/summary${q}`).then((r) => r.json()).then(setSummary);
    fetch(`${API}/dashboard/category-ranking${q}`).then((r) => r.json()).then(setRanking);
    fetch(`${API}/dashboard/top-merchants${q}`).then((r) => r.json()).then(setMerchants);
    fetch(`${API}/dashboard/comparison${q}`).then((r) => r.json()).then(setComparison);
    fetch(`${API}/dashboard/cashflow${q}`).then((r) => r.json()).then(setCashflow);
    fetch(`${API}/budget/status${q}`).then((r) => r.json()).then(setBudget);
  }, [month]);

  const [y, m] = month.split("-").map(Number);
  const maxRank = Math.max(1, ...ranking.map((c) => c.amount));
  const maxMerchant = Math.max(1, ...merchants.map((mc) => mc.amount));

  // 미래 차단용 현재 시점
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const atCurrent = month >= thisMonth();                 // 이번 달 이상이면 다음달 불가
  const isFuture = (yy: number, mm: number) => yy > curYear || (yy === curYear && mm > curMonth);

  function pickMonth(mm: number) {
    setMonth(`${pickerYear}-${String(mm).padStart(2, "0")}`);
    setPickerOpen(false);
  }

  return (
    <div style={S.page}>
      {/* 월 이동 + 연/월 피커 */}
      <div style={S.monthNav}>
        <button onClick={() => setMonth(shiftMonth(month, -1))} style={S.navBtn}>‹</button>
        <button onClick={() => { setPickerYear(y); setPickerOpen((o) => !o); }} style={S.monthLabelBtn}>
          {y}년 {m}월 ▾
        </button>
        <button
          onClick={() => !atCurrent && setMonth(shiftMonth(month, 1))}
          disabled={atCurrent}
          style={{ ...S.navBtn, ...(atCurrent ? S.navDisabled : {}) }}
        >›</button>

        {pickerOpen && (
          <>
            <div onClick={() => setPickerOpen(false)} style={S.backdrop} />
            <div style={S.picker}>
              <div style={S.pickerYearRow}>
                <button onClick={() => setPickerYear((yr) => yr - 1)} style={S.yearBtn}>‹</button>
                <span style={S.pickerYear}>{pickerYear}년</span>
                <button
                  onClick={() => pickerYear < curYear && setPickerYear((yr) => yr + 1)}
                  disabled={pickerYear >= curYear}
                  style={{ ...S.yearBtn, ...(pickerYear >= curYear ? S.navDisabled : {}) }}
                >›</button>
              </div>
              <div style={S.monthGrid}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => {
                  const fut = isFuture(pickerYear, mm);
                  const sel = pickerYear === y && mm === m;
                  return (
                    <button
                      key={mm}
                      onClick={() => !fut && pickMonth(mm)}
                      disabled={fut}
                      style={{ ...S.monthCell, ...(sel ? S.monthCellSel : {}), ...(fut ? S.monthCellFut : {}) }}
                    >{mm}월</button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* KPI 카드 */}
      <div style={S.kpiRow}>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>총수입</div>
          <div style={{ ...S.kpiValue, color: "#16a34a" }}>+{won(summary?.income ?? 0)}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>총지출</div>
          <div style={{ ...S.kpiValue, color: "#dc2626" }}>-{won(summary?.expense ?? 0)}</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kpiLabel}>잔액</div>
          <div style={{ ...S.kpiValue, color: "#2563eb" }}>{won(summary?.balance ?? 0)}</div>
        </div>
      </div>

      {/* 현금 흐름 */}
      {cashflow && (
        <div style={S.cfCard}>
          <div style={S.cfTitle}>이번 달 현금 흐름</div>
          <div style={S.cfRow}>
            {[
              { label: "수입", v: cashflow.income, color: "#16a34a" },
              { label: "소비", v: cashflow.consumption, color: "#dc2626" },
              { label: "저축", v: cashflow.saving, color: "#0891b2" },
              { label: "투자", v: cashflow.investment, color: "#7c3aed" },
              { label: "이체", v: cashflow.transfer, color: "#64748b" },
            ].map((it) => (
              <div key={it.label} style={S.cfItem}>
                <div style={S.cfLabel}>{it.label}</div>
                <div style={{ ...S.cfVal, color: it.color }}>{won(it.v)}</div>
              </div>
            ))}
            <div style={{ ...S.cfItem, borderLeft: "1px solid #e5e7eb", paddingLeft: 14 }}>
              <div style={S.cfLabel}>순변화</div>
              <div style={{ ...S.cfVal, color: cashflow.net >= 0 ? "#16a34a" : "#dc2626", fontWeight: 800 }}>
                {cashflow.net >= 0 ? "+" : "-"}{won(cashflow.net)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 예산 현황 (간략) */}
      {budget && budget.total.budget != null && (() => {
        const st = budget.total.status ?? "ok";
        const C = ({ ok: "#22c55e", near: "#f59e0b", over: "#ef4444" } as Record<string, string>)[st];
        const p = Math.min(100, (budget.total.spent / budget.total.budget!) * 100);
        const warns = budget.categories.filter((c) => c.status === "over" || c.status === "near");
        return (
          <div style={S.cfCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={S.cfTitle}>예산 현황</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{won(budget.total.spent)} <span style={{ color: "#9ca3af" }}>/ {won(budget.total.budget!)}</span></span>
            </div>
            <div style={{ height: 9, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${p}%`, background: C, borderRadius: 5 }} /></div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              남음 {won(budget.total.remaining ?? 0)}
              {warns.length > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}> · {warns.map((w) => `${w.name} ${w.status === "over" ? "초과" : "임박"}`).join(", ")}</span>}
            </div>
          </div>
        );
      })()}

      <div style={S.twoCol}>
        {/* 상위 지출 카테고리 */}
        <div style={S.card}>
          <div style={S.cardTitle}>상위 지출 카테고리</div>
          {ranking.length === 0 && <div style={S.empty}>지출 내역이 없어요.</div>}
          {ranking.map((c) => (
            <div key={c.name} style={S.rankRow}>
              <div style={S.rankTop}>
                <span style={S.rankName}><span style={{ ...S.dot, background: c.color ?? "#9ca3af" }} />{c.name}</span>
                <span style={S.rankAmt}>{won(c.amount)} <span style={S.rankPct}>{c.pct}%</span></span>
              </div>
              <div style={S.barBg}><div style={{ ...S.barFill, width: `${(c.amount / maxRank) * 100}%`, background: c.color ?? "#9ca3af" }} /></div>
            </div>
          ))}
        </div>

        {/* 자주 가는 가맹점 */}
        <div style={S.card}>
          <div style={S.cardTitle}>자주 가는 가맹점</div>
          {merchants.length === 0 && <div style={S.empty}>지출 내역이 없어요.</div>}
          {merchants.map((mc, i) => (
            <div key={mc.name} style={S.merchRow}>
              <span style={S.rank}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.merchName}>{mc.name}</div>
                <div style={S.barBg}><div style={{ ...S.barFill, width: `${(mc.amount / maxMerchant) * 100}%`, background: "#6366f1" }} /></div>
              </div>
              <div style={S.merchRight}>
                <div style={S.merchAmt}>{won(mc.amount)}</div>
                <div style={S.merchVisits}>{mc.visits}회</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 지난달 대비 */}
      <div style={S.card}>
        <div style={S.compHead}>
          <span style={S.cardTitle}>지난달 대비</span>
          {comparison && (
            <span style={{ ...S.compBadge, ...changeStyle(comparison.change_pct) }}>
              {changeStyle(comparison.change_pct).label}
            </span>
          )}
        </div>
        {comparison && (
          <div style={S.compTotal}>
            이번달 {won(comparison.this_expense)} <span style={S.vs}>vs</span> 지난달 {won(comparison.last_expense)}
          </div>
        )}
        {comparison?.categories.map((c) => {
          const spike = c.change_pct !== null && c.change_pct >= 50; // 튀는 지출
          return (
            <div key={c.name} style={S.compRow}>
              <span style={S.compName}>
                <span style={{ ...S.dot, background: c.color ?? "#9ca3af" }} />{c.name}
                {spike && <span style={S.spike}>튀는 지출</span>}
              </span>
              <span style={S.compNums}>
                <span style={S.compThis}>{won(c.this)}</span>
                <span style={{ ...S.compBadge, ...changeStyle(c.change_pct) }}>{changeStyle(c.change_pct).label}</span>
              </span>
            </div>
          );
        })}
        {comparison && comparison.categories.length === 0 && <div style={S.empty}>비교할 내역이 없어요.</div>}
      </div>
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 920, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  monthNav: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20, position: "relative" },
  navBtn: { width: 34, height: 34, borderRadius: 9, border: "1px solid #e5e7eb", background: "white", fontSize: 18, cursor: "pointer", color: "#374151" },
  navDisabled: { opacity: 0.35, cursor: "default" },
  monthLabelBtn: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.4px", background: "none", border: "none", cursor: "pointer", color: "#111827", fontFamily: "inherit", padding: "2px 6px" },
  backdrop: { position: "fixed", inset: 0, zIndex: 40 },
  picker: { position: "absolute", top: 44, left: 44, zIndex: 41, background: "white", borderRadius: 12, padding: 14, boxShadow: "0 10px 30px rgba(0,0,0,.18)", border: "1px solid #e5e7eb", width: 260 },
  pickerYearRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  yearBtn: { width: 30, height: 30, borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 16, cursor: "pointer", color: "#374151" },
  pickerYear: { fontSize: 15, fontWeight: 700 },
  monthGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 },
  monthCell: { padding: "9px 0", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", fontFamily: "inherit" },
  monthCellSel: { background: "#3b82f6", color: "white", borderColor: "#3b82f6" },
  monthCellFut: { opacity: 0.3, cursor: "default" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 12 },
  kpi: { background: "white", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  kpiLabel: { fontSize: 12, color: "#6b7280", fontWeight: 500, marginBottom: 8 },
  kpiValue: { fontSize: 21, fontWeight: 700, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" },
  cfCard: { background: "white", borderRadius: 12, padding: "14px 18px", boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cfTitle: { fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#374151" },
  cfRow: { display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" },
  cfItem: { minWidth: 64 },
  cfLabel: { fontSize: 11, color: "#9ca3af", fontWeight: 500, marginBottom: 4 },
  cfVal: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  card: { background: "white", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 14 },
  empty: { fontSize: 13, color: "#9ca3af", padding: "12px 0", textAlign: "center" },
  dot: { display: "inline-block", width: 9, height: 9, borderRadius: "50%", marginRight: 7 },
  rankRow: { marginBottom: 12 },
  rankTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  rankName: { display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#374151" },
  rankAmt: { fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  rankPct: { fontSize: 11.5, color: "#9ca3af", fontWeight: 600, marginLeft: 4 },
  barBg: { height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  merchRow: { display: "flex", alignItems: "center", gap: 11, padding: "9px 0" },
  rank: { width: 22, height: 22, borderRadius: 7, background: "#f1f5f9", color: "#6b7280", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  merchName: { fontSize: 13, fontWeight: 600, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  merchRight: { textAlign: "right", flexShrink: 0 },
  merchAmt: { fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  merchVisits: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  compHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  compTotal: { fontSize: 13, color: "#374151", marginBottom: 14, fontVariantNumeric: "tabular-nums" },
  vs: { color: "#9ca3af", margin: "0 6px" },
  compRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f8fafc" },
  compName: { display: "flex", alignItems: "center", fontSize: 13, fontWeight: 600, color: "#374151" },
  spike: { marginLeft: 8, fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", padding: "2px 7px", borderRadius: 5 },
  compNums: { display: "flex", alignItems: "center", gap: 8 },
  compThis: { fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  compBadge: { fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5 },
};
