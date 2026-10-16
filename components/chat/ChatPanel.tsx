"use client";

import { Button, Card, Input, List } from "antd";
import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";

interface ChatMessage {
  userId: string;
  nickname: string;
  content: string;
  at: number;
}

interface ChatPanelProps {
  roomId: string;
  userId: string;
}

export function ChatPanel({ roomId, userId }: ChatPanelProps) {
  const { socket } = useSocket(roomId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (!socket) return;
    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };
    socket.on("chat:message", handler);
    return () => {
      socket.off("chat:message", handler);
    };
  }, [socket]);

  const send = () => {
    if (!input.trim() || !socket) return;
    socket.emit("chat:message", { roomId, userId, content: input.trim() });
    setInput("");
  };

  return (
    <Card title="房间聊天" size="small">
      <List
        size="small"
        style={{ maxHeight: 200, overflow: "auto" }}
        dataSource={messages}
        locale={{ emptyText: "暂无消息" }}
        renderItem={(m) => (
          <List.Item>
            <span className="text-gold">{m.nickname}:</span> {m.content}
          </List.Item>
        )}
      />
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={send}
          placeholder="输入消息…"
        />
        <Button onClick={send}>发送</Button>
      </div>
    </Card>
  );
}
