import type { ReactNode } from "react";

// 화면을 덮는 반투명 오버레이 + 가운데 카드. 바깥 클릭하면 닫힘.
export default function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose} style={S.overlay}>
      {/* 카드 안 클릭은 닫힘으로 전파 안 되게 stopPropagation */}
      <div onClick={(e) => e.stopPropagation()} style={S.card}>
        {children}
      </div>
    </div>
  );
}

const S: Record<string, any> = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(17,24,39,.5)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "48px 16px", zIndex: 50, overflowY: "auto",
  },
  card: {
    background: "white", borderRadius: 16, padding: 22, width: "100%", maxWidth: 460,
    boxShadow: "0 20px 50px rgba(0,0,0,.25)", fontFamily: "Pretendard, -apple-system, sans-serif",
  },
};
