"use client";

import { Button, Card, Input, List } from "antd";
import { useState } from "react";
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
}

export function ChatPanel({
  roomId,
  userId,
  nickname,
  socket,
  messages,
}: ChatPanelProps) {
  const [input, setInput] = useState("");

  const send = () => {
    const content = input.trim();
    if (!content || !socket?.connected) return;
    socket.emit("chat:message", { roomId, userId, nickname, content });
    setInput("");
  };

  return (
    <Card title="房间聊天" size="small">
      <List
        size="small"
        style={{ maxHeight: 200, overflow: "auto" }}
        dataSource={messages}
        locale={{ emptyText: "暂无消息" }}
        renderItem={(item) => (
          <List.Item>
            <span className="text-gold">{item.nickname}:</span> {item.content}
          </List.Item>
        )}
      />
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={send}
          placeholder={socket?.connected ? "输入消息…" : "连接对局服务后可聊天"}
          disabled={!socket?.connected}
        />
        <Button onClick={send} disabled={!socket?.connected}>
          发送
        </Button>
      </div>
    </Card>
  );
}
