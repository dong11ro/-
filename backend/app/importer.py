"""CSV 파싱 (C-0: 간단 형식). 모든 입력 경로의 공통 파이프라인 중 'raw 획득→정규화' 부분."""
import csv
import io


def parse_csv(content: bytes) -> list[dict]:
    """CSV 바이트 → 거래 후보 목록.

    기대 컬럼: date, amount, merchant, memo
    - amount 부호로 유형 판단: 음수=지출, 양수=수입 (절댓값 저장)
    - 콤마(1,000) 제거, BOM 처리
    """
    text = content.decode("utf-8-sig")  # 엑셀 저장 CSV의 BOM 대응
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict] = []
    for row in reader:
        raw_amount = (row.get("amount") or "").replace(",", "").strip()
        if not raw_amount:
            continue
        try:
            amt = float(raw_amount)
        except ValueError:
            continue
        out.append({
            "date": (row.get("date") or "").strip(),
            "type": "expense" if amt < 0 else "income",
            "amount": abs(amt),
            "merchant": (row.get("merchant") or "").strip(),
            "memo": (row.get("memo") or "").strip() or None,
        })
    return out
