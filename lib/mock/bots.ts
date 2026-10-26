import type { IdentityId } from "@/types/identity";

export const SYSTEM_BANKER_USER_ID = "system_banker";
export const SYSTEM_BANKER_NICKNAME = "系统银行家";

/** 单机对手与多人补位共用的中文名册。第一位保持「旅人」，方便已有对局识别。 */
export const BOT_ROSTER: {
  userId: string;
  nickname: string;
  identityId: IdentityId;
}[] = [
  { userId: "practice_bot", nickname: "旅人", identityId: "security_guard" },
  { userId: "practice_bot_2", nickname: "阿宁", identityId: "driver" },
  { userId: "practice_bot_3", nickname: "老周", identityId: "it_technician" },
  { userId: "practice_bot_4", nickname: "小林", identityId: "sales_manager" },
  { userId: "practice_bot_5", nickname: "阿棠", identityId: "lawyer" },
  { userId: "practice_bot_6", nickname: "南风", identityId: "doctor" },
  { userId: "practice_bot_7", nickname: "石头", identityId: "security_guard" },
];

export const MIN_SOLO_BOTS = 1;
export const MAX_SOLO_BOTS = BOT_ROSTER.length;
export const DEFAULT_SOLO_BOTS = 2;

export function normalizeSoloBots(count: unknown): number | null {
  const value = typeof count === "number" ? count : Number(count);
  if (!Number.isInteger(value)) return null;
  if (value < MIN_SOLO_BOTS || value > MAX_SOLO_BOTS) return null;
  return value;
}
