type SocketUrlEnv = {
  NEXT_PUBLIC_SOCKET_URL?: string;
  NODE_ENV?: string;
};

/**
 * 开发环境默认直连本机 Socket。
 * 生产构建未设置 NEXT_PUBLIC_SOCKET_URL 时，连当前页面来源（Render 上与网页同端口）。
 * 该变量在 next build 时写入客户端，改值后必须重新构建。
 */
export function resolveSocketUrl(env: SocketUrlEnv, pageOrigin?: string): string {
  const configured = env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (configured) return configured;
  if (env.NODE_ENV === "production" && pageOrigin) return pageOrigin;
  return "http://localhost:3001";
}
