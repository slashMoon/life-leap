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
  const body = (
    <>
      <div className="ll-seat-top">
        <i className="ll-seat-pip" style={{ background: seat.color }} aria-hidden />
        <strong>{seat.nickname}</strong>
        {seat.self ? <em>我</em> : null}
        {seat.bot ? <em>机器人</em> : null}
      </div>
      {seat.identityName ? <p className="ll-seat-id">{seat.identityName}</p> : null}
      <p className="ll-seat-cash">{seat.cash == null ? "—" : formatTableCash(seat.cash)}</p>
      <p className="ll-seat-flow">
        <span>{seat.circle ? `${seat.circle}圈` : "入座中"}</span>
        {flow != null ? (
          <span className={flow >= 0 ? "ll-up" : "ll-down"}>
            {flow >= 0 ? "+" : ""}
            {formatTableCash(flow)}
          </span>
        ) : null}
      </p>
      {seat.active ? <p className="ll-seat-badge">当前回合</p> : null}
      {seat.offline ? (
        <p className="ll-seat-badge is-muted">{afk ? `挂机 · ${seat.countdown}s` : "离线"}</p>
      ) : null}
    </>
  );
  const title =
    seat.cash == null
      ? seat.nickname
      : `${seat.nickname} · 现金 ${seat.cash.toLocaleString("zh-CN")}`;

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        title={title}
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
    <article className={className} style={style} title={title} data-seat={seat.userId}>
      {body}
    </article>
  );
}
