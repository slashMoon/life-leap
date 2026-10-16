import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import { isMockMode, mockStore } from "@/lib/mock";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? undefined;

    if (isMockMode()) {
      return NextResponse.json(mockStore.listCards(type));
    }

    const prisma = await getPrisma();
    const cards = await prisma.card.findMany({
      where: {
        status: true,
        ...(type ? { type } : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("[api/card]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, name, content, effect } = body;

    if (isMockMode()) {
      const card = {
        id: `card_${Date.now().toString(36)}`,
        type,
        name,
        content,
        effect: effect ?? {},
        status: true,
      };
      mockStore.cards.set(card.id, card);
      return NextResponse.json(card, { status: 201 });
    }

    const prisma = await getPrisma();
    const card = await prisma.card.create({
      data: { type, name, content, effect: effect ?? {} },
    });

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error("[api/card]", error);
    return NextResponse.json({ error: "创建卡牌失败" }, { status: 500 });
  }
}
