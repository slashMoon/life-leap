"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { tableAnchors } from "@/lib/table/seat-layout";
import { SeatPlaque, type SeatPlaqueModel } from "./SeatPlaque";

export function ParlorFelt({
  seats,
  onSelect,
  children,
}: {
  seats: SeatPlaqueModel[];
  onSelect?: (userId: string) => void;
  children: ReactNode;
}) {
  const feltRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 1100, height: 820 });

  useLayoutEffect(() => {
    const node = feltRef.current;
    if (!node) return;
    const apply = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;
      setBox({ width: rect.width, height: rect.height });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const compact = box.width < 760;
  const plaque = compact ? { w: 108, h: 76 } : { w: 168, h: 92 };
  const anchors = tableAnchors(Math.max(seats.length, 1), box.width, box.height, plaque);

  return (
    <div className="ll-parlor">
      <div ref={feltRef} className="ll-felt">
        <div className="ll-felt-wheel">{children}</div>
        {seats.map((seat, index) => {
          const anchor = anchors[index];
          if (!anchor) return null;
          return (
            <SeatPlaque
              key={seat.userId}
              seat={seat}
              onSelect={onSelect}
              style={{ left: `${anchor.left}%`, top: `${anchor.top}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
