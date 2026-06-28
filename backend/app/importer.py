"""파일 가져오기 파싱. 경로별로 raw 획득 방법만 다르고, 정규화는 공통(명세 4장)."""
import csv
import io


def _to_num(v) -> float:
    """셀 값(숫자/문자) → float. 콤마 제거, 실패 시 0."""
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def _to_date(s) -> str:
    """'2026.03.28 21:39:56' / '2026/03/28' → 'YYYY-MM-DD' (시간 제거)."""
    s = str(s).strip().split(" ")[0].split("T")[0]
    s = s.replace(".", "-").replace("/", "-")
    parts = [p for p in s.split("-") if p]
    if len(parts) == 3:
        y, m, d = parts
        try:
            return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
        except ValueError:
            return s
    return s


def read_grid(filename: str, content: bytes) -> list[list]:
    """파일을 행×열 격자(list of list)로 읽는다. 확장자로 .xls/.xlsx/.csv 구분."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else "csv"
    if ext == "xls":
        import xlrd
        wb = xlrd.open_workbook(file_contents=content)
        sh = wb.sheet_by_index(0)
        return [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    if ext == "xlsx":
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        sh = wb.active
        return [[("" if v is None else v) for v in row] for row in sh.iter_rows(values_only=True)]
    # csv
    text = content.decode("utf-8-sig", errors="replace")
    return [row for row in csv.reader(io.StringIO(text))]


def parse_simple(grid: list[list]) -> list[dict]:
    """단순 형식: 헤더 date/amount/merchant/memo, 금액 부호로 수입·지출."""
    if not grid:
        return []
    header = [str(h).strip() for h in grid[0]]
    if "amount" not in header:
        return []
    di = header.index("date") if "date" in header else None
    ai = header.index("amount")
    mi = header.index("merchant") if "merchant" in header else None
    oi = header.index("memo") if "memo" in header else None
    out = []
    for row in grid[1:]:
        if ai >= len(row) or str(row[ai]).strip() == "":
            continue
        amt = _to_num(row[ai])
        out.append({
            "date": _to_date(row[di]) if di is not None else "",
            "type": "expense" if amt < 0 else "income",
            "amount": abs(amt),
            "merchant": (str(row[mi]).strip() if mi is not None else "") or None,
            "memo": (str(row[oi]).strip() if oi is not None else "") or None,
        })
    return out


def parse_kb(grid: list[list]) -> list[dict]:
    """KB국민은행 거래내역: 안내 행 스킵 → '거래일시' 헤더 후 데이터.

    열: 거래일시(0) 적요(1) 보낸분/받는분(2) 송금메모(3) 출금액(4) 입금액(5) ...
    """
    header_idx = next((i for i, r in enumerate(grid) if r and str(r[0]).strip() == "거래일시"), None)
    if header_idx is None:
        return []
    out = []
    for row in grid[header_idx + 1:]:
        if not row or str(row[0]).strip() == "":
            continue
        out_amt = _to_num(row[4]) if len(row) > 4 else 0
        in_amt = _to_num(row[5]) if len(row) > 5 else 0
        if out_amt > 0:
            t, amt = "expense", out_amt
        elif in_amt > 0:
            t, amt = "income", in_amt
        else:
            continue
        merchant = (str(row[2]).strip() if len(row) > 2 else "") or None
        memo = (str(row[1]).strip() if len(row) > 1 else "") or None  # 적요(체크카드/오픈뱅킹 등)
        out.append({"date": _to_date(row[0]), "type": t, "amount": amt, "merchant": merchant, "memo": memo})
    return out


PARSERS = {"simple": parse_simple, "kb": parse_kb}


def parse(filename: str, content: bytes, source: str) -> list[dict]:
    """source(양식)에 맞는 파서로 거래 후보 생성."""
    parser = PARSERS.get(source, parse_simple)
    return parser(read_grid(filename, content))
