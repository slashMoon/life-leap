"use client";

import { Button, Card, Form, Input } from "antd";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const onFinish = (values: { nickname: string }) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("life-leap-user", JSON.stringify(values));
    }
    router.push("/lobby");
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card
        title="人生跃迁 · 登录"
        className="w-full max-w-md"
        styles={{ body: { background: "#141b2d" } }}
      >
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="昵称"
            name="nickname"
            rules={[{ required: true, message: "请输入昵称" }]}
          >
            <Input placeholder="你的游戏昵称" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            进入大厅
          </Button>
        </Form>
      </Card>
    </main>
  );
}
