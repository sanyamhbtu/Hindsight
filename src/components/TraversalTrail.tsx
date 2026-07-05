"use client";

import { ArrowRight, Search, Network } from "lucide-react";
import { motion } from "framer-motion";

export type TrailStep = {
  type?: 'vector' | 'graph';
  subject: string;
  relation?: string;
  object: string;
};

type Props = {
  trail: TrailStep[];
};

export default function TraversalTrail({ trail }: Props) {
  if (!trail || trail.length === 0) return null;

  return (
    <div className="mt-6 pt-6 border-t border-black/[0.08]">
      <h3 className="text-[15px] font-medium tracking-[-0.01em] text-black/70 mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-geist)" }}>
        <Network className="w-4 h-4" /> How we found it
      </h3>

      <div className="flex flex-wrap items-center gap-2 font-mono text-sm">
        {trail.map((step, index) => {
          const isVector = step.type === 'vector';
          const cardBg = isVector ? 'bg-[#eff6ff]' : 'bg-white';
          const cardText = isVector ? 'text-[#0369a1]' : 'text-[#0d0d0d]';
          const cardBorder = isVector ? 'border-[#bae0fd]' : 'border-black/[0.1]';
          const relationBg = isVector ? 'bg-[#0369a1]/10 text-[#0369a1]' : 'bg-[#f35918]/10 text-[#f35918]';

          return (
            <motion.div
              key={index}
              className="flex items-center gap-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.4, duration: 0.4 }}
            >
              {/* Phase Indicator */}
              {index === 0 && isVector && (
                <div className="flex flex-col items-center mr-2">
                  <div className="text-[10px] font-semibold text-[#0369a1] mb-1 uppercase tracking-wide">Vector recall</div>
                </div>
              )}
              {index === 1 && !isVector && (
                <div className="flex flex-col items-center mr-2 ml-4">
                  <div className="text-[10px] font-semibold text-black/50 mb-1 uppercase tracking-wide">Graph traversal</div>
                </div>
              )}

              {/* Subject Node Card */}
              <div className={`${cardBg} ${cardText} px-3 py-1.5 rounded-full shadow-sm border ${cardBorder} flex items-center gap-2`}>
                {isVector && <Search className="w-3 h-3" />}
                <span className="font-semibold">{step.subject}</span>
              </div>

              {/* The Relation Edge */}
              <div className={`flex items-center ${isVector ? 'text-[#0369a1]' : 'text-[#f35918]'}`}>
                <span className={`text-[10px] uppercase tracking-tighter ${relationBg} px-1.5 py-0.5 rounded-full`}>
                  {step.relation || 'CONNECTED_TO'}
                </span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>

              {/* Object Node Card (only render on the last step, or if the next step has a different subject) */}
              {(index === trail.length - 1 || trail[index+1]?.subject !== step.object) && (
                <motion.div
                  className={`bg-white text-[#0d0d0d] px-3 py-1.5 rounded-full shadow-sm border border-black/[0.1] flex items-center gap-2`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.4 + 0.2, duration: 0.4 }}
                >
                  <span className="font-semibold">{step.object}</span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
