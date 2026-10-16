import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import {
  defaultRoomConfig,
  isMockMode,
  mockStore,
  roomToJson,
} from "@/lib/mock";
import type { RoomConfig } from "@/types/game";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      password,
      config = defaultRoomConfig,
      hostUserId,
      hostNickname,
    } = body as {
      name: string;
      password?: string;
      config?: RoomConfig;
      hostUserId?: string;
      hostNickname?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "房间名不能为空" }, { status: 400 });
    }

    if (isMockMode()) {
      const room = mockStore.createRoom({
        name: name.trim(),
        password: password ?? null,
        config,
        hostUserId,
        hostNickname,
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

export async function GET() {
  try {
    if (isMockMode()) {
      const rooms = mockStore.listRooms("waiting").map(roomToJson);
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
