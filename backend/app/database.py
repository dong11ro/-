"""DB 연결 설정: 엔진 · 세션 · Base(모델의 공통 부모)"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 접속 주소는 환경변수로 주입받는다 (docker-compose.yml에서 설정).
# 'db'는 IP가 아니라 DB 컨테이너의 이름 — 같은 도커 네트워크라 이름으로 통신 가능.
DATABASE_URL = os.environ["DATABASE_URL"]

# 엔진: 실제 DB와 통하는 통로
engine = create_engine(DATABASE_URL)

# 세션: 요청 한 건 동안 DB와 대화하는 단위
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base: 모든 테이블 모델이 상속하는 부모 (이걸 상속하면 SQLAlchemy가 테이블로 인식)
Base = declarative_base()


def get_db():
    """요청마다 세션을 열고, 끝나면 닫아주는 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
