import React from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface TemporalTimelineProps {
  answerText: string;
}

export default function TemporalTimeline({ answerText }: TemporalTimelineProps) {
  if (!answerText) return null;

  // Simple heuristic: split by newlines, try to extract time-like prefixes
  const lines = answerText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  return (
    <div className="mt-8 relative border-l-2 border-[#8B6914]/30 ml-4 pl-6 flex flex-col gap-6">
      {lines.map((line, idx) => {
        // Attempt to match a leading timestamp (e.g., "02:00 AM - " or "2024-05-01: ")
        const timeMatch = line.match(/^(\d{1,4}[-:/]\d{1,2}[-:/]?\d{0,2}(?:\s?[aApP][mM])?[:\-]?\s*)/);
        let timeStamp = "";
        let content = line;

        if (timeMatch) {
          timeStamp = timeMatch[1].replace(/[:\-]$/, '').trim();
          content = line.slice(timeMatch[0].length).trim();
        }

        return (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.15 }}
            className="relative"
          >
            {/* Timeline dot */}
            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#1A1108] border-2 border-[#F5C842] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C0392B]" />
            </div>

            <div className="bg-[#2C1F0E]/40 border border-[#8B6914]/20 rounded-md p-4 shadow-sm hover:border-[#8B6914]/50 transition-colors">
              {timeStamp && (
                <div className="flex items-center gap-2 text-[#F5C842] font-mono text-xs font-bold mb-2 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  {timeStamp}
                </div>
              )}
              <div className="text-[#F5EDD4] font-body text-sm leading-relaxed">
                {content}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
