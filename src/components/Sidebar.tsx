"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Network, Zap, Info, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { useDatasetSession } from "@/hooks/useDatasetSession";

export default function Sidebar() {
  const pathname = usePathname();
  const { datasetName } = useDatasetSession();
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!datasetName) return;
    let timeoutId: NodeJS.Timeout;
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/status?dataset=${datasetName}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          const nextPoll = data.status === 'processing' ? 2000 : 15000;
          timeoutId = setTimeout(checkStatus, nextPoll);
          return;
        }
      } catch (e) {}
      timeoutId = setTimeout(checkStatus, 15000);
    };
    
    checkStatus();
    return () => clearTimeout(timeoutId);
  }, [datasetName]);

  const navItems = [
    { href: "/board", icon: <Network size={20} />, label: "Board" },
    { href: "/ask", icon: <Search size={20} />, label: "Ask" },
    { href: "/dashboard", icon: <Zap size={20} />, label: "Dashboard" },
  ];

  // The landing page is its own nav bar — the in-app rail is for the
  // interior pages only.
  if (pathname === "/") return null;

  return (
    <div className="w-[64px] h-screen flex-none border-r border-black/[0.08] bg-white flex flex-col items-center py-5 z-50">
      <Link href="/" className="mb-6 flex items-center justify-center transition-transform hover:scale-110">
        <img src="/chow-icon.svg" alt="Chow" className="size-5" />
      </Link>

      <div className="w-8 h-px bg-black/[0.08] mb-6" />

      <div className="flex flex-col gap-3 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
              pathname === item.href
                ? "bg-[#121212] text-white"
                : "text-black/40 hover:bg-black/[0.04] hover:text-black"
            }`}
          >
            {item.icon}
          </Link>
        ))}
      </div>

      <div className="w-8 h-px bg-black/[0.08] mb-5" />

      <div
        title={`Memory: ${status}`}
        className={`size-2.5 rounded-full mb-1 ${
          status === 'processing' ? 'bg-amber-500 animate-pulse' :
          status === 'error' ? 'bg-[#C0392B]' :
          'bg-emerald-500'
        }`}
      />
    </div>
  );
}
