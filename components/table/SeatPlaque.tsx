"use client";

import type { CSSProperties } from "react";
import type { LifeCircle } from "@/types/game";
import { formatTableCash } from "@/lib/table/seat-layout";

export interface SeatPlaqueModel {
  userId: string;
  nickname: string;
  identityName?: string;
  cash?: number;
  circle?: LifeCircle;
  cashFlow?: number;
  color: string;
  active: boolean;
  self: boolean;
  bot?: boolean;
  offline?: boolean;
  /** 离线且轮到此人时的代掷倒计时，秒 */
  countdown?: number | null;
}

export function SeatPlaque({
  seat,
  style,
  onSelect,
}: {
  seat: SeatPlaqueModel;
  style?: CSSProperties;
  onSelect?: (userId: string) => void;
}) {
  const afk = seat.offline && seat.countdown != null;
  const className = [
    "ll-seat",
    seat.active ? "is-turn" : "",
    seat.self ? "is-self" : "",
    seat.offline ? "is-offline" : "",
    afk ? "is-afk" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const flow = seat.cashFlow;
  const title = [
    seat.nickname,
    seat.self ? "我" : null,
    seat.bot ? "机器人" : null,
    seat.identityName,
    seat.circle ? `${seat.circle}圈` : null,
    seat.cash == null ? null : `现金 ${seat.cash.toLocaleString("zh-CN")}`,
    flow == null ? null : `${flow >= 0 ? "+" : ""}${formatTableCash(flow)}`,
    seat.active ? "当前回合" : null,
    afk ? `挂机 · ${seat.countdown}s` : seat.offline ? "离线" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <i className="ll-seat-pip" style={{ background: seat.color }} aria-hidden />
      <strong>{seat.nickname}</strong>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`${className} ll-bead`}
        style={style}
        title={title}
        aria-label={title}
        role="listitem"
        data-seat={seat.userId}
        data-turn={seat.active ? "1" : "0"}
        aria-current={seat.active ? "true" : undefined}
        onClick={() => onSelect(seat.userId)}
      >
        {body}
      </button>
    );
  }

  return (
    <article className={`${className} ll-bead`} style={style} title={title} data-seat={seat.userId}>
      {body}
    </article>
  );
}
