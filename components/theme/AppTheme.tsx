"use client";

import { App as AntdApp, ConfigProvider, message, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useEffect, type ReactNode } from "react";
import { themeVars } from "@/lib/theme/tokens";

export function AppTheme({ children }: { children: ReactNode }) {
  useEffect(() => {
    message.config({ top: 72, duration: 2.4, maxCount: 3 });
  }, []);

  return (
    <ConfigProvider
      locale={zhCN}
      button={{ autoInsertSpace: false }}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: themeVars.gold,
          colorInfo: "#7eb6ff",
          colorSuccess: themeVars.success,
          colorWarning: "#f5c542",
          colorError: themeVars.danger,
          colorBgBase: themeVars.bg,
          colorTextBase: themeVars.ink,
          colorTextSecondary: themeVars.muted,
          colorBorder: themeVars.line,
          colorBorderSecondary: "rgba(212, 168, 83, 0.2)",
          colorLink: themeVars.goldBright,
          borderRadius: 12,
          fontFamily:
            '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: {
            primaryColor: "#1a1408",
            defaultBg: "rgba(18, 16, 12, 0.72)",
            defaultBorderColor: themeVars.line,
            defaultColor: themeVars.ink,
          },
          Card: {
            colorBgContainer: "rgba(16, 14, 12, 0.78)",
            colorBorderSecondary: "rgba(212, 168, 83, 0.28)",
          },
          Modal: {
            contentBg: themeVars.bgElevated,
            headerBg: themeVars.bgElevated,
            titleColor: themeVars.goldBright,
          },
          Input: {
            colorBgContainer: "rgba(8, 8, 10, 0.72)",
            activeBorderColor: themeVars.gold,
            hoverBorderColor: themeVars.goldBright,
          },
          Descriptions: {
            labelBg: "transparent",
          },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
