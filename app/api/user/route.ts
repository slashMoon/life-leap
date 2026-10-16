import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma/client";
import { isMockMode, mockStore } from "@/lib/mock";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nickname, avatar } = body as { nickname: string; avatar?: string };

    if (!nickname?.trim()) {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }

    if (isMockMode()) {
      const user = mockStore.createUser(nickname.trim(), avatar);
      return NextResponse.json(user, { status: 201 });
    }

    const prisma = await getPrisma();
    const user = await prisma.user.create({
      data: { nickname: nickname.trim(), avatar },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[api/user]", error);
    return NextResponse.json({ error: "创建用户失败" }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (isMockMode()) {
      return NextResponse.json(mockStore.listUsers());
    }

    const prisma = await getPrisma();
    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error("[api/user]", error);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
