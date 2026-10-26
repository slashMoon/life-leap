"use client";

import { Button, Card, Form, Input, Space } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [form] = Form.useForm<{ nickname: string }>();
  const [entering, setEntering] = useState<"solo" | "multi" | null>(null);

  const enter = async (dest: "solo" | "multi") => {
    const values = await form.validateFields();
    setEntering(dest);
    localStorage.setItem("life-leap-user", JSON.stringify(values));
    router.push(dest === "solo" ? "/solo" : "/lobby");
  };

  return (
    <AppShell step="login" title="进入沙盘" kicker="圈层突围" width="md">
      <div className="ll-stage-wrap">
        <Card title="用昵称入座" className="w-full max-w-md">
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              label="昵称"
              name="nickname"
              rules={[{ required: true, whitespace: true, message: "请输入昵称" }]}
            >
              <Input placeholder="你的游戏昵称" size="large" autoFocus maxLength={16} />
            </Form.Item>
            <Space direction="vertical" className="w-full" size="middle">
              <Button
                type="primary"
                block
                size="large"
                loading={entering === "solo"}
                disabled={entering !== null && entering !== "solo"}
                onClick={() => void enter("solo")}
              >
                单机模式
              </Button>
              <Button
                block
                size="large"
                loading={entering === "multi"}
                disabled={entering !== null && entering !== "multi"}
                onClick={() => void enter("multi")}
              >
                多人模式
              </Button>
            </Space>
          </Form>
        </Card>
      </div>
    </AppShell>
  );
}
