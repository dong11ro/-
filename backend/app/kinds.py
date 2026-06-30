"""거래 종류 구분 — 대분류 이름으로 소비/저축/투자/이체 판정 (소비 분석 제외·현금흐름 집계용)."""

# 대분류 이름 → 비소비 종류
KIND_BY_TOP = {"저축": "saving", "투자": "investment", "이체": "transfer"}


def kind_of(top_name: str | None) -> str:
    """대분류 이름 → 'consumption'(소비) / 'saving' / 'investment' / 'transfer'."""
    return KIND_BY_TOP.get(top_name or "", "consumption")
