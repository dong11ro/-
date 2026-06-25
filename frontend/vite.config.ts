import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",       // 컨테이너 바깥(브라우저)에서 접속 허용
    port: 5173,
    watch: { usePolling: true },  // 도커 볼륨 마운트에서 파일 변경 감지 (hot reload)
  },
});
