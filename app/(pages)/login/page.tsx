"use client";

import { Button, Card, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);

  const onFinish = (values: { nickname: string }) => {
    setEntering(true);
    localStorage.setItem("life-leap-user", JSON.stringify(values));
    router.push("/lobby");
  };

  return (
    <AppShell step="login" title="进入沙盘" kicker="圈层突围" width="md">
      <div className="ll-stage-wrap">
        <Card title="用昵称入座" className="w-full max-w-md">
          <Form layout="vertical" onFinish={onFinish} validateTrigger="onBlur" requiredMark={false}>
            <Form.Item
              label="昵称"
              name="nickname"
              rules={[{ required: true, whitespace: true, message: "请输入昵称" }]}
            >
              <Input placeholder="你的游戏昵称" size="large" autoFocus maxLength={16} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={entering}>
              进入大厅
            </Button>
          </Form>
        </Card>
      </div>
    </AppShell>
  );
}
