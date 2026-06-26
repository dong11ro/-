"""Pydantic 스키마: API 요청/응답의 형태와 검증 규칙 (거래만 우선)"""
from datetime import date as date_type
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator


class TransactionCreate(BaseModel):
    """거래 생성 요청 (클라이언트 → 서버)"""
    date: date_type
    type: Literal["income", "expense"]     # 둘 중 하나만 허용 (검증)
    amount: Decimal
    category_id: Optional[int] = None
    payment_method_id: Optional[int] = None
    raw_merchant: Optional[str] = None
    alias: Optional[str] = None
    memo: Optional[str] = None
    tags: list[str] = []                   # 태그 이름 목록 (없으면 빈 리스트)


class TransactionUpdate(BaseModel):
    """거래 수정 요청 (보낸 필드만 바꿈)"""
    date: Optional[date_type] = None
    type: Optional[Literal["income", "expense"]] = None
    amount: Optional[Decimal] = None
    category_id: Optional[int] = None
    payment_method_id: Optional[int] = None
    raw_merchant: Optional[str] = None
    alias: Optional[str] = None
    memo: Optional[str] = None
    tags: Optional[list[str]] = None       # None이면 태그 안 건드림, 리스트면 통째로 교체


class CategoryRead(BaseModel):
    """카테고리 응답 (드롭다운용)"""
    id: int
    name: str
    type: str
    parent_id: Optional[int]
    color: Optional[str]

    model_config = {"from_attributes": True}


class PaymentMethodRead(BaseModel):
    """결제수단 응답 (드롭다운용)"""
    id: int
    name: str

    model_config = {"from_attributes": True}


class TagRead(BaseModel):
    """태그 응답 (자동완성용)"""
    id: int
    name: str

    model_config = {"from_attributes": True}


class TransactionRead(BaseModel):
    """거래 응답 (서버 → 클라이언트)"""
    id: int
    date: date_type
    type: str
    amount: Decimal
    category_id: Optional[int]
    payment_method_id: Optional[int]
    raw_merchant: Optional[str]
    alias: Optional[str]
    memo: Optional[str]
    source: str
    tags: list[str] = []

    model_config = {"from_attributes": True}

    @field_validator("tags", mode="before")
    @classmethod
    def _tag_names(cls, v):
        # ORM의 Tag 객체 리스트를 이름 문자열 리스트로 변환
        return [t.name if hasattr(t, "name") else t for t in v]   # ORM 객체 → 스키마 자동 변환 허용
