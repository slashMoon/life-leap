import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import { isMockMode, mockStore, roomToJson } from "@/lib/mock";
import type { RoomStatus } from "@/types/game";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    if (isMockMode()) {
      const room = mockStore.getRoom(id);
      if (!room) {
        return NextResponse.json({ error: "房间不存在" }, { status: 404 });
      }
      return NextResponse.json(roomToJson(room));
    }

    const prisma = await getPrisma();
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        players: {
          include: { user: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "房间不存在" }, { status: 404 });
    }

    return NextResponse.json({
      ...room,
      players: room.players.map((p) => ({
        id: p.id,
        userId: p.userId,
        nickname: p.user.nickname,
        order: p.order,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error("[api/room/[id]] GET", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, action, userId, nickname, password } = body as {
      status?: RoomStatus;
      action?:
        | "join"
        | "ready"
        | "start"
        | "enter"
        | "selectIdentity"
        | "assignRandomIdentity"
        | "prepareSoloPlay"
        | "setBanker";
      userId?: string;
      nickname?: string;
      password?: string;
    };

    if (isMockMode()) {
      const existing = mockStore.getRoom(id);
      if (!existing) {
        return NextResponse.json({ error: "房间不存在" }, { status: 404 });
      }

      let room = existing;

      if (action === "enter" && userId) {
        const alreadyIn = existing.players.some(
          (p) => p.userId === userId || p.nickname === nickname
        );
        if (!alreadyIn) {
          const joined = mockStore.joinRoom(id, userId, nickname ?? userId, password);
          if (!joined.ok) {
            return NextResponse.json({ error: joined.reason }, { status: 400 });
          }
          return NextResponse.json(roomToJson(joined.value));
        }
        return NextResponse.json(roomToJson(existing));
      }

      if (action === "join" && userId) {
        const joined = mockStore.joinRoom(id, userId, nickname ?? userId, password);
        if (!joined.ok) {
          return NextResponse.json({ error: joined.reason }, { status: 400 });
        }
        return NextResponse.json(roomToJson(joined.value));
      }

      if (
        (action === "assignRandomIdentity" || action === "selectIdentity") &&
        userId
      ) {
        const assigned = mockStore.assignRandomIdentity(
          id,
          nickname ?? userId
        );
        if (!assigned.ok) {
          return NextResponse.json({ error: assigned.reason }, { status: 400 });
        }
        const { assignedIdentityId, ...room } = assigned.value;
        return NextResponse.json({
          ...roomToJson(room),
          assignedIdentityId,
        });
      }

      if (action === "prepareSoloPlay" && userId) {
        const prepared = mockStore.prepareSoloPlay(id, nickname ?? userId);
        if (!prepared.ok) {
          return NextResponse.json({ error: prepared.reason }, { status: 400 });
        }
        return NextResponse.json(roomToJson(prepared.value));
      }

      if (action === "setBanker" && userId) {
        const updated = mockStore.setBanker(id, nickname ?? userId);
        if (!updated) {
          return NextResponse.json({ error: "设置银行家失败" }, { status: 400 });
        }
        return NextResponse.json(roomToJson(updated));
      }

      if (action === "ready" && userId) {
        const ready = mockStore.setPlayerReady(id, nickname ?? userId);
        if (!ready) {
          return NextResponse.json(
            { error: "请先选择身份后再准备" },
            { status: 400 }
          );
        }
        room = ready;
        return NextResponse.json(roomToJson(room));
      }

      if (action === "start" || status === "playing") {
        if (!userId) {
          return NextResponse.json({ error: "只有房主可以开始" }, { status: 403 });
        }
        const started = mockStore.startMatch(id, userId, nickname);
        if (!started.ok) {
          const statusCode = started.reason === "只有房主可以开始" ? 403 : 400;
          return NextResponse.json({ error: started.reason }, { status: statusCode });
        }
        return NextResponse.json(roomToJson(started.value));
      }

      if (status) {
        room = mockStore.updateRoomStatus(id, status) ?? room;
        return NextResponse.json(roomToJson(room));
      }

      return NextResponse.json({ error: "无效操作" }, { status: 400 });
    }

    const prisma = await getPrisma();
    if (status) {
      const room = await prisma.room.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json(room);
    }

    return NextResponse.json({ error: "无效操作" }, { status: 400 });
  } catch (error) {
    console.error("[api/room/[id]] PATCH", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
