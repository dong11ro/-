import { useMemo, useState } from "react";
import type { Category, PaymentMethod, Tag, Transaction } from "./types";

const today = () => new Date().toISOString().slice(0, 10);

type Props = {
  categories: Category[];
  methods: PaymentMethod[];
  allTags: Tag[];
  initial?: Transaction;          // 있으면 수정 모드 (값 채움)
  submitLabel: string;
  onSubmit: (payload: any) => void;
  onCancel: () => void;
};

// 거래 추가/수정 공용 폼. 추가/수정은 initial과 onSubmit만 다르게 주면 됨.
export default function TransactionForm({
  categories, methods, allTags, initial, submitLabel, onSubmit, onCancel,
}: Props) {
  const [date, setDate] = useState(initial?.date ?? today());
  const [type, setType] = useState<"income" | "expense">(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(Number(initial.amount)) : "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ? String(initial.category_id) : "");
  const [methodId, setMethodId] = useState(initial?.payment_method_id ? String(initial.payment_method_id) : "");
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  // 현재 유형(수입/지출)에 맞는 카테고리만, 대분류 > 소분류 그룹으로
  const grouped = useMemo(() => {
    const ofType = categories.filter((c) => c.type === type);
    const parents = ofType.filter((c) => c.parent_id === null);
    return parents.map((p) => ({ parent: p, children: ofType.filter((c) => c.parent_id === p.id) }));
  }, [categories, type]);

  function addTag(name: string) {
    const n = name.trim();
    if (n && !tags.includes(n)) setTags([...tags, n]);
    setTagInput("");
  }
  function onTagKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    onSubmit({
      date,
      type,
      amount: Number(amount),
      category_id: categoryId ? Number(categoryId) : null,
      payment_method_id: methodId ? Number(methodId) : null,
      alias: alias || null,
      memo: memo || null,
      tags,
    });
  }

  return (
    <form onSubmit={submit}>
      <div style={S.formTitle}>{initial ? "거래 수정" : "거래 추가"}</div>

      {/* 수입/지출 토글 */}
      <div style={S.toggleRow}>
        {(["expense", "income"] as const).map((t) => (
          <button type="button" key={t} onClick={() => { setType(t); setCategoryId(""); }}
            style={{ ...S.toggle, ...(type === t ? S.toggleOn(t) : {}) }}>
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
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={S.input} />
        </label>
        <label style={S.field}>
          <span style={S.label}>카테고리</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={S.input}>
            <option value="">선택 안 함</option>
            {grouped.map((g) =>
              g.children.length > 0 ? (
                <optgroup key={g.parent.id} label={g.parent.name}>
                  {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label style={S.field}>
          <span style={S.label}>가맹점</span>
          <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="예: 스타벅스" style={S.input} />
        </label>
        <label style={S.field}>
          <span style={S.label}>메모</span>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 아메리카노" style={S.input} />
        </label>
      </div>

      {/* 태그 */}
      <div style={S.field}>
        <span style={S.label}>태그 (Enter로 추가)</span>
        <div style={S.tagBox}>
          {tags.map((t) => (
            <span key={t} style={S.tagChip}>
              #{t}<span onClick={() => setTags(tags.filter((x) => x !== t))} style={S.tagX}>×</span>
            </span>
          ))}
          <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={onTagKey}
            list="tag-suggestions" placeholder={tags.length ? "" : "예: 데이트, 정기권"} style={S.tagInput} />
          <datalist id="tag-suggestions">
            {allTags.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
        </div>
      </div>

      <div style={S.actions}>
        <button type="button" onClick={onCancel} style={S.cancel}>취소</button>
        <button type="submit" style={S.submit}>{submitLabel}</button>
      </div>
    </form>
  );
}

const S: Record<string, any> = {
  formTitle: { fontSize: 16, fontWeight: 700, marginBottom: 16 },
  toggleRow: { display: "flex", gap: 6, marginBottom: 14 },
  toggle: { flex: 1, padding: "9px 0", borderRadius: 9, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#6b7280" },
  toggleOn: (t: string) => ({ background: t === "income" ? "#dcfce7" : "#fee2e2", color: t === "income" ? "#16a34a" : "#dc2626", borderColor: "transparent" }),
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  field: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 12, minWidth: 0 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: 500 },
  input: { width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 14, fontFamily: "inherit", outline: "none" },
  tagBox: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 9, minHeight: 40 },
  tagChip: { display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 500, padding: "3px 8px", borderRadius: 6 },
  tagX: { cursor: "pointer", color: "#93c5fd", fontWeight: 700 },
  tagInput: { flex: 1, minWidth: 80, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit" },
  actions: { display: "flex", gap: 8, marginTop: 8 },
  cancel: { flex: 1, padding: "11px 0", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  submit: { flex: 2, padding: "11px 0", background: "#3b82f6", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
