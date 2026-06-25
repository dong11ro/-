import { useEffect, useMemo, useState } from "react";

const API = "http://localhost:8000";

// ── 타입 (백엔드 응답 형태) ──
type Category = { id: number; name: string; type: string; parent_id: number | null };
type PaymentMethod = { id: number; name: string };
type Transaction = {
  id: number;
  date: string;
  type: "income" | "expense";
  amount: string;
  category_id: number | null;
  payment_method_id: number | null;
  alias: string | null;
  memo: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const won = (n: string | number) => "₩" + Math.abs(Number(n)).toLocaleString("ko-KR");

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);

  // 입력 폼 상태
  const [date, setDate] = useState(today());
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [methodId, setMethodId] = useState<string>("");
  const [memo, setMemo] = useState("");

  // ── 데이터 로드 ──
  const loadTxs = () =>
    fetch(`${API}/transactions`).then((r) => r.json()).then(setTxs);

  useEffect(() => {
    fetch(`${API}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${API}/payment-methods`).then((r) => r.json()).then(setMethods);
    loadTxs();
  }, []);

  // 이름 빠른 조회용 맵
  const catName = useMemo(() => {
    const m = new Map<number, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);
  const methodName = useMemo(() => {
    const m = new Map<number, string>();
    methods.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [methods]);

  // 현재 유형(수입/지출)에 맞는 카테고리만, 대분류 > 소분류 그룹으로
  const grouped = useMemo(() => {
    const ofType = categories.filter((c) => c.type === type);
    const parents = ofType.filter((c) => c.parent_id === null);
    return parents.map((p) => ({
      parent: p,
      children: ofType.filter((c) => c.parent_id === p.id),
    }));
  }, [categories, type]);

  // ── 거래 추가 ──
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    await fetch(`${API}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        type,
        amount: Number(amount),
        category_id: categoryId ? Number(categoryId) : null,
        payment_method_id: methodId ? Number(methodId) : null,
        memo: memo || null,
      }),
    });
    setAmount("");
    setMemo("");
    loadTxs();
  }

  async function remove(id: number) {
    await fetch(`${API}/transactions/${id}`, { method: "DELETE" });
    loadTxs();
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>가계부</h1>

      {/* ── 거래 입력 폼 ── */}
      <form onSubmit={submit} style={S.card}>
        <div style={S.formTitle}>거래 추가</div>

        {/* 수입/지출 토글 */}
        <div style={S.toggleRow}>
          {(["expense", "income"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => { setType(t); setCategoryId(""); }}
              style={{ ...S.toggle, ...(type === t ? S.toggleOn(t) : {}) }}
            >
              {t === "expense" ? "지출" : "수입"}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          <label style={S.field}>
            <span style={S.label}>날짜</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>금액</span>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0" style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>카테고리</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={S.input}>
              <option value="">선택 안 함</option>
              {grouped.map((g) =>
                g.children.length > 0 ? (
                  <optgroup key={g.parent.id} label={g.parent.name}>
                    {g.children.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={g.parent.id} value={g.parent.id}>{g.parent.name}</option>
                )
              )}
            </select>
          </label>
          <label style={S.field}>
            <span style={S.label}>결제수단</span>
            <select value={methodId} onChange={(e) => setMethodId(e.target.value)} style={S.input}>
              <option value="">선택 안 함</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label style={S.field}>
          <span style={S.label}>메모</span>
          <input value={memo} onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 아메리카노" style={S.input} />
        </label>

        <button type="submit" style={S.submit}>저장</button>
      </form>

      {/* ── 거래 목록 ── */}
      <div style={S.card}>
        <div style={S.formTitle}>거래 내역 ({txs.length})</div>
        {txs.length === 0 && <div style={S.empty}>아직 거래가 없어요. 위에서 추가해보세요.</div>}
        {txs.map((t) => (
          <div key={t.id} style={S.row}>
            <div style={{ flex: 1 }}>
              <div style={S.rowTop}>
                <span style={S.rowName}>{t.memo || catName.get(t.category_id ?? -1) || "(무제)"}</span>
                <span style={{ ...S.amount, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>
                  {t.type === "income" ? "+" : "-"}{won(t.amount)}
                </span>
              </div>
              <div style={S.rowSub}>
                {t.date}
                {t.category_id && ` · ${catName.get(t.category_id)}`}
                {t.payment_method_id && ` · ${methodName.get(t.payment_method_id)}`}
              </div>
            </div>
            <button onClick={() => remove(t.id)} style={S.del}>삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 스타일 (레퍼런스 디자인 언어: 블루 #3b82f6, 카드, Pretendard) ──
const S: Record<string, any> = {
  page: { maxWidth: 680, margin: "0 auto", padding: "32px 20px", fontFamily: "Pretendard, -apple-system, sans-serif", color: "#111827" },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.4px" },
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  formTitle: { fontSize: 15, fontWeight: 700, marginBottom: 14 },
  toggleRow: { display: "flex", gap: 6, marginBottom: 14 },
  toggle: { flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#6b7280" },
  toggleOn: (t: string) => ({ background: t === "income" ? "#dcfce7" : "#fee2e2", color: t === "income" ? "#16a34a" : "#dc2626", borderColor: "transparent" }),
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: 500 },
  input: { padding: "9px 11px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" },
  submit: { width: "100%", padding: "11px 0", background: "#3b82f6", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 4 },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "24px 0" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  rowName: { fontSize: 14, fontWeight: 600 },
  amount: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  rowSub: { fontSize: 12, color: "#9ca3af" },
  del: { padding: "5px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#6b7280", cursor: "pointer", flexShrink: 0 },
};
