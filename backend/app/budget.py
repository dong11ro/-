"""예산 현황 집계. 총예산(독립) + 대분류별 예산, 이번 달 소비 대비 사용액·색상."""
import calendar
from collections import defaultdict
from datetime import date

from sqlalchemy.orm import Session

from . import kinds, models

DEFAULT_PERIOD = "*"  # 매달 반복되는 기본 예산 (Budget.period가 NOT NULL이라 센티넬 사용)


def _bounds(month: str) -> tuple[date, date]:
    y, m = int(month[:4]), int(month[5:7])
    first = date(y, m, 1)
    nxt = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    return first, nxt


def _status(spent: float, budget: float | None) -> str | None:
    """여유(ok)/임박(near, 80%↑)/초과(over, 100%↑)."""
    if budget is None or budget <= 0:
        return None
    r = spent / budget
    return "over" if r > 1 else "near" if r >= 0.8 else "ok"


def get_status(db: Session, month: str | None) -> dict:
    if not month:
        month = date.today().strftime("%Y-%m")
    first, nxt = _bounds(month)

    # 예산 조회: (scope_type, scope_ref, period) → 금액
    bk: dict[tuple, float] = {}
    for r in db.query(models.Budget).all():
        bk[(r.scope_type, r.scope_ref, r.period)] = float(r.limit_amount)

    def effective(scope_type: str, ref, m: str) -> float | None:
        ov = bk.get((scope_type, ref, m))
        return ov if ov is not None else bk.get((scope_type, ref, DEFAULT_PERIOD))

    # 카테고리 트리
    cats = db.query(models.Category).all()
    by_id = {c.id: c for c in cats}

    def top_of(cid):
        c = by_id.get(cid)
        while c is not None and c.parent_id in by_id:
            c = by_id[c.parent_id]
        return c

    # 이번 달 소비 지출을 대분류별 집계 (비소비 제외, 고정 포함)
    txs = db.query(models.Transaction).filter(
        models.Transaction.date >= first, models.Transaction.date < nxt,
        models.Transaction.type == "expense",
    ).all()
    spent_by_top: dict[int, float] = defaultdict(float)
    uncategorized = 0.0
    total_spent = 0.0
    for t in txs:
        top = top_of(t.category_id) if t.category_id else None
        if top is not None and kinds.kind_of(top.name) != "consumption":
            continue  # 저축/투자/이체 제외
        amt = float(t.amount)
        total_spent += amt
        if top is None:
            uncategorized += amt
        else:
            spent_by_top[top.id] += amt

    # 소비 대분류 목록 (8개)
    top_cats = [c for c in cats if c.parent_id is None and kinds.kind_of(c.name) == "consumption"]
    categories = []
    for c in top_cats:
        b = effective("category", c.id, month)
        s = spent_by_top.get(c.id, 0.0)
        categories.append({
            "id": c.id, "name": c.name, "color": c.color,
            "budget": round(b) if b is not None else None,
            "spent": round(s),
            "status": _status(s, b),
            "is_override": ("category", c.id, month) in bk,
        })
    categories.sort(key=lambda x: -x["spent"])

    # 총예산
    tb = effective("total", None, month)
    today = date.today()
    if (today.year, today.month) == (int(month[:4]), int(month[5:7])):
        days_left = calendar.monthrange(today.year, today.month)[1] - today.day + 1
    else:
        days_left = 0
    remaining = (tb - total_spent) if tb is not None else None
    daily = round(remaining / days_left) if (remaining is not None and days_left > 0 and remaining > 0) else None

    return {
        "month": month,
        "total": {
            "budget": round(tb) if tb is not None else None,
            "spent": round(total_spent),
            "remaining": round(remaining) if remaining is not None else None,
            "days_left": days_left,
            "daily_suggest": daily,
            "status": _status(total_spent, tb),
            "is_override": ("total", None, month) in bk,
        },
        "categories": categories,
        "uncategorized": round(uncategorized),
    }


def set_budget(db: Session, scope_type: str, scope_ref, period: str, amount) -> None:
    """예산 upsert/삭제. amount None이면 삭제 (그 달 override 해제 → 기본값 사용)."""
    q = db.query(models.Budget).filter(
        models.Budget.scope_type == scope_type,
        models.Budget.scope_ref.is_(None) if scope_ref is None else models.Budget.scope_ref == scope_ref,
        models.Budget.period == period,
    )
    row = q.first()
    if amount is None:
        if row:
            db.delete(row)
    elif row:
        row.limit_amount = amount
    else:
        db.add(models.Budget(scope_type=scope_type, scope_ref=scope_ref, period=period, limit_amount=amount))
    db.commit()
