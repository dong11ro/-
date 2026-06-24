"""DB 테이블 정의 (명세서 6장 데이터 구조). 클래스 1개 = 테이블 1개."""
from sqlalchemy import (
    Boolean, Column, Date, ForeignKey, Integer, Numeric, String, Table
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .database import Base

# 거래 ↔ 태그 다대다 연결 테이블 (transaction_tags)
transaction_tags = Table(
    "transaction_tags",
    Base.metadata,
    Column("transaction_id", ForeignKey("transactions.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)


class Category(Base):
    """카테고리 (대분류>소분류 계층 — parent_id로 자기참조)"""
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)              # income / expense
    color = Column(String)                             # 카테고리별 색상
    parent_id = Column(Integer, ForeignKey("categories.id"))  # 대분류면 NULL
    is_default = Column(Boolean, default=False)        # 기본 제공 여부


class PaymentMethod(Base):
    """결제수단 (현금/카드/계좌 등)"""
    __tablename__ = "payment_methods"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False)
    type = Column(String)


class Tag(Base):
    """자유 태그 (데이트, 여행 등 카테고리와 독립된 횡단 분류축)"""
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False)


class Transaction(Base):
    """거래 (수입/지출). 가계부의 핵심 테이블."""
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    date = Column(Date, nullable=False)
    type = Column(String, nullable=False)              # income / expense
    amount = Column(Numeric(14, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"))
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"))
    raw_merchant = Column(String)                      # CSV 원본 가맹점명 (추적성)
    alias = Column(String)                             # 정리된 이름 (예: 스타벅스)
    memo = Column(String)
    source = Column(String, default="manual")          # manual/csv/template/ocr
    external_ref = Column(String)                      # 중복감지용

    tags = relationship("Tag", secondary=transaction_tags)


class MerchantRule(Base):
    """가맹점명 키워드 → 카테고리/별칭 자동 분류 규칙"""
    __tablename__ = "merchant_rules"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    keyword = Column(String, nullable=False)           # 매칭 키워드
    category_id = Column(Integer, ForeignKey("categories.id"))
    alias = Column(String)
    priority = Column(Integer, default=0)              # 우선순위


class Budget(Base):
    """예산 (추상화: 카테고리/태그/전체 어느 축으로든 설정 가능)"""
    __tablename__ = "budgets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    period = Column(String, nullable=False)            # 월 (예: 2026-08)
    limit_amount = Column(Numeric(14, 2), nullable=False)
    scope_type = Column(String, nullable=False)        # category / tag / total
    scope_ref = Column(Integer)                        # 대상 id (total이면 NULL)


class RecurringTemplate(Base):
    """고정 지출 템플릿 (월세/구독료 등 — 원클릭 수동 입력용)"""
    __tablename__ = "recurring_templates"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False)
    amount = Column(Numeric(14, 2))
    category_id = Column(Integer, ForeignKey("categories.id"))
    payment_method_id = Column(Integer, ForeignKey("payment_methods.id"))
    is_active = Column(Boolean, default=True)


class ImportPreset(Base):
    """CSV 가져오기 열 매핑 프리셋 (은행/카드사별 재사용)"""
    __tablename__ = "import_presets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, default=1)
    source_name = Column(String, nullable=False)       # 카드사/은행명
    column_mapping = Column(JSONB)                      # 어느 열이 날짜/금액/가맹점인지
