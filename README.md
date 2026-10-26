# 人生跃迁 · 圈层突围

多人在线实时回合制人生模拟沙盘游戏（Next.js 全栈版）。

## 技术栈

- Next.js 15 (App Router) + React 18 + TypeScript
- Prisma + MySQL
- Redis + Socket.IO
- Zustand / Ant Design / PixiJS / Recharts
- **包管理：pnpm**

## 环境要求

- Node.js ≥ 18.18
- [pnpm](https://pnpm.io/installation) ≥ 9

```bash
# 推荐：启用 Corepack（Node 自带）
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

默认已开启 **Mock 模式**（`USE_MOCK_DATA=true`），无需 MySQL 即可体验大厅、创建/加入房间。

接入真实数据库后，设置 `USE_MOCK_DATA=false` 并配置 `DATABASE_URL`。

### 3. 初始化数据库（可选）

```bash
pnpm db:generate
pnpm db:push
```

### 4. 启动开发服务

```bash
# 同时启动 Next.js + Socket.IO（推荐）
pnpm dev:all

# 或分两个终端
pnpm dev          # http://localhost:3000
pnpm dev:socket   # http://localhost:3001
```

### 5. 生产构建

```bash
pnpm build
pnpm start
```

访问：

- 首页 → 自动跳转大厅：`http://localhost:3000/lobby`
- 登录：`/login`
- 房间：`/room/[id]`
- 游戏：`/game/[id]`
- 复盘：`/report/[id]`

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | Next.js 开发服务 |
| `pnpm dev:socket` | Socket.IO 实时服务 |
| `pnpm dev:all` | 上述两者并行启动 |
| `pnpm build` | 生产构建 |
| `pnpm lint` | ESLint 检查 |
| `pnpm db:studio` | Prisma 数据浏览器 |

## 项目结构

```
app/
  api/          # REST API（user / room / game / card）
  (pages)/      # 页面（login / lobby / room / game / report）
components/     # UI 组件（骰子 / 转盘 / 卡牌 / 现金流 / 交易 / 聊天）
hooks/          # useGame / useRoom / useCashFlow / useSocket
lib/
  game-engine/  # 掷骰、棋盘、卡牌、结账
  rule-engine/  # 现金流公式、圈层跃迁
  constants/    # 内外圈 40 格盘面数据
  prisma/       # Prisma Client
  redis/        # Redis Client
prisma/         # 数据模型
socket/         # Socket.IO 独立服务
stores/         # Zustand 状态
types/          # 游戏 / Socket 类型定义
```

## 核心规则

对局判定与下表一致，并读取房间配置 `RoomConfig`（`lib/constants/circle-rules.ts`、`lib/rule-engine/circle-transition.ts`）：

| 跃迁 | 条件 |
|------|------|
| 牛马 → 老板 | 非劳动收入 > 总支出 |
| 老板 → 核心 | 净资产 ≥ `coreNetWorthThreshold` 万（默认 200 万）且 被动收入 ≥ 总支出 × `corePassiveIncomeMultiplier`（默认 2） |

`coreNetWorthThreshold` 的单位是万。不另设「无负债 / 时间积分 / 品质积分」或「人生意义任务」门槛；积分仍会累计，但不阻挡跃迁。

盘面：外圈 24 格 + 内圈 16 格，见 `lib/constants/board.ts`。

## 后续开发建议

1. PixiJS 渲染双圈转盘（`components/wheel/GameWheel.tsx`）
2. 从 Excel 配套文件导入卡牌数据到 `Card` 表
3. Redis 持久化房间 / 游戏状态（替代 Socket 内存 Map）
4. 用户认证（NextAuth 或 JWT）
5. 复盘导出 Excel / 图片

## 文档

- `人生跃迁游戏文档.md` — 技术方案
- `技术方案文档.md` — 玩法规则
