"""FastAPI 앱: 시작 시 테이블 생성 + 거래 CRUD API"""
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, engine, get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱이 켜질 때: models.py의 모든 테이블을 DB에 생성 (이미 있으면 건너뜀)
    # ※ 이번 단계 한정. 다음 단계에서 Alembic 마이그레이션으로 교체 예정.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="가계부 API", lifespan=lifespan)


@app.get("/")
def health():
    """헬스체크: 서버 살아있나 확인용"""
    return {"status": "ok"}


@app.post("/transactions", response_model=schemas.TransactionRead, status_code=201)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    """거래 추가"""
    tx = models.Transaction(**payload.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@app.get("/transactions", response_model=list[schemas.TransactionRead])
def list_transactions(db: Session = Depends(get_db)):
    """거래 목록 (최신순)"""
    return (
        db.query(models.Transaction)
        .order_by(models.Transaction.date.desc(), models.Transaction.id.desc())
        .all()
    )


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
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tx, field, value)
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
