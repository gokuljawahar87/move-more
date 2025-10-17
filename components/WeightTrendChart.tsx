// components/WeightTrendChart.tsx
"use client";
import React from "react";


export default function WeightTrendChart({ data }: { data: { date: string; weight: number }[] }) {
// Simple SVG line chart: dates on X (evenly spaced), weight on Y
const padding = 24;
const width = 400;
const height = 180;


const weights = data.map((d) => d.weight);
const min = Math.min(...weights);
const max = Math.max(...weights);
const range = Math.max(0.1, max - min);


const points = data.map((d, i) => {
const x = padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2);
const y = padding + ((max - d.weight) / range) * (height - padding * 2);
return { x, y, ...d };
});


const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");


return (
<div className="w-full overflow-x-auto">
<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
{/* background grid */}
<rect x={0} y={0} width={width} height={height} rx={8} fill="#ffffff" />
{[0, 0.25, 0.5, 0.75, 1].map((t) => (
<line key={t} x1={padding} x2={width - padding} y1={padding + t * (height - padding * 2)} y2={padding + t * (height - padding * 2)} stroke="#e6e6e6" strokeWidth={1} />
))}


{/* line */}
<path d={path} fill="none" stroke="#0ea5e9" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />


{/* points */}
{points.map((p, i) => (
<g key={i}>
<circle cx={p.x} cy={p.y} r={3.5} fill="#0369a1" />
<text x={p.x} y={p.y - 8} fontSize={10} textAnchor="middle" fill="#0369a1">{p.weight}</text>
<text x={p.x} y={height - 6} fontSize={10} textAnchor="middle" fill="#6b7280">{new Date(p.date).toLocaleDateString()}</text>
</g>
))}
</svg>
</div>
);
}