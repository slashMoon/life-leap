import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import { defaultRoomConfig, isMockMode, mockStore, roomToJson } from "@/lib/mock";
import type { GameMode, RoomConfig } from "@/types/game";
import { MAX_BOARD_PLAYERS } from "@/types/identity";

function clampMaxPlayers(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed)) return defaultRoomConfig.maxPlayers;
  return Math.min(MAX_BOARD_PLAYERS, Math.max(2, parsed));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      password,
      config = defaultRoomConfig,
      hostUserId,
      hostNickname,
      mode,
      isPublic,
      fillBots,
      botCount,
      difficulty,
    } = body as {
      name?: string;
      password?: string;
      config?: RoomConfig;
      hostUserId?: string;
      hostNickname?: string;
      mode?: GameMode;
      isPublic?: boolean;
      fillBots?: boolean;
      botCount?: number;
      difficulty?: RoomConfig["difficulty"];
    };

    if (isMockMode() && mode === "solo") {
      const room = mockStore.createSoloRoom({
        hostUserId,
        hostNickname,
        botCount,
        difficulty: difficulty ?? config?.difficulty,
        name,
      });
      if (!room.ok) {
        return NextResponse.json({ error: room.reason }, { status: 400 });
      }
      return NextResponse.json(roomToJson(room.value), { status: 201 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: "房间名不能为空" }, { status: 400 });
    }

    if (isMockMode()) {
      const nextConfig: RoomConfig = {
        ...defaultRoomConfig,
        ...config,
        maxPlayers: clampMaxPlayers(config?.maxPlayers),
      };
      const room = mockStore.createRoom({
        name: name.trim(),
        password: password ?? null,
        config: nextConfig,
        hostUserId,
        hostNickname,
        mode: "multi",
        isPublic,
        fillBots,
      });
      return NextResponse.json(roomToJson(room), { status: 201 });
    }

    const prisma = await getPrisma();
    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        password: password ?? null,
        status: "waiting",
        config: config as object,
      },
    });

    if (hostUserId) {
      await prisma.roomPlayer.create({
        data: {
          roomId: room.id,
          userId: hostUserId,
          order: 0,
          status: "ready",
        },
      });
    }

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("[api/room]", error);
    return NextResponse.json({ error: "创建房间失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    if (isMockMode()) {
      const code = new URL(request.url).searchParams.get("code");
      if (code) {
        const room = mockStore.findByCode(code);
        if (!room) {
          return NextResponse.json({ error: "没有这个房间号" }, { status: 404 });
        }
        return NextResponse.json({
          id: room.id,
          code: room.code,
          name: room.name,
          hasPassword: Boolean(room.password),
          mode: room.mode,
          status: room.status,
        });
      }
      const rooms = mockStore.listLobbyRooms().map(roomToJson);
      return NextResponse.json(rooms);
    }

    const prisma = await getPrisma();
    const rooms = await prisma.room.findMany({
      where: { status: "waiting" },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        players: { include: { user: true } },
      },
    });
    return NextResponse.json(rooms);
  } catch (error) {
    console.error("[api/room]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
