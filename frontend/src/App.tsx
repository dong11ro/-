import { useState } from "react";
import Sidebar from "./Sidebar";
import TransactionsView from "./TransactionsView";
import DashboardView from "./DashboardView";
import ImportView from "./ImportView";
import AnalysisView from "./AnalysisView";
import type { View } from "./types";

// 앱 셸: 사이드바 + 선택된 화면
export default function App() {
  const [view, setView] = useState<View>("dashboard");
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Pretendard, -apple-system, sans-serif" }}>
      <Sidebar view={view} onChange={setView} />
      <div style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto", background: "#f1f5f9" }}>
        {view === "dashboard" ? <DashboardView />
          : view === "import" ? <ImportView />
          : view === "analysis" ? <AnalysisView />
          : <TransactionsView />}
      </div>
    </div>
  );
}
