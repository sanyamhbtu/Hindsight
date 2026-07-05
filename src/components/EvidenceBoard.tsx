"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { motion, useDragControls } from "framer-motion";
import { ENTITY_THEME as THEME, trustColor } from "@/lib/entityTheme";

export type GraphNode = {
  id: string;
  label: string;
  type: string;
  sourceFragment?: string;
  trust?: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  relation: string;
};

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onBackgroundClick?: () => void;
  activePathIds?: Set<string>;
  selectedNodeId?: string;
};

function getNodeRotation(nodeId: string): number {
  let hash = 0;
  for (let i = 0; i < nodeId.length; i++) {
    hash = ((hash << 5) - hash) + nodeId.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 7) - 3; // -3 to +3 degrees
}

export default function EvidenceBoard({ nodes, edges, onNodeClick, onBackgroundClick, activePathIds, selectedNodeId }: Props) {
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize node positions in a loose grid with randomness
  useEffect(() => {
    if (nodes.length === 0) return;
    if (!containerRef.current) return;
    
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const cellW = (width - 200) / cols;
    const cellH = (height - 200) / Math.ceil(nodes.length / cols);
    
    const initialPos: Record<string, { x: number, y: number }> = {};
    nodes.forEach((node, i) => {
      if (nodePositions[node.id]) {
        initialPos[node.id] = nodePositions[node.id];
      } else {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const randX = (Math.random() - 0.5) * 50;
        const randY = (Math.random() - 0.5) * 50;
        initialPos[node.id] = {
          x: 100 + col * cellW + randX,
          y: 100 + row * cellH + randY,
        };
      }
    });
    setNodePositions(initialPos);
  }, [nodes]);

  const handleDrag = (nodeId: string, info: any) => {
    setNodePositions(prev => ({
      ...prev,
      [nodeId]: {
        x: prev[nodeId].x + info.delta.x,
        y: prev[nodeId].y + info.delta.y,
      }
    }));
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#f2f2f0] relative overflow-hidden"
      onClick={onBackgroundClick}
      style={{
        backgroundImage: `radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)`,
        backgroundSize: '22px 22px'
      }}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {edges.map((edge, i) => {
          const sourcePos = nodePositions[edge.source];
          const targetPos = nodePositions[edge.target];
          if (!sourcePos || !targetPos) return null;
          
          const midX = (sourcePos.x + targetPos.x) / 2;
          const midY = (sourcePos.y + targetPos.y) / 2 - 30; // curve
          
          const isActive = activePathIds?.has(`${edge.source}-${edge.target}`) || activePathIds?.has(`${edge.target}-${edge.source}`);
          const color = isActive ? "#f35918" : "#0d0d0d";

          return (
            <g key={`edge-${i}`}>
              <motion.path
                d={`M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetPos.x} ${targetPos.y}`}
                fill="transparent"
                stroke={color}
                strokeWidth={isActive ? 2.5 : 1.25}
                opacity={isActive ? 0.9 : 0.25}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                style={isActive ? { filter: "drop-shadow(0 0 6px rgba(243,89,24,0.4))" } : {}}
              />
              <motion.foreignObject
                x={midX - 50}
                y={midY - 10}
                width="100"
                height="20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 + 0.3 }}
              >
                <div className="flex justify-center items-center">
                  <span className="bg-white text-black/60 text-[9px] font-mono px-2 py-0.5 rounded-full whitespace-nowrap border border-black/[0.08] shadow-sm">
                    {edge.relation}
                  </span>
                </div>
              </motion.foreignObject>
            </g>
          );
        })}
      </svg>

      {nodes.map((node, i) => {
        const pos = nodePositions[node.id];
        if (!pos) return null;
        const isSelected = selectedNodeId === node.id;
        
        return (
          <motion.div
            key={node.id}
            drag
            dragMomentum={false}
            onDrag={(e, info) => handleDrag(node.id, info)}
            initial={{ opacity: 0, y: pos.y - 40, x: pos.x }}
            animate={{ opacity: 1, y: pos.y, x: pos.x }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.12 }}
            onClick={(e) => {
              e.stopPropagation();
              onNodeClick?.(node);
            }}
            whileHover={{ scale: 1.08, zIndex: 50 }}
            className="absolute -ml-[75px] -mt-[45px] w-[150px] cursor-grab active:cursor-grabbing"
            style={{ rotate: getNodeRotation(node.id) }}
          >
            <div className={`
              bg-white shadow-[0_4px_14px_rgba(0,0,0,0.12)]
              relative rounded-md overflow-hidden border
              ${isSelected ? 'border-[#f35918] border-2 shadow-lg shadow-[#f35918]/20' : 'border-black/[0.08] border'}
            `}>
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: THEME[node.type] || THEME.default }}
              />

              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)] border border-white"
                style={{ backgroundColor: THEME[node.type] || THEME.default }}
              />

              {typeof node.trust === "number" && (
                <div
                  title={`Trust score: ${Math.round(node.trust)}`}
                  className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full border border-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] flex items-center justify-center"
                  style={{ backgroundColor: trustColor(node.trust) }}
                >
                  <span className="sr-only">Trust {Math.round(node.trust)}</span>
                </div>
              )}

              <div className="p-2 pt-3 flex flex-col items-center text-center">
                <span
                  className="text-[10px] font-semibold mb-1 w-full text-center tracking-wide"
                  style={{ color: THEME[node.type] || THEME.default, fontFamily: "var(--font-geist)" }}
                >
                  {node.type.toUpperCase()}
                </span>

                <span className="text-sm font-semibold text-[#0d0d0d] leading-tight">
                  {node.label}
                </span>

                {node.sourceFragment && (
                  <span className="mt-2 text-[9px] text-black/40 font-mono">
                    {node.sourceFragment}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-40 bg-white/90 backdrop-blur border border-black/[0.08] p-4 rounded-lg text-xs font-mono shadow-[0_4px_14px_rgba(0,0,0,0.08)]">
        <div className="text-black/70 font-semibold mb-2 uppercase tracking-widest border-b border-black/[0.08] pb-1">Entity Legend</div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {Object.entries(THEME).filter(([k]) => k !== 'default' && k !== 'Document').map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color as string }} />
              <span className="text-black/55">{key}</span>
            </div>
          ))}
        </div>
        <div className="text-black/70 font-semibold mt-3 mb-2 uppercase tracking-widest border-b border-black/[0.08] pb-1">Trust (corner dot)</div>
        <div className="grid grid-cols-1 gap-y-2">
          {[["High (70+)", trustColor(80)], ["Medium (40-69)", trustColor(55)], ["Low (<40)", trustColor(20)]].map(([label, color]) => (
            <div key={label as string} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color as string }} />
              <span className="text-black/55">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
