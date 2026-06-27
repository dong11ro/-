import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import TransactionForm from "./TransactionForm";
import type { Category, PaymentMethod, Tag, Transaction } from "./types";

const API = "http://localhost:8000";

const won = (n: string | number) => "₩" + Math.abs(Number(n)).toLocaleString("ko-KR");

// 날짜 그룹 헤더 라벨: "6월 27일 (금)"
function dateLabel(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const wd = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${wd})`;
}

// 기간 프리셋 → 날짜 범위(YYYY-MM-DD). 로컬 시간 기준 포맷(타임존 어긋남 방지).
function periodRange(period: string): { from?: string; to?: string } {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (period === "이번 달") return { from: fmt(new Date(y, m, 1)), to: fmt(new Date(y, m + 1, 0)) };
  if (period === "지난 달") return { from: fmt(new Date(y, m - 1, 1)), to: fmt(new Date(y, m, 0)) };
  if (period === "최근 3개월") return { from: fmt(new Date(y, m - 2, 1)), to: fmt(new Date(y, m + 1, 0)) };
  return {}; // 전체
}

// 모달 상태: 닫힘(null) / 추가 / 수정(대상 거래 포함)
type ModalState = null | { mode: "add" } | { mode: "edit"; tx: Transaction };

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [modal, setModal] = useState<ModalState>(null);

  // 필터 상태
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterPaymentId, setFilterPaymentId] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("전체");

  // ── 데이터 로드 ──
  const loadTxs = () => {
    const p = new URLSearchParams();
    if (filterCategoryId) p.set("category_id", filterCategoryId);
    if (filterPaymentId) p.set("payment_method_id", filterPaymentId);
    if (filterTag) p.append("tags", filterTag);
    const { from, to } = periodRange(filterPeriod);
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    const qs = p.toString();
    return fetch(`${API}/transactions${qs ? `?${qs}` : ""}`).then((r) => r.json()).then(setTxs);
  };
  const loadTags = () => fetch(`${API}/tags`).then((r) => r.json()).then(setAllTags);

  useEffect(() => {
    fetch(`${API}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${API}/payment-methods`).then((r) => r.json()).then(setMethods);
    loadTags();
  }, []);

  useEffect(() => {
    loadTxs();
  }, [filterCategoryId, filterPaymentId, filterTag, filterPeriod]);

  // 이름 빠른 조회용 맵
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name] as [number, string])), [categories]);
  const methodName = useMemo(() => new Map(methods.map((m) => [m.id, m.name] as [number, string])), [methods]);

  // 필터 드롭다운용: 전체 카테고리를 대분류>소분류로 그룹
  const filterGroups = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id === null);
    return parents.map((p) => ({ parent: p, children: categories.filter((c) => c.parent_id === p.id) }));
  }, [categories]);

  // 요약: 현재 목록의 건수·총수입·총지출
  const summary = useMemo(() => {
    let income = 0, expense = 0;
    for (const t of txs) {
      if (t.type === "income") income += Number(t.amount);
      else expense += Number(t.amount);
    }
    return { count: txs.length, income, expense };
  }, [txs]);

  // 날짜별 그룹 (txs는 최신순이라 그룹도 날짜 내림차순 유지)
  const dateGroups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of txs) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map, ([date, items]) => ({ date, items }));
  }, [txs]);

  // ── 추가/수정 저장 (모달 폼에서 호출) ──
  async function handleSubmit(payload: any) {
    if (modal?.mode === "edit") {
      await fetch(`${API}/transactions/${modal.tx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${API}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setModal(null);
    loadTxs();
    loadTags();
  }

  async function remove(id: number) {
    await fetch(`${API}/transactions/${id}`, { method: "DELETE" });
    loadTxs();
  }

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <h1 style={S.h1}>가계부</h1>
        <button onClick={() => setModal({ mode: "add" })} style={S.addBtn}>+ 거래 추가</button>
      </div>

      {/* ── 거래 목록 ── */}
      <div style={S.card}>
        <div style={S.listHeaderCol}>
          <span style={S.formTitle}>거래 내역 ({txs.length})</span>
          <div style={S.filterBar}>
            <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} style={S.filterSelect}>
              {["전체", "이번 달", "지난 달", "최근 3개월"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filterCategoryId} onChange={(e) => setFilterCategoryId(e.target.value)} style={S.filterSelect}>
              <option value="">전체 카테고리</option>
              {filterGroups.map((g) =>
                g.children.length > 0 ? (
                  <optgroup key={g.parent.id} label={g.parent.name}>
                    {g.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                ) : (
                  <option key={g.parent.id} value={g.parent.id}>{g.parent.name}</option>
                )
              )}
            </select>
            <select value={filterPaymentId} onChange={(e) => setFilterPaymentId(e.target.value)} style={S.filterSelect}>
              <option value="">전체 결제수단</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={S.filterSelect}>
              <option value="">전체 태그</option>
              {allTags.map((t) => <option key={t.id} value={t.name}>#{t.name}</option>)}
            </select>
          </div>
        </div>

        {txs.length === 0 && <div style={S.empty}>조건에 맞는 거래가 없어요.</div>}

        {/* 요약행 */}
        {txs.length > 0 && (
          <div style={S.summary}>
            <span style={S.summaryCount}>{summary.count}건</span>
            <div style={S.summaryAmts}>
              <span style={{ color: "#16a34a" }}>수입 +{won(summary.income)}</span>
              <span style={{ color: "#dc2626" }}>지출 -{won(summary.expense)}</span>
            </div>
          </div>
        )}

        {/* 날짜별 그룹 */}
        {dateGroups.map((g) => (
          <div key={g.date}>
            <div style={S.dateHeader}>{dateLabel(g.date)}</div>
            {g.items.map((t) => (
              <div key={t.id} style={S.row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.rowTop}>
                    <span style={S.rowName}>{t.alias || t.memo || catName.get(t.category_id ?? -1) || "(무제)"}</span>
                    <span style={{ ...S.amount, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "income" ? "+" : "-"}{won(t.amount)}
                    </span>
                  </div>
                  <div style={S.rowSub}>
                    {t.category_id && catName.get(t.category_id)}
                    {t.payment_method_id && ` · ${methodName.get(t.payment_method_id)}`}
                    {t.memo && t.alias && ` · ${t.memo}`}
                  </div>
                  {t.tags.length > 0 && (
                    <div style={S.rowTags}>
                      {t.tags.map((tag) => <span key={tag} style={S.rowTag}>#{tag}</span>)}
                    </div>
                  )}
                </div>
                <div style={S.rowBtns}>
                  <button onClick={() => setModal({ mode: "edit", tx: t })} style={S.editBtn}>수정</button>
                  <button onClick={() => remove(t.id)} style={S.del}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── 추가/수정 모달 (폼 재사용) ── */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          <TransactionForm
            categories={categories}
            methods={methods}
            allTags={allTags}
            initial={modal.mode === "edit" ? modal.tx : undefined}
            submitLabel={modal.mode === "edit" ? "수정 저장" : "저장"}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 680, margin: "0 auto", padding: "32px 20px", fontFamily: "Pretendard, -apple-system, sans-serif", color: "#111827" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.4px" },
  addBtn: { padding: "9px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  formTitle: { fontSize: 15, fontWeight: 700 },
  listHeaderCol: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 },
  filterBar: { display: "flex", flexWrap: "wrap", gap: 8 },
  filterSelect: { padding: "7px 10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", background: "white", cursor: "pointer", color: "#374151" },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "24px 0" },
  summary: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: 9, marginBottom: 6 },
  summaryCount: { fontSize: 12.5, fontWeight: 600, color: "#6b7280" },
  summaryAmts: { display: "flex", gap: 14, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  dateHeader: { fontSize: 12, fontWeight: 700, color: "#9ca3af", padding: "12px 2px 4px" },
  row: { display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  rowName: { fontSize: 14, fontWeight: 600 },
  amount: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  rowSub: { fontSize: 12, color: "#9ca3af" },
  rowTags: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 },
  rowTag: { fontSize: 11, color: "#1d4ed8", background: "#eff6ff", padding: "2px 7px", borderRadius: 5 },
  rowBtns: { display: "flex", gap: 6, flexShrink: 0 },
  editBtn: { padding: "5px 10px", background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 7, fontSize: 12, color: "#1d4ed8", cursor: "pointer" },
  del: { padding: "5px 10px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 12, color: "#6b7280", cursor: "pointer" },
};
