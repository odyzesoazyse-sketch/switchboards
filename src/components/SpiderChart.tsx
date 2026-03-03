import { useMemo } from "react";

interface SpiderChartProps {
  labels: string[];
  dataA: number[]; // 0-10
  dataB: number[]; // 0-10
  nameA: string;
  nameB: string;
  size?: number;
}

export default function SpiderChart({
  labels,
  dataA,
  dataB,
  nameA,
  nameB,
  size = 240,
}: SpiderChartProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const angleStep = (2 * Math.PI) / labels.length;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 10) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const toPath = (data: number[]) =>
    data
      .map((v, i) => {
        const { x, y } = getPoint(i, v);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ") + " Z";

  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid */}
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={labels
              .map((_, i) => {
                const p = getPoint(i, level);
                return `${p.x},${p.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={level === 10 ? 1.5 : 0.5}
            opacity={0.5}
          />
        ))}

        {/* Axes */}
        {labels.map((_, i) => {
          const p = getPoint(i, 10);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={p.x}
              y2={p.y}
              stroke="hsl(var(--border))"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}

        {/* Data A (Red) */}
        <polygon
          points={dataA.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(" ")}
          fill="hsla(0, 85%, 55%, 0.15)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
        />
        {dataA.map((v, i) => {
          const p = getPoint(i, v);
          return <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" />;
        })}

        {/* Data B (Blue) */}
        <polygon
          points={dataB.map((v, i) => { const p = getPoint(i, v); return `${p.x},${p.y}`; }).join(" ")}
          fill="hsla(217, 91%, 55%, 0.15)"
          stroke="hsl(var(--secondary))"
          strokeWidth={2}
        />
        {dataB.map((v, i) => {
          const p = getPoint(i, v);
          return <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(var(--secondary))" />;
        })}

        {/* Labels */}
        {labels.map((label, i) => {
          const p = getPoint(i, 11.5);
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[9px] font-bold uppercase"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="font-bold text-foreground">{nameA}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-secondary" />
          <span className="font-bold text-foreground">{nameB}</span>
        </div>
      </div>
    </div>
  );
}
