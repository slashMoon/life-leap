import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import { isMockMode, mockStore, roomToJson } from "@/lib/mock";

type Params = { params: Promise<{ roomId: string }> };

const MOCK_GAME_RECORDS = [
  {
    id: "record_demo_1",
    userId: "user_demo_host",
    nickname: "主持人·小明",
    circle: "牛马",
    netWorth: 120000,
    rank: 1,
    flows: [
      {
        round: 1,
        laborIncome: 15000,
        passiveIncome: 0,
        totalExpense: 8000,
        cashFlow: 7000,
        netWorth: 50000,
      },
      {
        round: 2,
        laborIncome: 15000,
        passiveIncome: 2000,
        totalExpense: 9000,
        cashFlow: 8000,
        netWorth: 120000,
      },
    ],
  },
];

export async function GET(_request: Request, { params }: Params) {
  try {
    const { roomId } = await params;

    if (isMockMode()) {
      const room = mockStore.getRoom(roomId);
      if (!room) {
        return NextResponse.json({ error: "房间不存在" }, { status: 404 });
      }
      return NextResponse.json({
        room: roomToJson(room),
        records: MOCK_GAME_RECORDS,
        mock: true,
      });
    }

    const prisma = await getPrisma();
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "房间不存在" }, { status: 404 });
    }

    const records = await prisma.gameRecord.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, nickname: true } },
        flows: { orderBy: { round: "asc" } },
        events: { orderBy: { round: "asc" } },
      },
    });

    return NextResponse.json({ room, records });
  } catch (error) {
    console.error("[api/game]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { status } = body as { status: string };

    if (isMockMode()) {
      const room = mockStore.updateRoomStatus(
        roomId,
        status as "waiting" | "playing" | "ended"
      );
      if (!room) {
        return NextResponse.json({ error: "房间不存在" }, { status: 404 });
      }
      return NextResponse.json(roomToJson(room));
    }

    const prisma = await getPrisma();
    const room = await prisma.room.update({
      where: { id: roomId },
      data: { status },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("[api/game]", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
