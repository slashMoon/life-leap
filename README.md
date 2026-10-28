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

对局账本（现金、持仓、负债、圈层、位置、回合日志）以 Socket 进程为唯一权威来源。客户端只发送掷骰、决策、还款和聊天。未配置 `REDIS_URL`，或 Redis 连不上时，状态保存在该进程内存里，重启进程会清空未写穿的对局。单人 Mock 试玩同样走这条链路，请用 `pnpm dev:all`。

### 5. 生产构建

```bash
pnpm build
pnpm start        # 只启动网页
pnpm start:demo   # 网页 + Socket.IO（本地 http://localhost:3000，对局走同一端口的 /socket.io）
```

`pnpm start` 不会启动实时服务。要在生产模式里进房间对局，用 `pnpm start:demo`。未配置 `REDIS_URL` 时对局仍在 Socket 进程内存中，重启会清空。

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
| `pnpm start` | 只启动网页 |
| `pnpm start:demo` | 生产模式同时启动网页和 Socket.IO |
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

## Render 演示部署

目标：朋友打开一个公网链接就能进大厅、单机或多人房间。使用 **Mock**（`USE_MOCK_DATA=true`），不需要 MySQL，也不需要 Redis。对局保存在 Socket 进程内存里，服务重启或免费实例休眠后会被清空。

Render 的 Web Service 只把环境变量 `PORT` 对应的端口公开到公网。本仓库用 `scripts/start-demo.mjs` 监听 `0.0.0.0:$PORT`，把普通请求转给 Next.js，把 `/socket.io` 转给 Socket.IO。不要把 Socket 单独绑到 3001 再指望浏览器能连上。

玩法规则没有改。本地 `pnpm dev` / `pnpm dev:all` / `pnpm start` 仍按原来的方式工作。

### 用 Blueprint 创建（推荐）

仓库根目录的 `render.yaml` 描述一个 Docker Web Service，名称 `life-leap-demo`，计划 `free`，区域 `oregon`。区域在创建后不能改；若希望离国内更近，可在第一次 Apply 之前把 `region` 改成 `singapore`。免费实例大约 15 分钟无访问会休眠，下次打开要等冷启动。`free` 和 `0.5c-512mb` 都是 512MB 内存，后者不会休眠。网页加 Socket 空闲时大约 370MB，512MB 能撑住小范围演示；若实例因内存不足反复重启，把 `plan` 改成 `1c-2g`。工作区若不提供 `free`，直接用 `0.5c-512mb` 或 `1c-2g`。

1. 把包含 `render.yaml` 和 `Dockerfile` 的提交推到 GitHub。Blueprint 读的是远程仓库，只改本地文件不会生效。
2. 打开 [新建 Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/slashMoon/life-leap)。若文件还在功能分支上，创建时选那条分支，不要选还没有这些文件的默认分支。
3. 确认服务是 **Web Service**、运行时 **Docker**，健康检查路径是 `/api/health`。
4. 核对环境变量（见下表）。不要添加 `REDIS_URL`。
5. 点击 **Apply**，等部署变为 Live。构建在 Render 的构建环境里执行，不占用实例内存。

服务地址形如 `https://life-leap-demo.onrender.com`。若名称已被占用，改 `render.yaml` 里的 `name` 后重新 Apply。客户端在未设置 `NEXT_PUBLIC_SOCKET_URL` 时会连接当前页面来源，因此改名后不用改前端地址。

### 在 Dashboard 里手动创建

也可以不走 Blueprint，新建 **Web Service** 并连接本仓库：

| 项 | 值 |
|----|----|
| 运行时 | Docker |
| Dockerfile | `./Dockerfile`（仓库根目录） |
| 计划 | Free。需要不休眠用 `0.5c-512mb`；内存不够用 `1c-2g` |
| 健康检查路径 | `/api/health` |
| 启动命令 | 留空，使用镜像里的 `node scripts/start-demo.mjs` |

若改用 Render 的 **Node** 运行时而不是 Docker，构建和启动命令换成：

```bash
# Build Command
corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile && pnpm build

# Start Command
node scripts/start-demo.mjs
```

同时设置 `NODE_VERSION=22`。Node 运行时的 `NODE_ENV=production` 只在启动后生效，构建阶段仍会装上 devDependencies（tsx 用来跑 `socket/server.ts`）。

### 环境变量

| 变量 | 演示时怎么填 |
|------|----------------|
| `USE_MOCK_DATA` | `true`。只有写成 `false` 才会走 MySQL |
| `DATABASE_URL` | `mysql://mock:mock@127.0.0.1:3306/life_leap`。只给 `prisma generate` 占位，Mock 不会连接 |
| `REDIS_URL` | **不要填**。不填则对局在内存中 |
| `PORT` | 不要自己填。Render 会注入，进程必须监听它 |
| `NEXT_PUBLIC_SOCKET_URL` | 留空。浏览器会连当前网站的 `/socket.io`。若 Socket 在另一个公网地址，填那个 `https://` 地址，并重新构建 |
| `NEXT_PUBLIC_APP_URL` | 可留空。需要写死网页来源时再填，例如 `https://life-leap-demo.onrender.com` |
| `SOCKET_CORS_ORIGINS` | 可留空。自定义域名时填网页来源，多个用逗号分隔 |
| `SOCKET_PORT` / `NEXT_INTERNAL_PORT` | 可留空（默认 3001 / 3010，仅容器内部） |

`NEXT_PUBLIC_SOCKET_URL` 和 `NEXT_PUBLIC_APP_URL` 会在 `next build` 时写进前端。在 Docker 服务里，Render 把它们当作构建参数；改完要重新部署，不能只重启。留空 `NEXT_PUBLIC_SOCKET_URL` 时不依赖构建期域名。Socket 进程在运行时读取 `RENDER_EXTERNAL_URL`（Render 自动注入）以及 `SOCKET_CORS_ORIGINS`，用来放行浏览器来源。

### 验收

1. 打开 `https://<服务名>.onrender.com/api/health`，应返回 `{"ok":true,"mock":true,"next":true,"socket":true}`。`ok` 为 false 或一直 502，说明 Next 或 Socket 还没起来，看部署日志里的 `[demo]`、`[socket]`。
2. 打开 `/` 或 `/lobby`。首页会进大厅，不需要 MySQL。可以用游客身份创建公开房间，或走单机入口。
3. 进入房间后再进对局。对局页连接成功时会显示 **服务端对局**；失败时是 **未连接**。两个浏览器加入同一多人房间，掷骰或聊天应能互相同步。
4. 重启服务或等免费实例休眠后再打开，之前的房间和对局会消失，这是内存态的预期结果。重新创建房间即可。

本地可以先确认同一套启动方式：

```bash
pnpm install
pnpm build
pnpm start:demo
```

然后访问 `http://localhost:3000/api/health` 和 `http://localhost:3000/lobby`。`pnpm start` 仍然只启动网页，用来确认原来的生产命令没有被换掉。

## 后续开发建议

1. PixiJS 渲染双圈转盘（`components/wheel/GameWheel.tsx`）
2. 从 Excel 配套文件导入卡牌数据到 `Card` 表
3. 对局会话已可选写穿 Redis（无 Redis 时用进程内存）；MySQL 对局记录仍待做
4. 用户认证（NextAuth 或 JWT）
5. 复盘导出 Excel / 图片

## 文档

- `人生跃迁游戏文档.md` — 技术方案
- `技术方案文档.md` — 玩法规则
