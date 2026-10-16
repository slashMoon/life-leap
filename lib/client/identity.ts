import type { IdentityId } from "@/types/identity";

const KEY_PREFIX = "life-leap-identity";

export function saveSelectedIdentity(
  roomId: string,
  userId: string,
  identityId: IdentityId
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${KEY_PREFIX}:${roomId}:${userId}`, identityId);
}

export function getSelectedIdentity(
  roomId: string,
  userId: string
): IdentityId | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${KEY_PREFIX}:${roomId}:${userId}`);
  return raw as IdentityId | null;
}

export function clearSelectedIdentity(roomId: string, userId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${KEY_PREFIX}:${roomId}:${userId}`);
}
