import { useState } from "react";

const API = "http://localhost:8000";
const won = (n: number | string) => "₩" + Math.abs(Number(n)).toLocaleString("ko-KR");

type Candidate = {
  date: string;
  type: "income" | "expense";
  amount: number | string;
  merchant: string | null;
  memo: string | null;
};

export default function ImportView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setMsg("");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", f);
    const res = await fetch(`${API}/import/preview`, { method: "POST", body: fd });
    setCandidates(await res.json());
    setLoading(false);
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
  }

  async function commit() {
    const res = await fetch(`${API}/import/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: candidates }),
    });
    const data = await res.json();
    setMsg(`${data.inserted}건을 가져왔어요. 거래 내역에서 확인하세요.`);
    setCandidates([]);
    setFileName("");
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>가져오기</h1>

      <div style={S.card}>
        <div style={S.cardTitle}>CSV 파일 업로드</div>
        <div style={S.guide}>
          형식: <code style={S.code}>date, amount, merchant, memo</code> · 금액이 음수면 지출, 양수면 수입
        </div>
        <label style={S.fileBtn}>
          파일 선택
          <input type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        </label>
        {fileName && <span style={S.fileName}>{fileName}</span>}
        {loading && <span style={S.fileName}>파싱 중…</span>}
      </div>

      {msg && <div style={S.msg}>{msg}</div>}

      {candidates.length > 0 && (
        <div style={S.card}>
          <div style={S.previewHead}>
            <span style={S.cardTitle}>미리보기 ({candidates.length}건)</span>
            <button onClick={commit} style={S.commitBtn}>{candidates.length}건 가져오기</button>
          </div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>날짜</th>
                  <th style={S.th}>가맹점</th>
                  <th style={S.th}>메모</th>
                  <th style={{ ...S.th, textAlign: "right" }}>금액</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i}>
                    <td style={S.td}>{c.date}</td>
                    <td style={S.td}>{c.merchant}</td>
                    <td style={{ ...S.td, color: "#9ca3af" }}>{c.memo}</td>
                    <td style={{ ...S.td, textAlign: "right", fontWeight: 700, color: c.type === "income" ? "#16a34a" : "#dc2626" }}>
                      {c.type === "income" ? "+" : "-"}{won(c.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, any> = {
  page: { maxWidth: 760, margin: "0 auto", padding: "28px 24px", color: "#111827" },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 18, letterSpacing: "-0.4px" },
  card: { background: "white", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05)", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 700 },
  guide: { fontSize: 13, color: "#6b7280", margin: "10px 0 16px" },
  code: { background: "#f1f5f9", padding: "2px 6px", borderRadius: 5, fontSize: 12.5, color: "#374151" },
  fileBtn: { display: "inline-block", padding: "9px 16px", background: "#3b82f6", color: "white", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  fileName: { fontSize: 13, color: "#6b7280", marginLeft: 12 },
  msg: { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", fontSize: 14, fontWeight: 600, marginBottom: 12 },
  previewHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  commitBtn: { padding: "9px 16px", background: "#16a34a", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #f1f5f9", color: "#6b7280", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" },
  td: { padding: "9px 10px", borderBottom: "1px solid #f8fafc", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" },
};
