"use client";

import { useEffect, useState } from "react";
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
  Layer,
  Rectangle,
} from "recharts";

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

const NODE_COLORS: Record<string, string> = {
  Submitted: "#6366f1",
  Applied: "#3b82f6",
  Screening: "#eab308",
  Interview: "#a855f7",
  Offer: "#22c55e",
  Rejected: "#ef4444",
  Ghosted: "#9ca3af",
};

interface CustomNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value: number };
  containerWidth: number;
}

function CustomNode({ x, y, width, height, index, payload, containerWidth }: CustomNodeProps) {
  const isOut = x + width + 6 > containerWidth;
  const color = NODE_COLORS[payload.name] || "#94a3b8";

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        fillOpacity={1}
      />
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2}
        fontSize={12}
        fontWeight={600}
        stroke="none"
        fill="#374151"
      >
        {payload.name}
      </text>
      <text
        textAnchor={isOut ? "end" : "start"}
        x={isOut ? x - 6 : x + width + 6}
        y={y + height / 2 + 14}
        fontSize={11}
        stroke="none"
        fill="#9ca3af"
      >
        {payload.value}
      </text>
    </Layer>
  );
}

export function SankeyChart() {
  const [data, setData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/sankey")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || data.links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm text-gray-500">
          Add applications and move them between statuses to see your flow.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodePadding={32}
          nodeWidth={14}
          margin={{ top: 10, right: 90, bottom: 10, left: 90 }}
          link={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
          // @ts-expect-error recharts node prop typing
          node={<CustomNode containerWidth={900} />}
        >
          <Tooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`${n} transition${n !== 1 ? "s" : ""}`, ""];
            }}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
