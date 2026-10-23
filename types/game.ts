/** 圈层 */
export type LifeCircle = "牛马" | "老板" | "核心";

/** 房间状态 */
export type RoomStatus = "waiting" | "playing" | "ended";

/** 单机 / 多人。写在房间和对局会话上，方便界面和日后落库。 */
export type GameMode = "solo" | "multi";

/** 玩家状态 */
export type PlayerStatus = "ready" | "playing" | "offline";

/** 人生六维目标（转盘中心） */
export type LifeDimension =
  | "意识觉醒"
  | "关系圆融"
  | "财务自由"
  | "心灵自由"
  | "身体健康"
  | "时间自由";

/** 外圈格子事件类型（24 格主轨道） */
export type OuterTileType =
  | "opportunity" // 机会
  | "risk" // 风险
  | "market" // 市场信息
  | "settlement" // 结账日
  | "child" // 生孩子
  | "health" // 健康管理
  | "study" // 进修学习
  | "charity"; // 慈善公益

/** 内圈格子事件类型（16 格） */
export type InnerTileType =
  | "financial_storm" // 金融风暴
  | "settlement" // 结账日
  | "investment" // 投资
  | "wealth_leisure" // 有钱有闲
  | "quality_life" // 品生活
  | "health" // 健康管理
  | "tax_audit" // 税务审计
  | "study" // 进修学习
  | "divorce" // 离婚
  | "charity"; // 慈善公益

export interface BoardTile {
  index: number;
  track: "outer" | "inner";
  type: OuterTileType | InnerTileType;
  label: string;
  isStart?: boolean;
}

export interface CashFlowSnapshot {
  laborIncome: number;
  passiveIncome: number;
  totalExpense: number;
  cashFlow: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface RoomConfig {
  maxPlayers: number;
  totalRounds: number;
  difficulty: "easy" | "normal" | "hard";
  /** 老板圈 → 核心圈：净资产门槛（万） */
  coreNetWorthThreshold: number;
  /** 老板圈 → 核心圈：被动收入倍数 */
  corePassiveIncomeMultiplier: number;
  cardPoolIds?: string[];
}

export interface GameState {
  roomId: string;
  currentRound: number;
  currentPlayerOrder: number;
  phase: "roll" | "move" | "event" | "settlement" | "ended";
  boardPosition: Record<string, { track: "outer" | "inner"; index: number }>;
}

export interface DiceRollResult {
  playerId: string;
  value: number;
  timestamp: number;
  reason?: "bot" | "timeout";
}
