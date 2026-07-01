import { useEffect, useMemo, useState } from "react";
import type { Category, PaymentMethod } from "./types";

const API = "http://localhost:8000";
const won = (n: number | string) => "₩" + Math.abs(Number(n)).toLocaleString("ko-KR");

type Template = {
  id: number;
  name: string;
  amount: string | null;
  category_id: number | null;
  payment_method_id: number | null;
  is_active: boolean;
};

export default function FixedView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [msg, setMsg] = useState("");
  // 새 템플릿 입력
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState("");
  const [payId, setPayId] = useState("");

  const load = () => fetch(`${API}/templates`).then((r) => r.json()).then(setTemplates);
  useEffect(() => {
    load();
    fetch(`${API}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${API}/payment-methods`).then((r) => r.json()).then(setMethods);
  }, []);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name] as [number, string])), [categories]);
  const methodName = useMemo(() => new Map(methods.map((m) => [m.id, m.name] as [number, string])), [methods]);
  const grouped = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id === null);
    return parents.map((p) => ({ parent: p, children: categories.filter((c) => c.parent_id === p.id) }));
  }, [categories]);
  const catOptions = () =>
    grouped.map((g) =>
      g.children.length > 0 ? (
        <optgroup key={g.parent.id} label={g.parent.name}>
          {g.children.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
        </optgroup>
      ) : (
        <option key={g.parent.id} value={g.parent.id}>{g.parent.name}</option>
      )
    );

  async function addTemplate() {
    if (!name.trim()) return;
    await fetch(`${API}/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        amount: amount ? Number(amount) : null,
        category_id: catId ? Number(catId) : null,
        payment_method_id: payId ? Number(payId) : null,
      }),
    });
    setName(""); setAmount(""); setCatId(""); setPayId("");
    load();
  }

  const update = (id: number, patch: Partial<Template>) =>
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  async function save(t: Template) {
    await fetch(`${API}/templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: t.name, amount: t.amount ? Number(t.amount) : null,
        category_id: t.category_id, payment_method_id: t.payment_method_id, is_active: t.is_active,
      }),
    });
    load();
  }
  async function toggleActive(t: Template) {
    await fetch(`${API}/templates/${t.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t.name, amount: t.amount ? Number(t.amount) : null, category_id: t.category_id, payment_method_id: t.payment_method_id, is_active: !t.is_active }),
    });
    load();
  }
  async function remove(id: number) {
    await fetch(`${API}/templates/${id}`, { method: "DELETE" });
    load();
  }
  async function addToday(t: Template) {
    const v = prompt(`'${t.name}'을 오늘 거래로 추가 — 금액 (그 자리서 조정 가능)`, t.amount ? String(Number(t.amount)) : "");
    if (v === null) return;
    if (!v.trim() && !t.amount) { setMsg("금액이 필요해요."); return; }
    await fetch(`${API}/templates/${t.id}/add`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: v.trim() ? Number(v) : null }),
    });
    setMsg(`'${t.name}' ${won(v.trim() ? Number(v) : t.amount!)} 오늘 거래로 추가됐어요.`);
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>고정 지출</h1>

      {msg && <div style={S.msg}>{msg}</div>}

      <div style={S.card}>
        <div style={S.cardTitle}>템플릿 추가</div>
        <div style={S.sub}>월세·통신·구독 등 반복 항목을 등록하고, 매달 "오늘 추가"로 한 번에 입력하세요. (자동 생성 X)</div>
        <div style={S.addRow}>
          <input placeholder="이름 (예: 월세)" value={name} onChange={(e) => setName(e.target.value)} style={S.inName} />
          <input placeholder="금액" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={S.inAmt} />
          <select value={catId} onChange={(e) => setCatId(e.target.value)} style={S.inSel}>
            <option value="">카테고리</option>{catOptions()}
          </select>
          <select value={payId} onChange={(e) => setPayId(e.target.value)} style={S.inSel}>
            <option value="">결제수단</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={addTemplate} disabled={!name.trim()} style={{ ...S.addBtn, opacity: name.trim() ? 1 : 0.4 }}>추가</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>템플릿 ({templates.length})</div>
        {templates.length === 0 ? <div style={S.empty}>아직 템플릿이 없어요. 위에서 추가하세요.</div> : (
          <div style={S.list}>
            {templates.map((t) => (
              <div key={t.id} style={{ ...S.row, opacity: t.is_active ? 1 : 0.5 }}>
                <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} style={S.inName} />
                <input type="number" value={t.amount ?? ""} onChange={(e) => update(t.id, { amount: e.target.value })} placeholder="금액" style={S.inAmt} />
                <select value={t.category_id ?? ""} onChange={(e) => update(t.id, { category_id: e.target.value ? Number(e.target.value) : null })} style={S.inSel}>
                  <option value="">카테고리</option>{catOptions()}
                </select>
                <select value={t.payment_method_id ?? ""} onChange={(e) => update(t.id, { payment_method_id: e.target.value ? Number(e.target.value) : null })} style={S.inSel}>
                  <option value="">결제수단</option>{methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={() => save(t)} style={S.saveBtn}>저장</button>
                <button onClick={() => toggleActive(t)} style={S.toggleBtn}>{t.is_active ? "활성" : "비활성"}</button>
                <button onClick={() => addToday(t)} style={S.todayBtn}>＋ 오늘 추가</button>
                <button onClick={() => remove(t.id)} style={S.delBtn}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={S.hint}>※ 고정지출로 추가된 거래는 분석의 "가맹점 TOP·요일별"에서 제외되지만, 총지출(소비)엔 포함됩니다.</div>
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 860, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.4px" },
  card: { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700 },
  sub: { fontSize: 12.5, color: "#9ca3af", margin: "8px 0 14px" },
  msg: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, marginBottom: 12 },
  addRow: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  list: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  row: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  inName: { flex: "1 1 120px", minWidth: 0, padding: "7px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", fontWeight: 600 },
  inAmt: { flex: "0 1 90px", minWidth: 0, padding: "7px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit" },
  inSel: { flex: "1 1 110px", minWidth: 0, padding: "7px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 12.5, fontFamily: "inherit", background: "white" },
  addBtn: { padding: "7px 14px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  saveBtn: { padding: "7px 11px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #dbeafe", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  toggleBtn: { padding: "7px 11px", background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  todayBtn: { padding: "7px 12px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  delBtn: { padding: "7px 11px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12.5, color: "#9ca3af", cursor: "pointer", flexShrink: 0 },
  empty: { fontSize: 13, color: "#9ca3af", padding: "16px 0", textAlign: "center" },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
};
