import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import TransactionForm from "./TransactionForm";
import TagManager from "./TagManager";
import SavedFilters from "./SavedFilters";
import type { Category, PaymentMethod, SavedFilter, Tag, Transaction } from "./types";

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

// 입력 경로 → 뱃지 표시
const SOURCE_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  manual: { label: "수동", bg: "#f1f5f9", color: "#64748b" },
  csv: { label: "CSV", bg: "#dbeafe", color: "#1d4ed8" },
  template: { label: "고정", bg: "#fef3c7", color: "#92400e" },
  ocr: { label: "OCR", bg: "#e0e7ff", color: "#4338ca" },
};

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

// 모달 상태: 닫힘(null) / 추가 / 수정(대상 거래 포함)
type ModalState = null | { mode: "add" } | { mode: "edit"; tx: Transaction };

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [tagModal, setTagModal] = useState(false);
  const [savedModal, setSavedModal] = useState(false);

  // 필터 상태 (다중선택)
  const [filterCategoryIds, setFilterCategoryIds] = useState<number[]>([]);
  const [filterPaymentIds, setFilterPaymentIds] = useState<number[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState("전체");
  const [openPanel, setOpenPanel] = useState<null | "period" | "category" | "payment" | "tag">(null);

  // ── 데이터 로드 ──
  const loadTxs = () => {
    const p = new URLSearchParams();
    filterCategoryIds.forEach((id) => p.append("category_ids", String(id)));
    filterPaymentIds.forEach((id) => p.append("payment_method_ids", String(id)));
    filterTags.forEach((t) => p.append("tags", t));
    const { from, to } = periodRange(filterPeriod);
    if (from) p.set("date_from", from);
    if (to) p.set("date_to", to);
    const qs = p.toString();
    return fetch(`${API}/transactions${qs ? `?${qs}` : ""}`).then((r) => r.json()).then(setTxs);
  };
  const loadTags = () => fetch(`${API}/tags`).then((r) => r.json()).then(setAllTags);
  const loadSavedFilters = () => fetch(`${API}/saved-filters`).then((r) => r.json()).then(setSavedFilters);

  useEffect(() => {
    fetch(`${API}/categories`).then((r) => r.json()).then(setCategories);
    fetch(`${API}/payment-methods`).then((r) => r.json()).then(setMethods);
    loadTags();
    loadSavedFilters();
  }, []);

  useEffect(() => {
    loadTxs();
  }, [filterCategoryIds, filterPaymentIds, filterTags, filterPeriod]);

  // 필터 토글 헬퍼
  const toggleNum = (arr: number[], set: (v: number[]) => void, id: number) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const toggleTag = (name: string) =>
    setFilterTags(filterTags.includes(name) ? filterTags.filter((x) => x !== name) : [...filterTags, name]);
  const resetFilters = () => {
    setFilterCategoryIds([]); setFilterPaymentIds([]); setFilterTags([]); setFilterPeriod("전체");
  };
  const togglePanel = (name: typeof openPanel) => setOpenPanel(openPanel === name ? null : name);

  // ── 필터 즐겨찾기 ──
  const hasActiveFilter =
    filterCategoryIds.length > 0 || filterPaymentIds.length > 0 || filterTags.length > 0 || filterPeriod !== "전체";

  async function saveCurrentFilter() {
    const name = prompt("즐겨찾기 이름을 입력하세요");
    if (!name?.trim()) return;
    await fetch(`${API}/saved-filters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        payload: {
          category_ids: filterCategoryIds,
          payment_method_ids: filterPaymentIds,
          tags: filterTags,
          period: filterPeriod,
        },
      }),
    });
    loadSavedFilters();
  }

  function applySavedFilter(sf: SavedFilter) {
    setFilterCategoryIds(sf.payload.category_ids);
    setFilterPaymentIds(sf.payload.payment_method_ids);
    setFilterTags(sf.payload.tags);
    setFilterPeriod(sf.payload.period);
    setOpenPanel(null);
    setSavedModal(false);
  }

  async function deleteSavedFilter(id: number) {
    await fetch(`${API}/saved-filters/${id}`, { method: "DELETE" });
    loadSavedFilters();
  }

  // 이름 빠른 조회용 맵
  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name] as [number, string])), [categories]);
  const catColor = useMemo(() => new Map(categories.map((c) => [c.id, c.color] as [number, string | null])), [categories]);
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

  // 적용된 필터 칩 (개별 제거 가능)
  const appliedChips: { key: string; label: string; remove: () => void }[] = [
    ...(filterPeriod !== "전체" ? [{ key: "period", label: filterPeriod, remove: () => setFilterPeriod("전체") }] : []),
    ...filterCategoryIds.map((id) => ({ key: "c" + id, label: catName.get(id) ?? "?", remove: () => setFilterCategoryIds(filterCategoryIds.filter((x) => x !== id)) })),
    ...filterPaymentIds.map((id) => ({ key: "p" + id, label: methodName.get(id) ?? "?", remove: () => setFilterPaymentIds(filterPaymentIds.filter((x) => x !== id)) })),
    ...filterTags.map((t) => ({ key: "t" + t, label: "#" + t, remove: () => setFilterTags(filterTags.filter((x) => x !== t)) })),
  ];

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

  // 태그 완전 삭제 (모든 거래에서 제거)
  async function deleteTag(tag: Tag) {
    if (!confirm(`'#${tag.name}' 태그를 완전히 삭제할까요? 모든 거래에서 제거됩니다.`)) return;
    await fetch(`${API}/tags/${tag.id}`, { method: "DELETE" });
    setFilterTags(filterTags.filter((x) => x !== tag.name)); // 그 태그로 필터 중이었으면 해제
    loadTags();
    loadTxs();
  }

  return (
    <div style={S.page}>
      <div style={S.topBar}>
        <h1 style={S.h1}>가계부</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTagModal(true)} style={S.ghostBtn}>태그 관리</button>
          <button onClick={() => setModal({ mode: "add" })} style={S.addBtn}>+ 거래 추가</button>
        </div>
      </div>

      {/* ── 거래 목록 ── */}
      <div style={S.card}>
        <div style={S.listHeaderCol}>
          <div style={S.listTitleRow}>
            <span style={S.formTitle}>거래 내역 ({txs.length})</span>
            <button onClick={() => setSavedModal(true)} style={S.saveFavBtn}>
              ★ 즐겨찾기{savedFilters.length ? ` (${savedFilters.length})` : ""}
            </button>
          </div>

          {/* 필터 칩 버튼들 */}
          <div style={S.filterBar}>
            <button onClick={() => togglePanel("period")} style={S.chip(filterPeriod !== "전체")}>
              {filterPeriod !== "전체" ? filterPeriod : "기간"} ▾
            </button>
            <button onClick={() => togglePanel("category")} style={S.chip(filterCategoryIds.length > 0)}>
              카테고리{filterCategoryIds.length ? ` ${filterCategoryIds.length}` : ""} ▾
            </button>
            <button onClick={() => togglePanel("payment")} style={S.chip(filterPaymentIds.length > 0)}>
              결제수단{filterPaymentIds.length ? ` ${filterPaymentIds.length}` : ""} ▾
            </button>
            <button onClick={() => togglePanel("tag")} style={S.chip(filterTags.length > 0)}>
              태그{filterTags.length ? ` ${filterTags.length}` : ""} ▾
            </button>
          </div>

          {/* 펼쳐진 패널 */}
          {openPanel === "period" && (
            <div style={S.panel}>
              {["전체", "이번 달", "지난 달", "최근 3개월"].map((p) => (
                <button key={p} onClick={() => { setFilterPeriod(p); setOpenPanel(null); }} style={S.opt(filterPeriod === p)}>{p}</button>
              ))}
            </div>
          )}
          {openPanel === "category" && (
            <div style={S.panel}>
              {filterGroups.map((g) => (
                <div key={g.parent.id} style={{ width: "100%" }}>
                  <div style={S.panelGroup}>{g.parent.name}</div>
                  <div style={S.optWrap}>
                    {(g.children.length ? g.children : [g.parent]).map((c) => (
                      <button key={c.id} onClick={() => toggleNum(filterCategoryIds, setFilterCategoryIds, c.id)} style={S.opt(filterCategoryIds.includes(c.id))}>{c.name}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {openPanel === "payment" && (
            <div style={S.panel}>
              <div style={S.optWrap}>
                {methods.map((m) => (
                  <button key={m.id} onClick={() => toggleNum(filterPaymentIds, setFilterPaymentIds, m.id)} style={S.opt(filterPaymentIds.includes(m.id))}>{m.name}</button>
                ))}
              </div>
            </div>
          )}
          {openPanel === "tag" && (
            <div style={S.panel}>
              {allTags.length === 0 ? <div style={S.panelEmpty}>태그가 없어요.</div> : (
                <div style={S.optWrap}>
                  {allTags.map((t) => (
                    <button key={t.id} onClick={() => toggleTag(t.name)} style={S.opt(filterTags.includes(t.name))}>#{t.name}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 적용된 필터 칩 + 초기화 */}
          {appliedChips.length > 0 && (
            <div style={S.appliedRow}>
              {appliedChips.map((c) => (
                <span key={c.key} style={S.appliedChip}>{c.label}<span onClick={c.remove} style={S.chipX}>×</span></span>
              ))}
              <button onClick={resetFilters} style={S.resetBtn}>초기화</button>
            </div>
          )}
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
            {g.items.map((t) => {
              const name = t.alias || t.memo || catName.get(t.category_id ?? -1) || "(무제)";
              const color = catColor.get(t.category_id ?? -1) || "#9ca3af";
              const badge = SOURCE_BADGE[t.source] ?? SOURCE_BADGE.manual;
              return (
                <div key={t.id} style={S.row}>
                  {/* 카테고리 색 아바타 (이름 첫 글자) */}
                  <div style={{ ...S.avatar, background: color + "22", color }}>{name[0]}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={S.rowTop}>
                      <span style={S.rowName}>{name}</span>
                      {t.tags.map((tag) => <span key={tag} style={S.rowTag}>#{tag}</span>)}
                      <span style={{ ...S.srcBadge, background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>
                    <div style={S.rowSub}>
                      {t.category_id && catName.get(t.category_id)}
                      {t.payment_method_id && ` · ${methodName.get(t.payment_method_id)}`}
                      {t.memo && t.alias && ` · ${t.memo}`}
                      {t.raw_merchant && ` · 원본: ${t.raw_merchant}`}
                    </div>
                  </div>

                  <div style={S.rowRight}>
                    <span style={{ ...S.amount, color: t.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {t.type === "income" ? "+" : "-"}{won(t.amount)}
                    </span>
                    <div style={S.rowBtns}>
                      <button onClick={() => setModal({ mode: "edit", tx: t })} style={S.iconEdit} title="수정"><PencilIcon /></button>
                      <button onClick={() => remove(t.id)} style={S.iconDel} title="삭제"><TrashIcon /></button>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* ── 태그 관리 모달 ── */}
      {tagModal && (
        <Modal onClose={() => setTagModal(false)}>
          <TagManager tags={allTags} onDelete={deleteTag} onClose={() => setTagModal(false)} />
        </Modal>
      )}

      {/* ── 필터 즐겨찾기 모달 ── */}
      {savedModal && (
        <Modal onClose={() => setSavedModal(false)}>
          <SavedFilters
            savedFilters={savedFilters}
            canSave={hasActiveFilter}
            onSave={saveCurrentFilter}
            onApply={applySavedFilter}
            onDelete={deleteSavedFilter}
            onClose={() => setSavedModal(false)}
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
  ghostBtn: { padding: "9px 14px", background: "white", color: "#374151", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { background: "white", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,.05)" },
  formTitle: { fontSize: 15, fontWeight: 700 },
  listHeaderCol: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 },
  listTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  saveFavBtn: { padding: "6px 12px", background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" },
  filterBar: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: (active: boolean) => ({ padding: "7px 12px", borderRadius: 20, border: `1px solid ${active ? "#3b82f6" : "#d1d5db"}`, background: active ? "#eff6ff" : "white", color: active ? "#1d4ed8" : "#374151", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }),
  panel: { display: "flex", flexWrap: "wrap", gap: 8, padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e5e7eb" },
  panelGroup: { width: "100%", fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 6, marginTop: 2 },
  optWrap: { display: "flex", flexWrap: "wrap", gap: 6, width: "100%" },
  opt: (active: boolean) => ({ padding: "5px 11px", borderRadius: 7, border: `1px solid ${active ? "#3b82f6" : "#e5e7eb"}`, background: active ? "#3b82f6" : "white", color: active ? "white" : "#374151", fontSize: 12.5, fontWeight: 500, fontFamily: "inherit", cursor: "pointer" }),
  panelEmpty: { fontSize: 13, color: "#9ca3af", padding: "8px 4px" },
  appliedRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 },
  appliedChip: { display: "inline-flex", alignItems: "center", gap: 4, background: "#eff6ff", color: "#1d4ed8", fontSize: 12, fontWeight: 500, padding: "3px 9px", borderRadius: 6 },
  chipX: { cursor: "pointer", color: "#93c5fd", fontWeight: 700 },
  resetBtn: { padding: "3px 10px", background: "none", border: "none", color: "#6b7280", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "underline" },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "24px 0" },
  summary: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: 9, marginBottom: 6 },
  summaryCount: { fontSize: 12.5, fontWeight: 600, color: "#6b7280" },
  summaryAmts: { display: "flex", gap: 14, fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums" },
  dateHeader: { fontSize: 12, fontWeight: 700, color: "#9ca3af", padding: "12px 2px 4px" },
  row: { display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  avatar: { width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 },
  rowTop: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 3 },
  rowName: { fontSize: 14, fontWeight: 600 },
  rowSub: { fontSize: 12, color: "#9ca3af" },
  rowTag: { fontSize: 11, color: "#1d4ed8", background: "#eff6ff", padding: "2px 7px", borderRadius: 5 },
  srcBadge: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5 },
  rowRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 },
  amount: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  rowBtns: { display: "flex", gap: 6 },
  iconEdit: { display: "flex", padding: 6, background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 7, color: "#1d4ed8", cursor: "pointer" },
  iconDel: { display: "flex", padding: 6, background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 7, color: "#dc2626", cursor: "pointer" },
};
