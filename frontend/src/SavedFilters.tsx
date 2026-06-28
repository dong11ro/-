import type { FilterPayload, SavedFilter } from "./types";

type Props = {
  savedFilters: SavedFilter[];
  canSave: boolean;
  onSave: () => void;
  onApply: (sf: SavedFilter) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
};

// 저장된 필터 조합 요약 문구
function summary(p: FilterPayload): string {
  const parts: string[] = [];
  if (p.period && p.period !== "전체") parts.push(p.period);
  if (p.category_ids.length) parts.push(`카테고리 ${p.category_ids.length}`);
  if (p.payment_method_ids.length) parts.push(`결제수단 ${p.payment_method_ids.length}`);
  if (p.tags.length) parts.push(`태그 ${p.tags.length}`);
  return parts.join(" · ") || "전체";
}

// 필터 즐겨찾기 목록 팝업: 현재 필터 저장 + 저장된 것 적용/삭제
export default function SavedFilters({ savedFilters, canSave, onSave, onApply, onDelete, onClose }: Props) {
  return (
    <div>
      <div style={S.title}>필터 즐겨찾기</div>

      <button onClick={onSave} disabled={!canSave}
        style={{ ...S.saveBtn, opacity: canSave ? 1 : 0.4, cursor: canSave ? "pointer" : "default" }}>
        ＋ 현재 필터 저장
      </button>
      {!canSave && <div style={S.hint}>필터를 하나 이상 적용하면 저장할 수 있어요.</div>}

      {savedFilters.length === 0 ? (
        <div style={S.empty}>저장된 즐겨찾기가 없어요.</div>
      ) : (
        <div style={S.list}>
          {savedFilters.map((sf) => (
            <div key={sf.id} style={S.row}>
              <div onClick={() => onApply(sf)} style={S.info}>
                <div style={S.name}>★ {sf.name}</div>
                <div style={S.sub}>{summary(sf.payload)}</div>
              </div>
              <button onClick={() => onDelete(sf.id)} style={S.del}>삭제</button>
            </div>
          ))}
        </div>
      )}

      <button onClick={onClose} style={S.close}>닫기</button>
    </div>
  );
}

const S: Record<string, any> = {
  title: { fontSize: 16, fontWeight: 700, marginBottom: 14 },
  saveBtn: { width: "100%", padding: "10px 0", background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit" },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 6 },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" },
  list: { display: "flex", flexDirection: "column", gap: 6, margin: "16px 0" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9 },
  info: { cursor: "pointer", minWidth: 0, flex: 1 },
  name: { fontSize: 14, fontWeight: 700, color: "#b45309" },
  sub: { fontSize: 12, color: "#a16207", marginTop: 2 },
  del: { padding: "4px 10px", background: "white", border: "1px solid #fde68a", borderRadius: 7, fontSize: 12, color: "#b45309", cursor: "pointer", flexShrink: 0 },
  close: { width: "100%", padding: "11px 0", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: 8 },
};
