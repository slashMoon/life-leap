"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { getStoredUser } from "@/lib/client/user";

export type ShellStep = "login" | "lobby" | "room" | "identity" | "game" | "report";

const STEPS: { id: ShellStep; label: string }[] = [
  { id: "login", label: "登录" },
  { id: "lobby", label: "大厅" },
  { id: "room", label: "房间" },
  { id: "identity", label: "身份" },
  { id: "game", label: "对局" },
  { id: "report", label: "复盘" },
];

function hrefFor(step: ShellStep, roomId?: string) {
  if (step === "login") return "/login";
  if (step === "lobby") return "/lobby";
  if (!roomId) return null;
  if (step === "room") return `/room/${roomId}`;
  if (step === "identity") return `/room/${roomId}/identity`;
  if (step === "game") return `/game/${roomId}`;
  return `/report/${roomId}`;
}

export function AppShell({
  step,
  title,
  kicker,
  meta,
  roomId,
  width = "lg",
  mainClassName,
  children,
}: {
  step: ShellStep;
  title: string;
  kicker?: string;
  meta?: ReactNode;
  roomId?: string;
  width?: "md" | "lg" | "xl" | "wide";
  mainClassName?: string;
  children: ReactNode;
}) {
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    setNickname(stored.nickname === "游客" ? null : stored.nickname);
  }, []);

  return (
    <div className="ll-shell">
      <header className="ll-topbar">
        <Link href="/lobby" className="ll-brand">
          人生跃迁
        </Link>
        <nav className="ll-steps" aria-label="流程">
          {STEPS.map((item) => {
            const href = hrefFor(item.id, roomId);
            const className = item.id === step ? "ll-step is-current" : "ll-step";
            if (!href || item.id === step) {
              return (
                <span
                  key={item.id}
                  className={className}
                  aria-current={item.id === step ? "page" : undefined}
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link key={item.id} href={href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ll-user">{nickname ?? "未登录"}</div>
      </header>
      <main className={`ll-page ll-page-${width}${mainClassName ? ` ${mainClassName}` : ""}`}>
        <div className="ll-page-head">
          <div>
            {kicker ? <p className="ll-kicker">{kicker}</p> : null}
            <h1 className="ll-title ll-page-title">{title}</h1>
          </div>
          {meta ? <div className="ll-meta">{meta}</div> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
