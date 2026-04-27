import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import * as d3Color from "d3-interpolate";
import type { MaterialityBreakdown } from "../types";

interface MatrixChartProps {
  breakdowns: MaterialityBreakdown[];
  onTopicClick?: (topic: string) => void;
}

const TOPIC_COLORS: Record<string, string> = {
  Environment: "#22c55e",
  Social: "#06b6d4",
  Governance: "#8b5cf6",
};

const LOW_COLOR = "#cbd5d1";

function dotColor(topic: string, financial: number, impact: number): string {
  const intensity = Math.min(1, (financial + impact) / 200);
  return d3Color.interpolateRgb(LOW_COLOR, TOPIC_COLORS[topic] || "#888")(intensity);
}

interface TooltipState {
  x: number;
  y: number;
  d: MaterialityBreakdown;
}

export default function MatrixChart({ breakdowns, onTopicClick }: MatrixChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // One axis per DR — each axis has its own max (the DR's max possible score = 100)
  // We plot two overlapping spiders: financial scores + impact scores
  const axes = useMemo(() =>
    breakdowns.map((b) => ({ label: b.disclosure_requirement, breakdown: b })),
    [breakdowns],
  );

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    if (!svgRef.current || axes.length === 0) return;

    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement;
    if (!container) return;

    const size = Math.min(container.clientWidth, 680);
    const margin = 80;
    const radius = size / 2 - margin;
    const cx = size / 2;
    const cy = size / 2;

    svg.attr("viewBox", `0 0 ${size} ${size}`).attr("width", size).attr("height", size);

    const n = axes.length;
    const angleSlice = (Math.PI * 2) / n;
    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    g.append("circle")
      .attr("r", radius)
      .attr("fill", "#e8efec")
      .attr("fill-opacity", 0.45);

    // Circular grid rings
    const levels = 4;
    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (radius / levels) * lvl;
      g.append("circle")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "var(--rule-2)")
        .attr("stroke-dasharray", "3,3")
        .attr("stroke-opacity", 0.6);
      if (lvl < levels) {
        g.append("text")
          .attr("x", 4).attr("y", -r + 3)
          .attr("fill", "var(--ink-4)").attr("font-size", "9px")
          .text(`${(100 / levels) * lvl}`);
      }
    }

    // Axis lines
    axes.forEach((_, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x2 = Math.cos(angle) * radius;
      const y2 = Math.sin(angle) * radius;
      g.append("line")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", x2).attr("y2", y2)
        .attr("stroke", "var(--rule)").attr("stroke-opacity", 0.5);
    });

    // Axis labels
    axes.forEach(({ label, breakdown }, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const labelR = radius + 22;
      const lx = Math.cos(angle) * labelR;
      const ly = Math.sin(angle) * labelR;
      const color = TOPIC_COLORS[breakdown.topic] || "#888";
      g.append("text")
        .attr("x", lx).attr("y", ly)
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", color).attr("font-size", "9px").attr("font-weight", "700")
        .text(label);
    });

    // Polygon builder
    function buildPolygon(getValue: (b: MaterialityBreakdown) => number): string {
      return axes.map(({ breakdown }, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = rScale(getValue(breakdown));
        return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
      }).join(" ");
    }

    // Financial polygon
    g.append("polygon")
      .attr("points", buildPolygon((b) => b.financial_materiality_score))
      .attr("fill", "#e5a24a").attr("fill-opacity", 0.12)
      .attr("stroke", "#e5a24a").attr("stroke-width", 1.8).attr("stroke-opacity", 0.7);

    // Impact polygon
    g.append("polygon")
      .attr("points", buildPolygon((b) => b.impact_materiality_score))
      .attr("fill", "#0f6e56").attr("fill-opacity", 0.10)
      .attr("stroke", "#0f6e56").attr("stroke-width", 1.8).attr("stroke-opacity", 0.7);

    // Dots for each DR — financial
    axes.forEach(({ breakdown }, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const rf = rScale(breakdown.financial_materiality_score);
      const ri = rScale(breakdown.impact_materiality_score);
      const color = dotColor(breakdown.topic, breakdown.financial_materiality_score, breakdown.impact_materiality_score);

      // Financial dot
      g.append("circle")
        .attr("cx", Math.cos(angle) * rf).attr("cy", Math.sin(angle) * rf)
        .attr("r", 5).attr("fill", "#e5a24a").attr("fill-opacity", 0.85)
        .attr("stroke", "#fff").attr("stroke-width", 1).attr("cursor", "pointer")
        .on("mouseover", (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, d: breakdown });
        })
        .on("mousemove", (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect();
          setTooltip((t) => t ? { ...t, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
        })
        .on("mouseout", () => setTooltip(null))
        .on("click", () => onTopicClick?.(breakdown.topic));

      // Impact dot
      g.append("circle")
        .attr("cx", Math.cos(angle) * ri).attr("cy", Math.sin(angle) * ri)
        .attr("r", 5).attr("fill", color).attr("fill-opacity", 0.85)
        .attr("stroke", "#fff").attr("stroke-width", 1).attr("cursor", "pointer")
        .on("mouseover", (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect();
          setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, d: breakdown });
        })
        .on("mousemove", (event: MouseEvent) => {
          const rect = wrapRef.current!.getBoundingClientRect();
          setTooltip((t) => t ? { ...t, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
        })
        .on("mouseout", () => setTooltip(null))
        .on("click", () => onTopicClick?.(breakdown.topic));
    });

  }, [axes, onTopicClick]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  // Smart tooltip positioning — keep 16px away from cursor, flip if near edge
  const tipStyle = useMemo(() => {
    if (!tooltip || !wrapRef.current) return {};
    const GAP = 15;
    const TW = 260;
    const TH = 110;
    const wrap = wrapRef.current.getBoundingClientRect();
    let left = tooltip.x + GAP + 25;
    let top = tooltip.y - TH / 2;
    if (left + TW > wrap.width) left = tooltip.x - TW - GAP;
    if (top < 0) top = GAP;
    if (top + TH > wrap.height) top = wrap.height - TH - GAP;
    return { left, top };
  }, [tooltip]);

  return (
    <div ref={wrapRef} className="dm-matrix-wrap" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg ref={svgRef} />

      <div className="dm-legend" style={{ marginTop: 12 }}>
        {Object.entries(TOPIC_COLORS).map(([label, color]) => (
          <span key={label} className="dm-legend-item">
            <span className="dm-legend-dot" style={{ background: color }} />{label}
          </span>
        ))}
        <span className="dm-legend-sep" />
        <span className="dm-legend-item"><span className="dm-legend-dot" style={{ background: "#e5a24a" }} />Financial score</span>
        <span className="dm-legend-item"><span className="dm-legend-dot" style={{ background: "#0f6e56" }} />Impact score</span>
      </div>

      {tooltip && (
        <div className="dm-tip dm-tip-float" style={{ position: "absolute", pointerEvents: "none", zIndex: 50, width: 260, ...tipStyle }}>
          <div className="dm-tip-head">
            <span className="dm-tip-pillar" style={{
              background: TOPIC_COLORS[tooltip.d.topic] || "#888",
              color: "#fff",
              borderColor: TOPIC_COLORS[tooltip.d.topic] || "#888",
            }}>
              {tooltip.d.disclosure_requirement}
            </span>
          </div>
          <div className="dm-tip-meta">{tooltip.d.topic} · {tooltip.d.sub_topic}</div>
          <div className="dm-tip-scores">
            <div className="dm-tip-score">
              <span className="dm-tip-score-label">Financial</span>
              <span className="dm-tip-score-bar"><span className="dm-tip-score-fill" style={{ width: `${tooltip.d.financial_materiality_score}%`, background: "#e5a24a" }} /></span>
              <span className="dm-tip-score-val">{tooltip.d.financial_materiality_score.toFixed(1)}</span>
            </div>
            <div className="dm-tip-score">
              <span className="dm-tip-score-label">Impact</span>
              <span className="dm-tip-score-bar"><span className="dm-tip-score-fill" style={{ width: `${tooltip.d.impact_materiality_score}%`, background: TOPIC_COLORS[tooltip.d.topic] || "#888" }} /></span>
              <span className="dm-tip-score-val">{tooltip.d.impact_materiality_score.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
