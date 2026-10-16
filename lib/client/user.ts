export interface StoredUser {
  userId: string;
  nickname: string;
}

/** 本地登录态（Mock 阶段用昵称作为 userId） */
export function getStoredUser(): StoredUser {
  if (typeof window === "undefined") {
    return { userId: "guest", nickname: "游客" };
  }
  const raw = localStorage.getItem("life-leap-user");
  if (!raw) {
    return { userId: "guest", nickname: "游客" };
  }
  try {
    const parsed = JSON.parse(raw) as { nickname?: string };
    const nickname = parsed.nickname?.trim() || "游客";
    return { userId: nickname, nickname };
  } catch {
    return { userId: "guest", nickname: "游客" };
  }
}
