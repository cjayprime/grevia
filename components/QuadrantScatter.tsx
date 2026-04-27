import { useCallback, useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { MaterialityBreakdown } from "../types";

interface QuadrantScatterProps {
  breakdowns: MaterialityBreakdown[];
  onTopicClick?: (topic: string) => void;
}

const TOPIC_COLORS: Record<string, string> = {
  Environment: "#22c55e",
  Social: "#06b6d4",
  Governance: "#8b5cf6",
};

// Neutral low-score colour to interpolate FROM
const LOW_COLOR = "#cbd5d1";

/** Blend from LOW_COLOR toward the topic color based on combined score 0-100 */
function dotColor(topic: string, financial: number, impact: number): string {
  const intensity = Math.min(1, (financial + impact) / 200); // 0 → 1
  const base = TOPIC_COLORS[topic] || "#888";
  return d3.interpolateRgb(LOW_COLOR, base)(intensity);
}

export default function QuadrantScatter({ breakdowns, onTopicClick }: QuadrantScatterProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const margin = useMemo(() => ({ top: 40, right: 60, bottom: 72, left: 76 }), []);

  const draw = useCallback(() => {
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    if (!svgRef.current) return;

    svg.selectAll("*").remove();

    const container = svgRef.current.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = Math.max(500, width * 0.6);
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3.scaleLinear().domain([0, 100]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Quadrant backgrounds
    const quads = [
      { x1: 0, y1: 50, x2: 50, y2: 100, fill: "#0f6e5610", label: "Impact Material" },
      { x1: 50, y1: 50, x2: 100, y2: 100, fill: "#0f6e5622", label: "Dual Materiality" },
      { x1: 0, y1: 0, x2: 50, y2: 50, fill: "#9aa5a00c", label: "Low Materiality" },
      { x1: 50, y1: 0, x2: 100, y2: 50, fill: "#e5a24a14", label: "Financial Material" },
    ];
    for (const q of quads) {
      g.append("rect")
        .attr("x", x(q.x1)).attr("y", y(q.y2))
        .attr("width", x(q.x2) - x(q.x1)).attr("height", y(q.y1) - y(q.y2))
        .attr("fill", q.fill);
      g.append("text")
        .attr("x", x((q.x1 + q.x2) / 2)).attr("y", y((q.y1 + q.y2) / 2))
        .attr("text-anchor", "middle").attr("dominant-baseline", "middle")
        .attr("fill", "var(--ink-4)").attr("font-size", "11px")
        .attr("font-weight", "600").attr("letter-spacing", "0.05em")
        .attr("opacity", 0.55).text(q.label);
    }

    // Midpoint lines
    g.append("line")
      .attr("x1", x(50)).attr("x2", x(50)).attr("y1", 0).attr("y2", innerH)
      .attr("stroke", "var(--rule)").attr("stroke-dasharray", "5,4");
    g.append("line")
      .attr("x1", 0).attr("x2", innerW).attr("y1", y(50)).attr("y2", y(50))
      .attr("stroke", "var(--rule)").attr("stroke-dasharray", "5,4");

    // Axes
    g.append("g").attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-innerH).tickPadding(10))
      .call((sel) => {
        sel.select(".domain").remove();
        sel.selectAll(".tick line").attr("stroke", "var(--rule-2)").attr("stroke-opacity", 0.4);
        sel.selectAll(".tick text").attr("fill", "var(--ink-3)").attr("font-size", "11px");
      });
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickPadding(10))
      .call((sel) => {
        sel.select(".domain").remove();
        sel.selectAll(".tick line").attr("stroke", "var(--rule-2)").attr("stroke-opacity", 0.4);
        sel.selectAll(".tick text").attr("fill", "var(--ink-3)").attr("font-size", "11px");
      });

    // Axis labels
    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 56)
      .attr("text-anchor", "middle").attr("fill", "var(--ink-2)")
      .attr("font-size", "12px").attr("font-weight", "600")
      .text("Financial Materiality Score (0–100)");
    g.append("text")
      .attr("transform", "rotate(-90)").attr("x", -innerH / 2).attr("y", -58)
      .attr("text-anchor", "middle").attr("fill", "var(--ink-2)")
      .attr("font-size", "12px").attr("font-weight", "600")
      .text("Impact Materiality Score (0–100)");

    // One dot per DR, color encodes topic + combined score intensity
    const dots = g.selectAll("g.dr-dot")
      .data(breakdowns)
      .enter()
      .append("g")
      .attr("class", "dr-dot")
      .attr("cursor", "pointer")
      .on("mouseover", (_event, d) => {
        const e = _event as MouseEvent;
        const color = TOPIC_COLORS[d.topic] || "#888";
        const tipW = 268;
        const tipH = 112;
        const GAP = 15;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const tx = e.offsetX + GAP + 25 + tipW > cw ? e.offsetX - tipW - GAP : e.offsetX + GAP + 25;
        const ty = e.offsetY - tipH / 2 < 0 ? GAP : e.offsetY + tipH / 2 > ch ? ch - tipH - GAP : e.offsetY - tipH / 2;
        tooltip
          .style("visibility", "visible")
          .style("opacity", "1")
          .style("transform", `translate(${tx}px,${ty}px)`)
          .html(
            `<div class="dm-tip-head">` +
            `<span class="dm-tip-pillar" style="background:${color};color:#fff;border-color:${color}">${d.disclosure_requirement}</span>` +
            `</div>` +
            `<div class="dm-tip-meta">${d.topic} · ${d.sub_topic}</div>` +
            `<div class="dm-tip-scores">` +
            `<div class="dm-tip-score"><span class="dm-tip-score-label">Financial</span>` +
            `<span class="dm-tip-score-bar"><span class="dm-tip-score-fill" style="width:${d.financial_materiality_score}%;background:#e5a24a"></span></span>` +
            `<span class="dm-tip-score-val">${d.financial_materiality_score.toFixed(1)}</span></div>` +
            `<div class="dm-tip-score"><span class="dm-tip-score-label">Impact</span>` +
            `<span class="dm-tip-score-bar"><span class="dm-tip-score-fill" style="width:${d.impact_materiality_score}%;background:${color}"></span></span>` +
            `<span class="dm-tip-score-val">${d.impact_materiality_score.toFixed(1)}</span></div>` +
            `</div>`,
          );
      })
      .on("mousemove", (_event) => {
        const e = _event as MouseEvent;
        const tipW = 268;
        const tipH = 112;
        const GAP = 15;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const tx = e.offsetX + GAP + 25 + tipW > cw ? e.offsetX - tipW - GAP : e.offsetX + GAP + 25;
        const ty = e.offsetY - tipH / 2 < 0 ? GAP : e.offsetY + tipH / 2 > ch ? ch - tipH - GAP : e.offsetY - tipH / 2;
        tooltip.style("transform", `translate(${tx}px,${ty}px)`);
      })
      .on("mouseout", () => tooltip.style("opacity", "0").style("visibility", "hidden"))
      .on("click", (_event, d) => onTopicClick?.(d.topic));

    dots.append("circle")
      .attr("cx", (d) => x(d.financial_materiality_score))
      .attr("cy", (d) => y(d.impact_materiality_score))
      .attr("r", 7)
      .attr("fill", (d) => dotColor(d.topic, d.financial_materiality_score, d.impact_materiality_score))
      .attr("stroke", (d) => TOPIC_COLORS[d.topic] || "#888")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.5);

    dots.append("text")
      .attr("x", (d) => x(d.financial_materiality_score))
      .attr("y", (d) => y(d.impact_materiality_score) - 11)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => dotColor(d.topic, d.financial_materiality_score, d.impact_materiality_score))
      .attr("font-size", "9px")
      .attr("font-weight", "700")
      .attr("pointer-events", "none")
      .text((d) => d.disclosure_requirement);

  }, [breakdowns, margin, onTopicClick]);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  return (
    <div className="dm-scatter-wrap" style={{ position: "relative" }}>
      <div className="dm-legend">
        {/* Topic legend */}
        {Object.entries(TOPIC_COLORS).map(([label, color]) => (
          <span key={label} className="dm-legend-item">
            <span className="dm-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}

        {/* Intensity legend */}
        <span className="dm-legend-sep" />
        <span className="dm-legend-item">
          <span className="dm-legend-intensity">
            <span style={{ background: LOW_COLOR }} />
            <span style={{ background: "#a0b0ac" }} />
            <span style={{ background: "#22c55e" }} />
          </span>
          Low → High materiality
        </span>
      </div>
      <svg ref={svgRef} style={{ width: "100%", overflow: "visible" }} />
      <div ref={tooltipRef} className="dm-tooltip" />
    </div>
  );
}
