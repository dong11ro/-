# 프론트엔드(React+Vite) 개발용 컨테이너
FROM node:22-slim

WORKDIR /app

# 의존성 먼저 설치 (package.json 안 바뀌면 캐시 재사용)
COPY package.json ./
RUN npm install

# 소스 복사
COPY . .

# Vite 개발 서버 기동 (--host: 컨테이너 바깥에서 접속 허용)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
