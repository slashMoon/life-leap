import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppTheme } from "@/components/theme/AppTheme";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生跃迁 · 圈层突围",
  description: "多人在线实时回合制人生模拟沙盘游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AntdRegistry>
          <AppTheme>{children}</AppTheme>
        </AntdRegistry>
      </body>
    </html>
  );
}
