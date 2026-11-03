"use client";

import { CommentOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input } from "antd";
import { useEffect, useRef, useState } from "react";
import type { ChatLine } from "@/lib/game-session/types";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket";
import type { Socket } from "socket.io-client";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface ChatPanelProps {
  roomId: string;
  userId: string;
  nickname?: string;
  socket: GameSocket | null;
  messages: ChatLine[];
  /** dock：底栏展开；icon：只留图标，记录在弹出层 */
  variant?: "card" | "dock" | "icon";
}

export function ChatPanel({
  roomId,
  userId,
  nickname,
  socket,
  messages,
  variant = "card",
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [justSent, setJustSent] = useState(false);
  const [open, setOpen] = useState(false);
  const sentTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(sentTimer.current), []);
  const connected = Boolean(socket?.connected);
  const draft = input.trim();

  const send = () => {
    if (!draft || !socket?.connected) return;
    socket.emit("chat:message", { roomId, userId, nickname, content: draft });
    setInput("");
    setJustSent(true);
    window.clearTimeout(sentTimer.current);
    sentTimer.current = window.setTimeout(() => setJustSent(false), 700);
  };

  if (variant === "icon") {
    return (
      <div className="ll-chat-icon">
        {open ? (
          <div className="ll-chat-pop" role="dialog" aria-label="房间聊天">
            {messages.length === 0 ? (
              <p className="ll-chat-empty">还没有人说话</p>
            ) : (
              <div className="ll-chat-log">
                {messages.map((item, index) => {
                  const mine = item.userId === userId;
                  return (
                    <div key={`${item.at}-${index}`} className={mine ? "ll-bubble is-mine" : "ll-bubble"}>
                      <span className="ll-bubble-name">{mine ? "我" : item.nickname}</span>
                      {item.content}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="ll-chat-compose">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPressEnter={send}
                placeholder={connected ? "说一句给同桌…" : "连接对局服务后可聊天"}
                disabled={!connected}
                maxLength={200}
                aria-label="房间聊天"
              />
              <Button type="primary" onClick={send} disabled={!connected || !draft}>
                {justSent ? "已发送" : "发送"}
              </Button>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="ll-chat-trigger"
          aria-expanded={open}
          aria-label={open ? "收起" : "房间聊天"}
          onClick={() => setOpen((value) => !value)}
        >
          <CommentOutlined />
          {messages.length > 0 ? <i className="ll-chat-count">{messages.length}</i> : null}
        </button>
      </div>
    );
  }

  if (variant === "dock") {
    return (
      <div className="ll-chat-dock">
        {open ? (
          <div className="ll-chat-pop">
            {messages.length === 0 ? (
              <p className="ll-chat-empty">还没有人说话</p>
            ) : (
              <div className="ll-chat-log">
                {messages.map((item, index) => {
                  const mine = item.userId === userId;
                  return (
                    <div key={`${item.at}-${index}`} className={mine ? "ll-bubble is-mine" : "ll-bubble"}>
                      <span className="ll-bubble-name">{mine ? "我" : item.nickname}</span>
                      {item.content}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
        <div className="ll-chat-compose">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={send}
            placeholder={connected ? "说一句给同桌…" : "连接对局服务后可聊天"}
            disabled={!connected}
            maxLength={200}
            aria-label="房间聊天"
          />
          <Button type="primary" onClick={send} disabled={!connected || !draft}>
            {justSent ? "已发送" : "发送"}
          </Button>
          <Button
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "收起" : `记录${messages.length ? ` ${messages.length}` : ""}`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card title="房间聊天" size="small">
      {messages.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有人说话" />
      ) : (
        <div className="ll-chat-log">
          {messages.map((item, index) => {
            const mine = item.userId === userId;
            return (
              <div key={`${item.at}-${index}`} className={mine ? "ll-bubble is-mine" : "ll-bubble"}>
                <span className="ll-bubble-name">{mine ? "我" : item.nickname}</span>
                {item.content}
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={send}
          placeholder={connected ? "说一句给同桌…" : "连接对局服务后可聊天"}
          disabled={!connected}
          maxLength={200}
        />
        <Button type="primary" onClick={send} disabled={!connected || !draft}>
          {justSent ? "已发送" : "发送"}
        </Button>
      </div>
    </Card>
  );
}
