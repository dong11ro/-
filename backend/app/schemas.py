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
    is_fixed: bool = False
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
    is_fixed: Optional[bool] = None
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


class FilterPayload(BaseModel):
    """필터 조합 (즐겨찾기로 저장되는 내용)"""
    category_ids: list[int] = []
    payment_method_ids: list[int] = []
    tags: list[str] = []
    period: str = "전체"


class SavedFilterCreate(BaseModel):
    """즐겨찾기 저장 요청"""
    name: str
    payload: FilterPayload


class SavedFilterRead(BaseModel):
    """즐겨찾기 응답"""
    id: int
    name: str
    payload: FilterPayload

    model_config = {"from_attributes": True}


class MerchantRuleCreate(BaseModel):
    """가맹점 자동분류 규칙 생성"""
    keyword: str
    category_id: int
    alias: Optional[str] = None
    priority: int = 0
    is_fixed: bool = False


class MerchantRuleRead(BaseModel):
    """가맹점 규칙 응답"""
    id: int
    keyword: str
    category_id: int
    alias: Optional[str]
    priority: int
    is_fixed: Optional[bool] = False

    model_config = {"from_attributes": True}


class ImportCandidate(BaseModel):
    """파싱된 거래 후보 (커밋용; 미리보기는 분류 결과를 더해 dict로 반환)"""
    date: date_type
    type: Literal["income", "expense"]
    amount: Decimal
    merchant: Optional[str] = None       # 원본 가맹점명(raw)
    alias: Optional[str] = None          # 정리된 이름
    memo: Optional[str] = None
    category_id: Optional[int] = None
    is_fixed: bool = False
    save_rule: bool = False              # 체크 시 이 분류를 규칙으로 저장


class ImportCommit(BaseModel):
    """확인 후 일괄 저장 요청"""
    items: list[ImportCandidate]


class RecurringTemplateCreate(BaseModel):
    """고정 지출 템플릿 생성/수정"""
    name: str
    amount: Optional[Decimal] = None
    category_id: Optional[int] = None
    payment_method_id: Optional[int] = None
    is_active: bool = True


class RecurringTemplateRead(BaseModel):
    """고정 지출 템플릿 응답"""
    id: int
    name: str
    amount: Optional[Decimal]
    category_id: Optional[int]
    payment_method_id: Optional[int]
    is_active: bool

    model_config = {"from_attributes": True}


class TemplateAdd(BaseModel):
    """템플릿 → 오늘 거래 추가 (금액/날짜 그 자리서 조정)"""
    date: Optional[date_type] = None
    amount: Optional[Decimal] = None


class BudgetSet(BaseModel):
    """기본 월예산 설정 (null이면 해제)"""
    amount: Optional[Decimal] = None


class MonthBudgetSet(BaseModel):
    """특정 달 예산 덮어쓰기"""
    month: str
    amount: Optional[Decimal] = None


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
    is_fixed: Optional[bool] = False
    tags: list[str] = []

    model_config = {"from_attributes": True}

    @field_validator("tags", mode="before")
    @classmethod
    def _tag_names(cls, v):
        # ORM의 Tag 객체 리스트를 이름 문자열 리스트로 변환
        return [t.name if hasattr(t, "name") else t for t in v]   # ORM 객체 → 스키마 자동 변환 허용
