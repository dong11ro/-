"""FastAPI 앱: 시작 시 테이블 생성 + 거래 CRUD API"""
from contextlib import asynccontextmanager
from datetime import date as date_type

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete
from sqlalchemy.orm import Session

from . import dashboard, importer, models, schemas
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


# ── 대시보드 집계 ──
@app.get("/dashboard/summary")
def dashboard_summary(month: str | None = None, db: Session = Depends(get_db)):
    """이번 달 총수입·총지출·잔액"""
    return dashboard.summary(db, month)


@app.get("/dashboard/category-ranking")
def dashboard_category_ranking(month: str | None = None, db: Session = Depends(get_db)):
    """상위 지출 카테고리 랭킹"""
    return dashboard.category_ranking(db, month)


@app.get("/dashboard/top-merchants")
def dashboard_top_merchants(month: str | None = None, db: Session = Depends(get_db)):
    """자주 가는 가맹점 TOP"""
    return dashboard.top_merchants(db, month)


@app.get("/dashboard/comparison")
def dashboard_comparison(month: str | None = None, db: Session = Depends(get_db)):
    """지난달 대비 증감"""
    return dashboard.comparison(db, month)


# ── 가맹점 자동분류 규칙 ──
@app.get("/merchant-rules", response_model=list[schemas.MerchantRuleRead])
def list_merchant_rules(db: Session = Depends(get_db)):
    """가맹점 규칙 목록 (우선순위순)"""
    return db.query(models.MerchantRule).order_by(
        models.MerchantRule.priority.desc(), models.MerchantRule.id
    ).all()


@app.post("/merchant-rules", response_model=schemas.MerchantRuleRead, status_code=201)
def create_merchant_rule(payload: schemas.MerchantRuleCreate, db: Session = Depends(get_db)):
    """가맹점 규칙 생성"""
    rule = models.MerchantRule(**payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@app.put("/merchant-rules/{rule_id}", response_model=schemas.MerchantRuleRead)
def update_merchant_rule(rule_id: int, payload: schemas.MerchantRuleCreate, db: Session = Depends(get_db)):
    """가맹점 규칙 수정"""
    rule = db.get(models.MerchantRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="규칙을 찾을 수 없음")
    for field, value in payload.model_dump().items():
        setattr(rule, field, value)
    db.commit()
    db.refresh(rule)
    return rule


@app.delete("/merchant-rules/{rule_id}", status_code=204)
def delete_merchant_rule(rule_id: int, db: Session = Depends(get_db)):
    """가맹점 규칙 삭제"""
    rule = db.get(models.MerchantRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=404, detail="규칙을 찾을 수 없음")
    db.delete(rule)
    db.commit()


def _classify(raw: str, rules: list[models.MerchantRule]) -> tuple[int | None, str | None]:
    """가맹점 원문에 키워드가 포함된 규칙을 찾아 (category_id, alias) 반환. 우선순위순."""
    for r in rules:
        if r.keyword and r.keyword in raw:
            return r.category_id, r.alias
    return None, None


# ── 파일 가져오기 ──
@app.post("/import/preview")
async def import_preview(
    file: UploadFile = File(...), source: str = Form("simple"), db: Session = Depends(get_db)
):
    """파일 파싱 + 가맹점 규칙으로 자동분류해 미리보기 반환 (저장 안 함). CSV/xls/xlsx 지원."""
    content = await file.read()
    candidates = importer.parse(file.filename or "", content, source)
    rules = db.query(models.MerchantRule).order_by(models.MerchantRule.priority.desc()).all()
    for c in candidates:
        raw = c.get("merchant") or ""
        cat_id, alias = _classify(raw, rules)
        c["category_id"] = cat_id
        c["alias"] = alias or raw or None   # 규칙 별칭 있으면 그걸로, 없으면 원문
        c["matched"] = cat_id is not None
    return candidates


@app.post("/import/commit", status_code=201)
def import_commit(payload: schemas.ImportCommit, db: Session = Depends(get_db)):
    """확인된 후보들을 거래로 일괄 저장. save_rule이면 분류 규칙도 생성."""
    n = 0
    for it in payload.items:
        db.add(models.Transaction(
            date=it.date,
            type=it.type,
            amount=it.amount,
            raw_merchant=it.merchant or None,
            alias=(it.alias or it.merchant) or None,
            memo=it.memo,
            category_id=it.category_id,
            source="csv",
        ))
        n += 1
        # 규칙 저장(체크 + 별칭 + 카테고리 있을 때). 키워드=별칭(원문에 포함되는 정리된 이름)
        if it.save_rule and it.alias and it.category_id:
            exists = db.query(models.MerchantRule).filter(models.MerchantRule.keyword == it.alias).first()
            if not exists:
                db.add(models.MerchantRule(keyword=it.alias, category_id=it.category_id, alias=it.alias))
    db.commit()
    return {"inserted": n}


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
