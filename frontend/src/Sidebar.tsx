import type { View } from "./types";

const ITEMS: { key: View; label: string }[] = [
  { key: "dashboard", label: "대시보드" },
  { key: "transactions", label: "거래 내역" },
  { key: "import", label: "가져오기" },
  { key: "analysis", label: "분석" },
];
const SOON = ["예산", "설정"]; // 아직 미구현 (디자인 자리만)

export default function Sidebar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div style={S.bar}>
      <div style={S.logo}>가계부</div>
      <nav style={S.nav}>
        {ITEMS.map((it) => (
          <div key={it.key} onClick={() => onChange(it.key)} style={S.item(view === it.key)}>
            {it.label}
          </div>
        ))}
        <div style={S.divider} />
        {SOON.map((label) => (
          <div key={label} style={S.soon} title="준비 중">{label}</div>
        ))}
      </nav>
    </div>
  );
}

const S: Record<string, any> = {
  bar: { width: 220, flexShrink: 0, background: "#111827", minHeight: "100vh", padding: "22px 14px", display: "flex", flexDirection: "column", gap: 16 },
  logo: { color: "#f9fafb", fontSize: 18, fontWeight: 700, letterSpacing: "-0.3px", padding: "0 8px" },
  nav: { display: "flex", flexDirection: "column", gap: 2 },
  item: (active: boolean) => ({
    padding: "10px 12px", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500,
    color: active ? "#93c5fd" : "rgba(255,255,255,.55)", background: active ? "rgba(59,130,246,.18)" : "transparent",
  }),
  divider: { height: 1, background: "rgba(255,255,255,.08)", margin: "8px 4px" },
  soon: { padding: "10px 12px", fontSize: 14, color: "rgba(255,255,255,.25)", cursor: "default" },
};
