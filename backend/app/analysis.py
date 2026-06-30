"""분석 화면 집계. (시작월, 끝월) 범위를 버킷(월/분기/연)으로 묶어 월평균을 낸다.
지출 집계는 '소비'만 (저축/투자/이체 같은 비소비는 제외 — 현금흐름은 대시보드에서)."""
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.orm import Session

from . import kinds, models


def month_list(start_ym: str, end_ym: str) -> list[str]:
    """'YYYY-MM' 시작~끝(포함) 사이의 월 목록."""
    sy, sm = map(int, start_ym.split("-"))
    ey, em = map(int, end_ym.split("-"))
    out, y, m = [], sy, sm
    while (y, m) <= (ey, em):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


def _bucket_size(n: int) -> int:
    if n <= 8:
        return 1   # 월
    if n <= 24:
        return 3   # 분기
    return 12      # 연


def _bucket_label(grp: list[str], size: int) -> str:
    fy, fm = grp[0].split("-")
    ly, lm = grp[-1].split("-")
    if size >= 12:
        return f"{fy}년" if fy == ly else f"{fy[2:]}~{ly[2:]}년"
    if len(grp) == 1:
        return f"{int(fm)}월"
    return f"{int(fm)}~{int(lm)}월"


def _range_bounds(start_ym: str, end_ym: str) -> tuple[date, date]:
    sy, sm = map(int, start_ym.split("-"))
    ey, em = map(int, end_ym.split("-"))
    first = date(sy, sm, 1)
    end_excl = date(ey + 1, 1, 1) if em == 12 else date(ey, em + 1, 1)
    return first, end_excl


DEFAULT_PERIOD = "*"  # 기본 월예산은 period='*'로 저장 (Budget.period가 NOT NULL)


def _get_budgets(db: Session) -> tuple[float | None, dict[str, float]]:
    rows = db.query(models.Budget).filter(models.Budget.scope_type == "total").all()
    default = None
    overrides: dict[str, float] = {}
    for r in rows:
        if r.period == DEFAULT_PERIOD:
            default = float(r.limit_amount)
        else:
            overrides[r.period] = float(r.limit_amount)
    return default, overrides


def _top_resolver(db: Session):
    cats = db.query(models.Category).all()
    by_id = {c.id: c for c in cats}

    def resolve(cat_id):
        c = by_id.get(cat_id)
        while c is not None and c.parent_id in by_id:
            c = by_id[c.parent_id]
        return c
    return resolve


def build(db: Session, start_ym: str, end_ym: str, merchant_sort: str = "amount") -> dict:
    months = month_list(start_ym, end_ym)
    size = _bucket_size(len(months))
    buckets = [months[i:i + size] for i in range(0, len(months), size)]
    first, end_excl = _range_bounds(start_ym, end_ym)
    default_budget, overrides = _get_budgets(db)
    resolve = _top_resolver(db)

    txs = db.query(models.Transaction).filter(
        models.Transaction.date >= first, models.Transaction.date < end_excl
    ).all()

    def top_of(t):
        return resolve(t.category_id) if t.category_id else None

    def is_consumption(t) -> bool:
        """소비 지출인가 (저축/투자/이체 같은 비소비는 False)."""
        if t.type != "expense":
            return False
        top = top_of(t)
        return kinds.kind_of(top.name if top else None) == "consumption"

    def is_variable(t) -> bool:
        """변동 소비인가 (고정지출 제외) — 가맹점/요일별 패턴용."""
        return is_consumption(t) and not t.is_fixed

    # 월별 수입 / 소비
    m_inc, m_exp = defaultdict(float), defaultdict(float)
    for t in txs:
        ym = t.date.strftime("%Y-%m")
        if t.type == "income":
            m_inc[ym] += float(t.amount)
        elif is_consumption(t):
            m_exp[ym] += float(t.amount)

    # 추이 막대 (버킷별 월평균)
    trend = []
    for grp in buckets:
        k = len(grp)
        inc = sum(m_inc.get(m, 0) for m in grp) / k
        exp = sum(m_exp.get(m, 0) for m in grp) / k
        budget = None
        if default_budget is not None:
            budget = sum(overrides.get(m, default_budget) for m in grp) / k
        trend.append({
            "label": _bucket_label(grp, size),
            "months": grp,
            "income": round(inc),
            "expense": round(exp),
            "budget": round(budget) if budget is not None else None,
            "over": budget is not None and exp > budget,
        })

    # KPI (소비 기준)
    total_inc = sum(m_inc.values())
    total_exp = sum(m_exp.values())
    n = len(months)
    savings = total_inc - total_exp
    summary = {
        "total_expense": round(total_exp),
        "avg_expense": round(total_exp / n) if n else 0,
        "savings": round(savings),
        "savings_rate": round(savings / total_inc * 100) if total_inc else None,
    }

    # 카테고리 도넛 (소비 지출만)
    cat_agg: dict[str, dict] = {}
    for t in txs:
        if not is_consumption(t):
            continue
        top = top_of(t)
        if top is None:    # 미분류는 도넛에서 제외
            continue
        e = cat_agg.setdefault(top.name, {"name": top.name, "color": top.color, "amount": 0.0})
        e["amount"] += float(t.amount)
    cat_total = sum(e["amount"] for e in cat_agg.values())
    category = sorted(cat_agg.values(), key=lambda e: -e["amount"])
    for e in category:
        e["amount"] = round(e["amount"])
        e["pct"] = round(e["amount"] / cat_total * 100) if cat_total else 0

    # 요일별 소비 (일평균 = 그 요일 합 ÷ 기간 내 그 요일 수)
    wd_names = ["월", "화", "수", "목", "금", "토", "일"]
    wd_sum = defaultdict(float)
    for t in txs:
        if is_variable(t):  # 고정지출 제외
            wd_sum[t.date.weekday()] += float(t.amount)
    wd_count = [0] * 7
    d = first
    while d < end_excl:
        wd_count[d.weekday()] += 1
        d += timedelta(days=1)
    weekday = [{"day": wd_names[i], "amount": round(wd_sum.get(i, 0) / wd_count[i]) if wd_count[i] else 0} for i in range(7)]

    # 가맹점 TOP (소비만)
    mch: dict[str, dict] = {}
    for t in txs:
        if not is_variable(t):   # 고정지출 제외
            continue
        name = t.alias or t.raw_merchant
        if not name:
            continue
        e = mch.setdefault(name, {"name": name, "visits": 0, "amount": 0.0})
        e["visits"] += 1
        e["amount"] += float(t.amount)
    key = "visits" if merchant_sort == "visits" else "amount"
    merchants = sorted(mch.values(), key=lambda e: -e[key])[:5]
    for e in merchants:
        e["amount"] = round(e["amount"])

    return {
        "range": {"start": start_ym, "end": end_ym, "unit": "월" if size == 1 else "분기" if size == 3 else "연"},
        "summary": summary,
        "trend": trend,
        "category": category,
        "weekday": weekday,
        "merchants": merchants,
        "budget": {"default": default_budget, "overrides": overrides},
    }
