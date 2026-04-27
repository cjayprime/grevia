import { useState, useCallback } from "react";
import type { MaterialityBreakdown, VizTab } from "../../types";
import QuadrantScatter from "../QuadrantScatter";
import MatrixChart from "../MatrixChart";
import BreakdownTable from "../BreakdownTable";

interface Props {
  breakdowns: MaterialityBreakdown[];
  onExport: () => void;
}

export default function DmsVizSection({ breakdowns, onExport }: Props) {
  const [vizTab, setVizTab] = useState<VizTab>("quadrant");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const handleTopicClick = useCallback((topic: string) => {
    setActiveTopic((prev) => (prev === topic ? null : topic));
  }, []);

  return (
    <>
      <div className="sec-head" style={{ marginTop: 32 }}>
        <div className="sec-title">
          <span className="num">01</span>Latest ESRS Visualization
        </div>
      </div>
      <div className="hs-topbar">
        <div className="hs-tabs">
          {(["quadrant", "matrix"] as VizTab[]).map((t) => (
            <button
              key={t}
              className={`chip ${vizTab === t ? "is-active" : ""}`}
              onClick={() => setVizTab(t)}
            >
              {t === "quadrant" ? "4-Quadrant Plot" : "Radar Chart"}
            </button>
          ))}
        </div>

        <div className="sec-actions">
          <button className="hs-btn" onClick={onExport}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export XBRL
          </button>
        </div>
      </div>

      {vizTab === "quadrant" && (
        <QuadrantScatter
          breakdowns={breakdowns}
          onTopicClick={handleTopicClick}
        />
      )}

      {vizTab === "matrix" && (
        <MatrixChart breakdowns={breakdowns} onTopicClick={handleTopicClick} />
      )}

      <BreakdownTable breakdowns={breakdowns} highlight={activeTopic} />
    </>
  );
}
