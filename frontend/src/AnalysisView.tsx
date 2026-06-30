import { useEffect, useState } from "react";

const API = "http://localhost:8000";

// 만/억 단위 포맷 (차트 라벨용)
function fmtW(n: number): string {
  const v = Math.abs(n);
  if (v >= 1e8) return (v / 1e8).toFixed(1) + "억";
  if (v >= 1e4) return Math.round(v / 1e4) + "만";
  return v.toLocaleString("ko-KR");
}
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

type Trend = { label: string; months: string[]; income: number; expense: number; budget: number | null; over: boolean };
type Analysis = {
  range: { start: string; end: string; unit: string };
  summary: { total_expense: number; avg_expense: number; savings: number; savings_rate: number | null };
  trend: Trend[];
  category: { name: string; color: string | null; amount: number; pct: number }[];
  weekday: { day: string; amount: number }[];
  merchants: { name: string; visits: number; amount: number }[];
  budget: { default: number | null; overrides: Record<string, number> };
};

// 도넛 조각 path
function arc(cx: number, cy: number, rO: number, rI: number, a0: number, a1: number): string {
  const pt = (r: number, a: number): [number, number] => [cx + r * Math.cos((a - 90) * Math.PI / 180), cy + r * Math.sin((a - 90) * Math.PI / 180)];
  const [x1, y1] = pt(rO, a0), [x2, y2] = pt(rO, a1), [x3, y3] = pt(rI, a1), [x4, y4] = pt(rI, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${rO} ${rO} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L${x3.toFixed(1)} ${y3.toFixed(1)} A${rI} ${rI} 0 ${large} 0 ${x4.toFixed(1)} ${y4.toFixed(1)}Z`;
}

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "최근 3개월", range: () => [shiftMonth(thisMonth(), -2), thisMonth()] },
  { label: "최근 6개월", range: () => [shiftMonth(thisMonth(), -5), thisMonth()] },
  { label: "올해", range: () => [`${new Date().getFullYear()}-01`, thisMonth()] },
  { label: "최근 1년", range: () => [shiftMonth(thisMonth(), -11), thisMonth()] },
];

export default function AnalysisView() {
  const [start, setStart] = useState(() => shiftMonth(thisMonth(), -5));
  const [end, setEnd] = useState(thisMonth());
  const [sort, setSort] = useState<"amount" | "visits">("amount");
  const [data, setData] = useState<Analysis | null>(null);
  const [budgetInput, setBudgetInput] = useState("");

  function load() {
    fetch(`${API}/analysis?start=${start}&end=${end}&merchant_sort=${sort}`)
      .then((r) => r.json())
      .then((d: Analysis) => { setData(d); setBudgetInput(d.budget.default != null ? String(d.budget.default) : ""); });
  }
  useEffect(() => { load(); }, [start, end, sort]);

  async function saveDefaultBudget() {
    const amount = budgetInput.trim() === "" ? null : Number(budgetInput);
    await fetch(`${API}/budget/total/default`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }),
    });
    load();
  }
  async function setMonthBudget(ym: string) {
    const cur = data?.budget.overrides[ym] ?? data?.budget.default ?? "";
    const v = prompt(`${ym} 예산 (비우면 기본값 사용)`, String(cur));
    if (v === null) return;
    await fetch(`${API}/budget/total/month`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: ym, amount: v.trim() === "" ? null : Number(v) }),
    });
    load();
  }

  function applyPreset(p: typeof PRESETS[number]) {
    const [s, e] = p.range();
    setStart(s); setEnd(e);
  }

  if (!data) return <div style={S.page}>불러오는 중…</div>;

  const t = data.trend;
  const maxVal = Math.max(...t.flatMap((b) => [b.income, b.expense, b.budget ?? 0]), 1);
  const W = 660, H = 230, n = t.length, groupW = W / n;
  const pairW = Math.min(64, groupW * 0.62), barW = (pairW - 5) / 2;

  // 저축률 (수입 있는 버킷만)
  const sav = t.map((b) => ({ label: b.label, rate: b.income > 0 ? Math.round((b.income - b.expense) / b.income * 100) : null }))
    .filter((x) => x.rate !== null) as { label: string; rate: number }[];
  const catTotal = data.category.reduce((s, c) => s + c.amount, 0);
  const maxWd = Math.max(1, ...data.weekday.map((w) => w.amount));
  const maxMch = Math.max(1, ...data.merchants.map((m) => m.amount));

  return (
    <div style={S.page}>
      <h1 style={S.h1}>분석</h1>

      {/* 범위 선택 */}
      <div style={S.card}>
        <div style={S.rangeRow}>
          {PRESETS.map((p) => {
            const [s, e] = p.range();
            const active = s === start && e === end;
            return <button key={p.label} onClick={() => applyPreset(p)} style={S.preset(active)}>{p.label}</button>;
          })}
          <span style={S.rangeSep}>직접</span>
          <input type="month" value={start} max={end} onChange={(e) => setStart(e.target.value)} style={S.monthInput} />
          <span>~</span>
          <input type="month" value={end} min={start} max={thisMonth()} onChange={(e) => setEnd(e.target.value)} style={S.monthInput} />
          <span style={S.unitTag}>{data.range.unit} 단위</span>
        </div>
        <div style={S.budgetRow}>
          <span style={S.budgetLabel}>기본 월예산</span>
          <input value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} onBlur={saveDefaultBudget}
            placeholder="예: 3000000" style={S.budgetInput} />
          <span style={S.budgetHint}>원 · 막대를 클릭하면 그 달만 예산을 바꿀 수 있어요(월 단위 보기에서)</span>
        </div>
      </div>

      {/* KPI */}
      <div style={S.kpiRow}>
        <Kpi label="기간 소비" value={"-" + won(data.summary.total_expense)} color="#dc2626" />
        <Kpi label="월평균 지출" value={won(data.summary.avg_expense)} color="#374151" />
        <Kpi label="기간 저축액" value={(data.summary.savings >= 0 ? "+" : "-") + won(data.summary.savings)} color={data.summary.savings >= 0 ? "#16a34a" : "#dc2626"} />
        <Kpi label="저축률" value={data.summary.savings_rate == null ? "–" : data.summary.savings_rate + "%"} color="#2563eb" />
      </div>

      {/* 월별 수입·지출 막대 */}
      <div style={S.card}>
        <div style={S.cardTitle}>수입·지출 추이 <span style={S.legend}><i style={{ background: "#22c55e" }} />수입 <i style={{ background: "#f87171" }} />지출 <span style={S.budgetLegend}>┄ 예산</span></span></div>
        <svg viewBox={`0 0 ${W} ${H + 26}`} style={{ width: "100%", height: H + 26 }}>
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <line key={i} x1={0} x2={W} y1={H * (1 - f)} y2={H * (1 - f)} stroke="#f1f5f9" strokeWidth={1} />
          ))}
          {t.map((b, i) => {
            const gx = i * groupW;
            const incX = gx + (groupW - pairW) / 2, expX = incX + barW + 5;
            const incH = b.income / maxVal * H, expH = b.expense / maxVal * H;
            const editable = b.months.length === 1;
            return (
              <g key={i} onClick={() => editable && setMonthBudget(b.months[0])} style={{ cursor: editable ? "pointer" : "default" }}>
                <rect x={incX} y={H - incH} width={barW} height={incH} rx={3} fill="#22c55e" opacity={0.85} />
                <rect x={expX} y={H - expH} width={barW} height={expH} rx={3} fill={b.over ? "#ef4444" : "#f87171"} />
                {b.income > 0 && <text x={incX + barW / 2} y={H - incH - 4} textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="600">{fmtW(b.income)}</text>}
                {b.expense > 0 && <text x={expX + barW / 2} y={H - expH - 4} textAnchor="middle" fontSize="9" fill={b.over ? "#dc2626" : "#ef4444"} fontWeight="600">{fmtW(b.expense)}</text>}
                {b.budget != null && (
                  <line x1={gx + 3} x2={gx + groupW - 3} y1={H - b.budget / maxVal * H} y2={H - b.budget / maxVal * H} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" />
                )}
                {b.over && <><circle cx={expX + barW / 2} cy={H - expH - 18} r={6} fill="#ef4444" /><text x={expX + barW / 2} y={H - expH - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="white">!</text></>}
                <text x={gx + groupW / 2} y={H + 16} textAnchor="middle" fontSize="11" fill="#6b7280">{b.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={S.twoCol}>
        {/* 카테고리 도넛 */}
        <div style={S.card}>
          <div style={S.cardTitle}>카테고리 구성</div>
          {data.category.length === 0 ? <div style={S.empty}>분류된 지출이 없어요.</div> : (
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <svg viewBox="0 0 160 160" style={{ width: 150, height: 150, flexShrink: 0 }}>
                {(() => { let a = 0; return data.category.map((c) => {
                  const sweep = c.amount / catTotal * 358; const p = arc(80, 80, 70, 44, a, a + sweep); a += sweep + 2;
                  return <path key={c.name} d={p} fill={c.color ?? "#9ca3af"} />;
                }); })()}
                <text x={80} y={84} textAnchor="middle" fontSize="13" fontWeight="700" fill="#111827">{fmtW(catTotal)}</text>
              </svg>
              <div style={{ flex: 1, minWidth: 140 }}>
                {data.category.map((c) => (
                  <div key={c.name} style={S.legRow}>
                    <span style={{ ...S.legDot, background: c.color ?? "#9ca3af" }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span style={S.legPct}>{c.pct}%</span>
                    <span style={S.legAmt}>{won(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 저축률 추이 */}
        <div style={S.card}>
          <div style={S.cardTitle}>저축률 추이</div>
          {sav.length < 2 ? <div style={S.empty}>데이터가 더 필요해요.</div> : (() => {
            const LW = 320, LH = 120; const rates = sav.map((s) => s.rate);
            const mx = Math.max(...rates, 30) + 5, mn = Math.min(...rates, 0) - 5;
            const pts = sav.map((s, i) => ({ x: 10 + i / (sav.length - 1) * (LW - 20), y: LH - (s.rate - mn) / (mx - mn) * LH }));
            const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
            const ty = LH - (30 - mn) / (mx - mn) * LH;
            return (
              <svg viewBox={`0 0 ${LW} ${LH + 18}`} style={{ width: "100%", height: LH + 18 }}>
                <line x1={0} x2={LW} y1={ty} y2={ty} stroke="#93c5fd" strokeWidth={1} strokeDasharray="4 3" />
                <text x={LW - 2} y={ty - 3} textAnchor="end" fontSize="9" fill="#93c5fd">목표 30%</text>
                <path d={line} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r={4} fill="white" stroke="#3b82f6" strokeWidth={2} /><text x={p.x} y={LH + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{sav[i].label}</text></g>)}
              </svg>
            );
          })()}
        </div>
      </div>

      <div style={S.twoCol}>
        {/* 요일별 지출 */}
        <div style={S.card}>
          <div style={S.cardTitle}>요일별 지출 <span style={{ fontWeight: 400, fontSize: 11.5, color: "#9ca3af" }}>일평균 · 소비만</span></div>
          {data.weekday.map((w) => (
            <div key={w.day} style={S.wdRow}>
              <span style={S.wdDay}>{w.day}</span>
              <div style={S.wdBarBg}><div style={{ ...S.wdBarFill, width: `${w.amount / maxWd * 100}%`, background: ["토", "일"].includes(w.day) ? "#f59e0b" : "#93c5fd" }} /></div>
              <span style={S.wdAmt}>{fmtW(w.amount)}</span>
            </div>
          ))}
        </div>

        {/* 가맹점 TOP */}
        <div style={S.card}>
          <div style={S.cardTitle}>
            가맹점 TOP
            <span style={{ float: "right" }}>
              <button onClick={() => setSort("amount")} style={S.sortBtn(sort === "amount")}>금액순</button>
              <button onClick={() => setSort("visits")} style={S.sortBtn(sort === "visits")}>방문순</button>
            </span>
          </div>
          {data.merchants.length === 0 ? <div style={S.empty}>지출 내역이 없어요.</div> : data.merchants.map((m, i) => (
            <div key={m.name} style={S.mchRow}>
              <span style={S.mchRank}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.mchName}>{m.name}</div>
                <div style={S.wdBarBg}><div style={{ ...S.wdBarFill, width: `${m.amount / maxMch * 100}%`, background: "#6366f1" }} /></div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={S.mchAmt}>{won(m.amount)}</div>
                <div style={S.mchVisits}>{m.visits}회</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={S.kpi}>
      <div style={S.kpiLabel}>{label}</div>
      <div style={{ ...S.kpiValue, color }}>{value}</div>
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 920, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.4px" },
  card: { background: "white", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700, marginBottom: 14 },
  rangeRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  preset: (a: boolean) => ({ padding: "6px 12px", borderRadius: 8, border: `1px solid ${a ? "#3b82f6" : "#d1d5db"}`, background: a ? "#eff6ff" : "white", color: a ? "#1d4ed8" : "#374151", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }),
  rangeSep: { fontSize: 12, color: "#9ca3af", marginLeft: 6 },
  monthInput: { padding: "6px 8px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit" },
  unitTag: { fontSize: 12, color: "#6b7280", background: "#f1f5f9", padding: "4px 9px", borderRadius: 6, marginLeft: 4 },
  budgetRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
  budgetLabel: { fontSize: 13, fontWeight: 600, color: "#374151" },
  budgetInput: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", width: 130 },
  budgetHint: { fontSize: 11.5, color: "#9ca3af" },
  kpiRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 },
  kpi: { background: "white", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  kpiLabel: { fontSize: 11.5, color: "#6b7280", fontWeight: 500, marginBottom: 7 },
  kpiValue: { fontSize: 19, fontWeight: 700, letterSpacing: "-0.5px", fontVariantNumeric: "tabular-nums" },
  legend: { float: "right", fontSize: 11.5, color: "#6b7280", fontWeight: 400 },
  budgetLegend: { color: "#f59e0b", fontWeight: 600 },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  empty: { fontSize: 13, color: "#9ca3af", padding: "20px 0", textAlign: "center" },
  legRow: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, padding: "3px 0", color: "#374151" },
  legDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  legPct: { color: "#9ca3af", fontSize: 11.5 },
  legAmt: { fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 64, textAlign: "right" },
  wdRow: { display: "flex", alignItems: "center", gap: 10, padding: "5px 0" },
  wdDay: { width: 18, fontSize: 13, fontWeight: 600, color: "#374151", flexShrink: 0 },
  wdBarBg: { flex: 1, height: 16, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" },
  wdBarFill: { height: "100%", borderRadius: 5 },
  wdAmt: { fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", width: 52, textAlign: "right", flexShrink: 0, color: "#374151" },
  sortBtn: (a: boolean) => ({ padding: "3px 9px", borderRadius: 6, border: "none", background: a ? "#eff6ff" : "transparent", color: a ? "#1d4ed8" : "#9ca3af", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }),
  mchRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0" },
  mchRank: { width: 20, height: 20, borderRadius: 6, background: "#f1f5f9", color: "#6b7280", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  mchName: { fontSize: 12.5, fontWeight: 600, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  mchAmt: { fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  mchVisits: { fontSize: 11, color: "#9ca3af" },
};
