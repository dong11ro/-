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

INCOME_CATEGORIES = ["급여", "용돈", "이자·투자수익", "환급", "기타수입"]

PAYMENT_METHODS = ["현금", "체크카드", "신용카드", "계좌이체", "간편결제"]


def seed_defaults(db: Session) -> None:
    """카테고리·결제수단이 하나도 없으면 기본값을 넣는다."""
    if db.query(models.Category).count() == 0:
        for parent_name, children in EXPENSE_CATEGORIES.items():
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
