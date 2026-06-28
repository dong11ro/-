import type { Tag } from "./types";

type Props = {
  tags: Tag[];
  onDelete: (tag: Tag) => void;
  onClose: () => void;
};

// 전체 태그 목록 + 각 태그 완전 삭제
export default function TagManager({ tags, onDelete, onClose }: Props) {
  return (
    <div>
      <div style={S.title}>태그 관리</div>
      <div style={S.desc}>태그를 삭제하면 모든 거래에서 제거됩니다.</div>

      {tags.length === 0 && <div style={S.empty}>아직 태그가 없어요.</div>}
      <div style={S.list}>
        {tags.map((t) => (
          <div key={t.id} style={S.row}>
            <span style={S.tagName}>#{t.name}</span>
            <button onClick={() => onDelete(t)} style={S.del}>삭제</button>
          </div>
        ))}
      </div>

      <button onClick={onClose} style={S.close}>닫기</button>
    </div>
  );
}

const S: Record<string, any> = {
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  desc: { fontSize: 12.5, color: "#9ca3af", marginBottom: 16 },
  empty: { color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "20px 0" },
  list: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#f8fafc", borderRadius: 9 },
  tagName: { fontSize: 14, fontWeight: 500, color: "#1d4ed8" },
  del: { padding: "4px 10px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 7, fontSize: 12, color: "#dc2626", cursor: "pointer" },
  close: { width: "100%", padding: "11px 0", background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" },
};
