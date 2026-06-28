"""FastAPI 앱: 시작 시 테이블 생성 + 거래 CRUD API"""
from contextlib import asynccontextmanager
from datetime import date as date_type

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete
from sqlalchemy.orm import Session

from . import models, schemas
from .database import SessionLocal, get_db
from .seed import backfill_category_colors, seed_defaults


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 스키마는 Alembic이 관리한다 (컨테이너 시작 시 `alembic upgrade head`가 먼저 실행됨).
    # 여기서는 기본 카테고리·결제수단 시딩만 (비어있을 때만).
    db = SessionLocal()
    try:
        seed_defaults(db)
        backfill_category_colors(db)  # 카테고리 색 채우기 (없는 것만)
    finally:
        db.close()
    yield


app = FastAPI(title="가계부 API", lifespan=lifespan)

# 프론트엔드(localhost:5173)에서 API 호출 허용 (개발용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    """헬스체크: 서버 살아있나 확인용"""
    return {"status": "ok"}


@app.get("/categories", response_model=list[schemas.CategoryRead])
def list_categories(db: Session = Depends(get_db)):
    """카테고리 목록 (드롭다운용)"""
    return db.query(models.Category).order_by(models.Category.id).all()


@app.get("/payment-methods", response_model=list[schemas.PaymentMethodRead])
def list_payment_methods(db: Session = Depends(get_db)):
    """결제수단 목록 (드롭다운용)"""
    return db.query(models.PaymentMethod).order_by(models.PaymentMethod.id).all()


@app.get("/tags", response_model=list[schemas.TagRead])
def list_tags(db: Session = Depends(get_db)):
    """태그 목록 (자동완성용)"""
    return db.query(models.Tag).order_by(models.Tag.name).all()


@app.delete("/tags/{tag_id}", status_code=204)
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    """태그 완전 삭제 (모든 거래 연결 제거 후 태그 삭제)"""
    tag = db.get(models.Tag, tag_id)
    if tag is None:
        raise HTTPException(status_code=404, detail="태그를 찾을 수 없음")
    # 다대다 연결(transaction_tags) 먼저 제거 (FK 위반 방지)
    db.execute(delete(models.transaction_tags).where(models.transaction_tags.c.tag_id == tag_id))
    db.delete(tag)
    db.commit()


@app.get("/saved-filters", response_model=list[schemas.SavedFilterRead])
def list_saved_filters(db: Session = Depends(get_db)):
    """필터 즐겨찾기 목록"""
    return db.query(models.SavedFilter).order_by(models.SavedFilter.id).all()


@app.post("/saved-filters", response_model=schemas.SavedFilterRead, status_code=201)
def create_saved_filter(payload: schemas.SavedFilterCreate, db: Session = Depends(get_db)):
    """현재 필터 조합을 즐겨찾기로 저장"""
    sf = models.SavedFilter(name=payload.name, payload=payload.payload.model_dump())
    db.add(sf)
    db.commit()
    db.refresh(sf)
    return sf


@app.delete("/saved-filters/{sf_id}", status_code=204)
def delete_saved_filter(sf_id: int, db: Session = Depends(get_db)):
    """즐겨찾기 삭제"""
    sf = db.get(models.SavedFilter, sf_id)
    if sf is None:
        raise HTTPException(status_code=404, detail="즐겨찾기를 찾을 수 없음")
    db.delete(sf)
    db.commit()


def _attach_tags(tx: models.Transaction, tag_names: list[str], db: Session) -> None:
    """태그 이름 목록을 거래에 연결한다. 없는 태그는 새로 만든다(get-or-create)."""
    for raw in tag_names:
        name = raw.strip()
        if not name:
            continue
        tag = db.query(models.Tag).filter(models.Tag.name == name).first()
        if tag is None:
            tag = models.Tag(name=name)
            db.add(tag)
        tx.tags.append(tag)


@app.post("/transactions", response_model=schemas.TransactionRead, status_code=201)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    """거래 추가"""
    data = payload.model_dump()
    tag_names = data.pop("tags", [])
    tx = models.Transaction(**data)
    _attach_tags(tx, tag_names, db)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@app.get("/transactions", response_model=list[schemas.TransactionRead])
def list_transactions(
    category_ids: list[int] = Query(default=[]),
    payment_method_ids: list[int] = Query(default=[]),
    tags: list[str] = Query(default=[]),
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    db: Session = Depends(get_db),
):
    """거래 목록 (최신순). 주어진 필터를 모두 AND로 적용. 각 필터 내 여러 값은 OR(IN)."""
    q = db.query(models.Transaction)
    if category_ids:
        q = q.filter(models.Transaction.category_id.in_(category_ids))
    if payment_method_ids:
        q = q.filter(models.Transaction.payment_method_id.in_(payment_method_ids))
    if tags:
        # 선택한 태그 중 하나라도 달린 거래 (EXISTS 서브쿼리 → 중복행 없음)
        q = q.filter(models.Transaction.tags.any(models.Tag.name.in_(tags)))
    if date_from is not None:
        q = q.filter(models.Transaction.date >= date_from)
    if date_to is not None:
        q = q.filter(models.Transaction.date <= date_to)
    return q.order_by(
        models.Transaction.date.desc(), models.Transaction.id.desc()
    ).all()


@app.get("/transactions/{tx_id}", response_model=schemas.TransactionRead)
def get_transaction(tx_id: int, db: Session = Depends(get_db)):
    """거래 단건 조회"""
    tx = db.get(models.Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="거래를 찾을 수 없음")
    return tx


@app.put("/transactions/{tx_id}", response_model=schemas.TransactionRead)
def update_transaction(
    tx_id: int, payload: schemas.TransactionUpdate, db: Session = Depends(get_db)
):
    """거래 수정 (보낸 필드만 변경)"""
    tx = db.get(models.Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="거래를 찾을 수 없음")
    data = payload.model_dump(exclude_unset=True)
    tag_names = data.pop("tags", None)
    for field, value in data.items():
        setattr(tx, field, value)
    if tag_names is not None:
        # 태그가 오면 기존 연결을 비우고 새로 부착 (통째 교체)
        tx.tags.clear()
        _attach_tags(tx, tag_names, db)
    db.commit()
    db.refresh(tx)
    return tx


@app.delete("/transactions/{tx_id}", status_code=204)
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    """거래 삭제"""
    tx = db.get(models.Transaction, tx_id)
    if tx is None:
        raise HTTPException(status_code=404, detail="거래를 찾을 수 없음")
    db.delete(tx)
    db.commit()
