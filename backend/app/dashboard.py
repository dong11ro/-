"""대시보드 집계 로직 (거래를 SUM·GROUP BY로 요약). 순수 계산 함수 모음."""
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models


def month_bounds(month: str | None) -> tuple[date, date]:
    """'YYYY-MM'(없으면 이번 달) → (그 달 1일, 다음 달 1일). 범위 필터용."""
    if month:
        y, m = map(int, month.split("-"))
    else:
        today = date.today()
        y, m = today.year, today.month
    first = date(y, m, 1)
    nxt = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    return first, nxt


def _prev_month(month: str | None) -> str:
    first, _ = month_bounds(month)
    pm = first.month - 1 or 12
    py = first.year - 1 if first.month == 1 else first.year
    return f"{py:04d}-{pm:02d}"


def summary(db: Session, month: str | None) -> dict:
    """이번 달 총수입·총지출·잔액·건수."""
    first, nxt = month_bounds(month)
    rows = (
        db.query(models.Transaction.type, func.sum(models.Transaction.amount), func.count())
        .filter(models.Transaction.date >= first, models.Transaction.date < nxt)
        .group_by(models.Transaction.type)
        .all()
    )
    income = expense = 0.0
    count = 0
    for t, amt, cnt in rows:
        count += cnt
        if t == "income":
            income = float(amt)
        else:
            expense = float(amt)
    return {"income": income, "expense": expense, "balance": income - expense, "count": count}


def _top_resolver(db: Session):
    """카테고리 id → 최상위 대분류 객체로 거슬러 올라가는 헬퍼."""
    cats = db.query(models.Category).all()
    by_id = {c.id: c for c in cats}

    def resolve(cat_id: int):
        c = by_id.get(cat_id)
        while c is not None and c.parent_id in by_id:
            c = by_id[c.parent_id]
        return c

    return resolve


def _expense_by_top(db: Session, first: date, nxt: date) -> dict[str, dict]:
    """기간 내 지출을 대분류별로 합산 → {대분류명: {color, amount}}."""
    resolve = _top_resolver(db)
    rows = (
        db.query(models.Transaction.category_id, func.sum(models.Transaction.amount))
        .filter(
            models.Transaction.type == "expense",
            models.Transaction.date >= first,
            models.Transaction.date < nxt,
            models.Transaction.category_id.isnot(None),
        )
        .group_by(models.Transaction.category_id)
        .all()
    )
    agg: dict[str, dict] = {}
    for cat_id, amt in rows:
        top = resolve(cat_id)
        if top is None:
            continue
        e = agg.setdefault(top.name, {"name": top.name, "color": top.color, "amount": 0.0})
        e["amount"] += float(amt)
    return agg


def category_ranking(db: Session, month: str | None) -> list[dict]:
    """상위 지출 카테고리(대분류) 랭킹 — 금액·비중."""
    first, nxt = month_bounds(month)
    agg = _expense_by_top(db, first, nxt)
    total = sum(e["amount"] for e in agg.values())
    ranked = sorted(agg.values(), key=lambda e: -e["amount"])
    for e in ranked:
        e["pct"] = round(e["amount"] / total * 100) if total else 0
    return ranked


def top_merchants(db: Session, month: str | None, limit: int = 5) -> list[dict]:
    """자주 가는 가맹점 TOP — 방문 횟수·금액 (지출, 가맹점명 기준)."""
    first, nxt = month_bounds(month)
    name_expr = func.coalesce(models.Transaction.alias, models.Transaction.raw_merchant)
    rows = (
        db.query(name_expr.label("name"), func.count().label("visits"), func.sum(models.Transaction.amount).label("amount"))
        .filter(
            models.Transaction.type == "expense",
            models.Transaction.date >= first,
            models.Transaction.date < nxt,
            name_expr.isnot(None),
        )
        .group_by(name_expr)
        .order_by(func.sum(models.Transaction.amount).desc())
        .limit(limit)
        .all()
    )
    return [{"name": n, "visits": v, "amount": float(a)} for n, v, a in rows]


def comparison(db: Session, month: str | None) -> dict:
    """지난달 대비 증감 — 전체 + 대분류별."""
    first, nxt = month_bounds(month)
    p_first, p_nxt = month_bounds(_prev_month(month))
    this = _expense_by_top(db, first, nxt)
    last = _expense_by_top(db, p_first, p_nxt)

    def change(cur: float, prev: float) -> int | None:
        if prev == 0:
            return None  # 지난달 0이면 비율 계산 불가
        return round((cur - prev) / prev * 100)

    total_this = sum(e["amount"] for e in this.values())
    total_last = sum(e["amount"] for e in last.values())

    names = set(this) | set(last)
    cats = []
    for name in names:
        cur = this.get(name, {}).get("amount", 0.0)
        prev = last.get(name, {}).get("amount", 0.0)
        color = (this.get(name) or last.get(name))["color"]
        cats.append({"name": name, "this": cur, "last": prev, "change_pct": change(cur, prev), "color": color})
    cats.sort(key=lambda c: -c["this"])
    return {
        "this_expense": total_this,
        "last_expense": total_last,
        "change_pct": change(total_this, total_last),
        "categories": cats,
    }
