"use client";

import type { ReactNode } from "react";
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
  return (
    <div className="ll-parlor">
      <div className="ll-felt-slot">
        <div className="ll-felt">
          <div className="ll-felt-wheel">{children}</div>
        </div>
      </div>
      <div className="ll-seat-rail" role="list">
        {seats.map((seat) => (
          <SeatPlaque key={seat.userId} seat={seat} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
