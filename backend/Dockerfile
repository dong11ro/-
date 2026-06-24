# 백엔드(FastAPI) 컨테이너를 굽는 레시피
# (주의: Dockerfile은 명령어와 같은 줄에 # 주석을 못 붙인다. 반드시 줄을 분리할 것)

# 기반: 파이썬 3.12 깔린 최소 리눅스
FROM python:3.12-slim

# 컨테이너 안 작업 폴더
WORKDIR /app

# 의존성 먼저 복사·설치 (requirements가 안 바뀌면 이 레이어는 캐시 재사용 → 빌드 빨라짐)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스코드 복사
COPY ./app ./app

# 컨테이너가 켜질 때 실행할 명령: uvicorn으로 FastAPI 서버 기동
#   --host 0.0.0.0 : 컨테이너 바깥에서도 접속 허용
#   --reload       : 코드 고치면 자동 재시작 (개발 편의)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
