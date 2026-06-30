"""기본 데이터 시딩 (명세서 9장). 카테고리·결제수단 테이블이 비어있을 때만 채운다."""
from sqlalchemy.orm import Session

from . import models

# 지출 카테고리: (대분류, [소분류...])
EXPENSE_CATEGORIES = {
    "식비": ["외식", "식료품", "카페·간식"],
    "교통": ["대중교통", "택시", "주유", "주차"],
    "주거·통신": ["월세·관리비", "공과금", "휴대폰", "인터넷"],
    "생활": ["생필품", "가전·가구", "세탁"],
    "건강": ["병원", "약국"],
    "문화·여가": ["영화·공연", "여행", "구독서비스", "취미", "운동·헬스"],
    "쇼핑": ["의류", "뷰티", "전자기기", "잡화"],
    "경조사·기타": ["선물", "경조사비", "수수료"],
}

# 비소비(자산 이동) 카테고리 — 소비 분석에서 제외, 현금흐름에만 집계
NONCONSUMPTION_CATEGORIES = {
    "저축": ["적금", "예금"],
    "투자": ["주식", "펀드", "코인"],
    "이체": ["송금", "계좌이동"],
}

INCOME_CATEGORIES = ["급여", "용돈", "이자·투자수익", "환급", "기타수입"]

PAYMENT_METHODS = ["현금", "체크카드", "신용카드", "계좌이체", "간편결제"]

# 대분류별 색상 (명세 9장 디자인 팔레트). 소분류는 대분류 색을 물려받는다.
CATEGORY_COLORS = {
    "식비": "#e8733a",
    "교통": "#3b82f6",
    "주거·통신": "#8b5cf6",
    "생활": "#14b8a6",
    "건강": "#22c55e",
    "문화·여가": "#ec4899",
    "쇼핑": "#f59e0b",
    "경조사·기타": "#94a3b8",
    "저축": "#0891b2",
    "투자": "#7c3aed",
    "이체": "#64748b",
}
INCOME_COLOR = "#16a34a"


def seed_defaults(db: Session) -> None:
    """카테고리·결제수단이 하나도 없으면 기본값을 넣는다."""
    if db.query(models.Category).count() == 0:
        for parent_name, children in {**EXPENSE_CATEGORIES, **NONCONSUMPTION_CATEGORIES}.items():
            parent = models.Category(name=parent_name, type="expense", is_default=True)
            db.add(parent)
            db.flush()  # parent.id 확보
            for child_name in children:
                db.add(models.Category(
                    name=child_name, type="expense", parent_id=parent.id, is_default=True
                ))
        for name in INCOME_CATEGORIES:
            db.add(models.Category(name=name, type="income", is_default=True))

    if db.query(models.PaymentMethod).count() == 0:
        for name in PAYMENT_METHODS:
            db.add(models.PaymentMethod(name=name))

    db.commit()


def backfill_noncon_categories(db: Session) -> None:
    """비소비 카테고리(저축/투자/이체)가 없으면 추가 (기존 DB 대상)."""
    changed = False
    for parent_name, children in NONCONSUMPTION_CATEGORIES.items():
        parent = db.query(models.Category).filter(
            models.Category.name == parent_name, models.Category.parent_id.is_(None)
        ).first()
        if parent is None:
            parent = models.Category(name=parent_name, type="expense", is_default=True)
            db.add(parent)
            db.flush()
            changed = True
        existing = {c.name for c in db.query(models.Category).filter(models.Category.parent_id == parent.id).all()}
        for ch in children:
            if ch not in existing:
                db.add(models.Category(name=ch, type="expense", parent_id=parent.id, is_default=True))
                changed = True
    if changed:
        db.commit()


def backfill_category_colors(db: Session) -> None:
    """색이 비어있는 카테고리에 기본 색을 채운다 (소분류는 대분류 색 상속).

    스키마 변경이 아니라 데이터 채우기 — 이미 있는 카테고리에도 적용. null인 것만 갱신해 멱등.
    """
    cats = db.query(models.Category).all()
    by_id = {c.id: c for c in cats}
    changed = False
    for c in cats:
        if c.color:
            continue
        if c.type == "income":
            c.color = INCOME_COLOR
            changed = True
            continue
        # 최상위 대분류를 거슬러 올라가 그 색을 사용
        top = c
        while top.parent_id is not None and top.parent_id in by_id:
            top = by_id[top.parent_id]
        color = CATEGORY_COLORS.get(top.name)
        if color:
            c.color = color
            changed = True
    if changed:
        db.commit()
