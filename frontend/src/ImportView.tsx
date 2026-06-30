import { useEffect, useMemo, useState } from "react";
import type { Category } from "./types";

const API = "http://localhost:8000";
const won = (n: number | string) => "₩" + Math.abs(Number(n)).toLocaleString("ko-KR");

type Candidate = {
  date: string;
  type: "income" | "expense";
  amount: number | string;
  merchant: string | null;
  alias: string | null;
  memo: string | null;
  category_id: number | null;
  matched: boolean;
  save_rule: boolean;
  duplicate: boolean;
  include: boolean;
};
type Rule = { id: number; keyword: string; category_id: number; alias: string | null; priority: number };

export default function ImportView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("simple");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newKw, setNewKw] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newAlias, setNewAlias] = useState("");

  const loadRules = () => fetch(`${API}/merchant-rules`).then((r) => r.json()).then(setRules);
  useEffect(() => {
    fetch(`${API}/categories`).then((r) => r.json()).then(setCategories);
    loadRules();
  }, []);

  const grouped = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id === null);
    return parents.map((p) => ({ parent: p, children: categories.filter((c) => c.parent_id === p.id) }));
  }, [categories]);

  // 공용 카테고리 옵션 (미리보기·규칙 편집에서 재사용)
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

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name); setMsg(""); setLoading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("source", source);
    const res = await fetch(`${API}/import/preview`, { method: "POST", body: fd });
    const data = await res.json();
    // 중복은 기본 체크 해제(안 가져옴)
    setCandidates(data.map((c: any) => ({ ...c, save_rule: false, include: !c.duplicate })));
    setLoading(false);
    e.target.value = "";
  }

  function updateCand(i: number, patch: Partial<Candidate>) {
    setCandidates((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function commit() {
    const items = candidates.filter((c) => c.include);
    const res = await fetch(`${API}/import/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    setMsg(`${data.inserted}건을 가져왔어요. 거래 내역에서 확인하세요.`);
    setCandidates([]); setFileName("");
    loadRules();
  }

  async function deleteRule(id: number) {
    await fetch(`${API}/merchant-rules/${id}`, { method: "DELETE" });
    loadRules();
  }

  async function applyToExisting() {
    const res = await fetch(`${API}/merchant-rules/apply`, { method: "POST" });
    const d = await res.json();
    setMsg(`기존 미분류 거래 ${d.updated}건이 규칙으로 분류됐어요.`);
  }

  async function addRule() {
    if (!newKw.trim() || !newCat) return;
    await fetch(`${API}/merchant-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newKw.trim(), category_id: Number(newCat), alias: newAlias.trim() || newKw.trim(), priority: 0 }),
    });
    setNewKw(""); setNewCat(""); setNewAlias("");
    loadRules();
  }

  // 규칙 인라인 편집 (로컬 상태만 갱신)
  const updateRule = (id: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function saveRule(r: Rule) {
    await fetch(`${API}/merchant-rules/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: r.keyword, category_id: r.category_id, alias: r.alias, priority: r.priority }),
    });
    loadRules();
  }

  const matchedCount = candidates.filter((c) => c.matched).length;
  const dupCount = candidates.filter((c) => c.duplicate).length;
  const includeCount = candidates.filter((c) => c.include).length;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>가져오기</h1>

      <div style={S.card}>
        <div style={S.cardTitle}>파일 업로드</div>
        <div style={S.segRow}>
          {[{ k: "simple", label: "단순 CSV" }, { k: "kb", label: "KB국민은행" }].map((s) => (
            <button key={s.k} onClick={() => setSource(s.k)} style={S.seg(source === s.k)}>{s.label}</button>
          ))}
        </div>
        <div style={S.guide}>
          {source === "kb"
            ? <>KB국민은행 거래내역 <code style={S.code}>.xls</code> 파일을 그대로 올리세요.</>
            : <>형식: <code style={S.code}>date, amount, merchant, memo</code> · 금액 음수=지출</>}
        </div>
        <label style={S.fileBtn}>
          파일 선택
          <input type="file" accept=".csv,.xls,.xlsx" onChange={onFile} style={{ display: "none" }} />
        </label>
        {fileName && <span style={S.fileName}>{fileName}</span>}
        {loading && <span style={S.fileName}>파싱 중…</span>}
      </div>

      {msg && <div style={S.msg}>{msg}</div>}

      {candidates.length > 0 && (
        <div style={S.card}>
          <div style={S.previewHead}>
            <div>
              <span style={S.cardTitle}>미리보기 ({candidates.length}건)</span>
              <span style={S.autoInfo}>
                자동분류 {matchedCount}건 · 분류 필요 {candidates.length - matchedCount}건
                {dupCount > 0 && ` · 중복 ${dupCount}건(제외)`}
              </span>
            </div>
            <button onClick={commit} disabled={includeCount === 0} style={{ ...S.commitBtn, opacity: includeCount === 0 ? 0.4 : 1 }}>
              {includeCount}건 가져오기
            </button>
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, textAlign: "center" }}>포함</th>
                  <th style={S.th}>날짜</th>
                  <th style={S.th}>가맹점(별칭)</th>
                  <th style={S.th}>카테고리</th>
                  <th style={{ ...S.th, textAlign: "right" }}>금액</th>
                  <th style={{ ...S.th, textAlign: "center" }}>규칙</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i} style={c.duplicate ? S.dupRow : c.matched ? undefined : S.unmatchedRow}>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      <input type="checkbox" checked={c.include} onChange={(e) => updateCand(i, { include: e.target.checked })} />
                    </td>
                    <td style={S.td}>{c.date}</td>
                    <td style={S.td}>
                      <input value={c.alias ?? ""} onChange={(e) => updateCand(i, { alias: e.target.value })} style={S.aliasInput} />
                      <div style={S.rawName}>
                        원본: {c.merchant}
                        {c.duplicate && <span style={S.dupBadge}>이미 있음</span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <select value={c.category_id ?? ""} onChange={(e) => updateCand(i, { category_id: e.target.value ? Number(e.target.value) : null })} style={S.catSel}>
                        <option value="">미분류</option>
                        {catOptions()}
                      </select>
                    </td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: c.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {c.type === "income" ? "+" : "-"}{won(c.amount)}
                    </td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      <input type="checkbox" checked={c.save_rule} disabled={!c.alias || !c.category_id}
                        onChange={(e) => updateCand(i, { save_rule: e.target.checked })} title="이 분류를 규칙으로 저장" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={S.ruleHint}>※ "규칙" 체크 시 다음 가져오기부터 같은 가맹점은 자동 분류돼요.</div>
        </div>
      )}

      {/* 분류 규칙 관리 */}
      <div style={S.card}>
        <div style={S.ruleHead}>
          <span style={S.cardTitle}>분류 규칙 ({rules.length})</span>
          <button onClick={applyToExisting} style={S.applyBtn}>기존 거래에 규칙 적용</button>
        </div>
        <div style={S.ruleSub}>가맹점명에 키워드가 포함되면 → 그 카테고리·별칭으로 자동 분류돼요. (송금→이체, 적금→저축 등은 소비 분석에서 제외)</div>

        {/* 직접 추가 */}
        <div style={S.ruleEditRow}>
          <input placeholder="키워드 (예: 스타벅스)" value={newKw} onChange={(e) => setNewKw(e.target.value)} style={S.ruleKw} />
          <select value={newCat} onChange={(e) => setNewCat(e.target.value)} style={S.ruleCat}>
            <option value="">카테고리</option>
            {catOptions()}
          </select>
          <input placeholder="별칭(선택)" value={newAlias} onChange={(e) => setNewAlias(e.target.value)} style={S.ruleAlias} />
          <button onClick={addRule} disabled={!newKw.trim() || !newCat} style={{ ...S.ruleAdd, opacity: !newKw.trim() || !newCat ? 0.4 : 1 }}>추가</button>
        </div>

        {/* 기존 규칙 (인라인 편집) */}
        {rules.length === 0 ? (
          <div style={S.empty}>아직 규칙이 없어요. 위에서 추가하거나, 가져오기에서 "규칙" 체크로 만들 수 있어요.</div>
        ) : (
          <div style={S.ruleList}>
            {rules.map((r) => (
              <div key={r.id} style={S.ruleEditRow}>
                <input value={r.keyword} onChange={(e) => updateRule(r.id, { keyword: e.target.value })} style={S.ruleKw} />
                <select value={r.category_id} onChange={(e) => updateRule(r.id, { category_id: Number(e.target.value) })} style={S.ruleCat}>
                  {catOptions()}
                </select>
                <input value={r.alias ?? ""} onChange={(e) => updateRule(r.id, { alias: e.target.value })} placeholder="별칭" style={S.ruleAlias} />
                <button onClick={() => saveRule(r)} style={S.ruleSave}>저장</button>
                <button onClick={() => deleteRule(r.id)} style={S.ruleDel}>삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 820, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.4px" },
  card: { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700 },
  segRow: { display: "flex", gap: 6, marginTop: 12 },
  seg: (active: boolean) => ({ padding: "7px 14px", borderRadius: 9, border: `1px solid ${active ? "#3b82f6" : "#d1d5db"}`, background: active ? "#eff6ff" : "white", color: active ? "#1d4ed8" : "#374151", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }),
  guide: { fontSize: 13, color: "#6b7280", margin: "12px 0 16px" },
  code: { background: "#f1f5f9", padding: "2px 6px", borderRadius: 5, fontSize: 12.5, color: "#374151" },
  fileBtn: { display: "inline-block", padding: "9px 16px", background: "#3b82f6", color: "white", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  fileName: { fontSize: 13, color: "#6b7280", marginLeft: 12 },
  msg: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, marginBottom: 12 },
  previewHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  autoInfo: { fontSize: 12, color: "#6b7280", marginLeft: 10 },
  commitBtn: { padding: "9px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #f1f5f9", color: "#6b7280", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid #f8fafc", verticalAlign: "middle", fontVariantNumeric: "tabular-nums" },
  unmatchedRow: { background: "#fffbeb" },
  dupRow: { background: "#f8fafc", color: "#9ca3af" },
  dupBadge: { marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", padding: "1px 6px", borderRadius: 4 },
  aliasInput: { width: 140, padding: "5px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit" },
  rawName: { fontSize: 11, color: "#9ca3af", marginTop: 3 },
  catSel: { padding: "6px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 12.5, fontFamily: "inherit", background: "white", maxWidth: 140 },
  ruleHint: { fontSize: 12, color: "#9ca3af", marginTop: 12 },
  empty: { fontSize: 13, color: "#9ca3af", padding: "16px 0", textAlign: "center" },
  ruleHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  applyBtn: { padding: "7px 13px", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" },
  ruleSub: { fontSize: 12.5, color: "#9ca3af", margin: "8px 0 14px" },
  ruleList: { display: "flex", flexDirection: "column", gap: 6 },
  ruleEditRow: { display: "flex", alignItems: "center", gap: 6, padding: "8px 0", flexWrap: "wrap" },
  ruleKw: { flex: "1 1 130px", minWidth: 0, padding: "7px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit", fontWeight: 600 },
  ruleCat: { flex: "1 1 120px", minWidth: 0, padding: "7px 8px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 12.5, fontFamily: "inherit", background: "white" },
  ruleAlias: { flex: "1 1 100px", minWidth: 0, padding: "7px 9px", borderRadius: 7, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "inherit" },
  ruleAdd: { padding: "7px 14px", background: "#3b82f6", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  ruleSave: { padding: "7px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #dbeafe", borderRadius: 8, fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", flexShrink: 0 },
  ruleDel: { padding: "7px 11px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12.5, color: "#6b7280", cursor: "pointer", flexShrink: 0 },
};
