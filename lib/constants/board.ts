import type { BoardTile, LifeDimension } from "@/types/game";

/** 转盘中心六维人生目标（顺时针，从底部心灵自由起） */
export const LIFE_DIMENSIONS: LifeDimension[] = [
  "心灵自由",
  "财务自由",
  "关系圆融",
  "意识觉醒",
  "时间自由",
  "身体健康",
];

/**
 * 外圈 24 格（顺时针，起点在底部结账日）
 * 对齐设计稿
 */
export const OUTER_TRACK: BoardTile[] = [
  { index: 0, track: "outer", type: "settlement", label: "结账日", isStart: true },
  { index: 1, track: "outer", type: "market", label: "市场信息" },
  { index: 2, track: "outer", type: "risk", label: "风险" },
  { index: 3, track: "outer", type: "opportunity", label: "机会" },
  { index: 4, track: "outer", type: "child", label: "生孩子" },
  { index: 5, track: "outer", type: "health", label: "健康管理" },
  { index: 6, track: "outer", type: "opportunity", label: "机会" },
  { index: 7, track: "outer", type: "market", label: "市场信息" },
  { index: 8, track: "outer", type: "settlement", label: "结账日" },
  { index: 9, track: "outer", type: "opportunity", label: "机会" },
  { index: 10, track: "outer", type: "risk", label: "风险" },
  { index: 11, track: "outer", type: "study", label: "进修学习" },
  { index: 12, track: "outer", type: "opportunity", label: "机会" },
  { index: 13, track: "outer", type: "market", label: "市场信息" },
  { index: 14, track: "outer", type: "opportunity", label: "机会" },
  { index: 15, track: "outer", type: "risk", label: "风险" },
  { index: 16, track: "outer", type: "opportunity", label: "机会" },
  { index: 17, track: "outer", type: "settlement", label: "结账日" },
  { index: 18, track: "outer", type: "opportunity", label: "机会" },
  { index: 19, track: "outer", type: "market", label: "市场信息" },
  { index: 20, track: "outer", type: "opportunity", label: "机会" },
  { index: 21, track: "outer", type: "charity", label: "慈善公益" },
  { index: 22, track: "outer", type: "risk", label: "风险" },
  { index: 23, track: "outer", type: "opportunity", label: "机会" },
];

/**
 * 内圈 16 格（顺时针，从底部结账日起）
 */
export const INNER_TRACK: BoardTile[] = [
  { index: 0, track: "inner", type: "settlement", label: "结账日" },
  { index: 1, track: "inner", type: "quality_life", label: "品生活" },
  { index: 2, track: "inner", type: "study", label: "进修学习" },
  { index: 3, track: "inner", type: "divorce", label: "离婚" },
  { index: 4, track: "inner", type: "wealth_leisure", label: "有钱有闲" },
  { index: 5, track: "inner", type: "charity", label: "慈善公益" },
  { index: 6, track: "inner", type: "quality_life", label: "品生活" },
  { index: 7, track: "inner", type: "financial_storm", label: "金融风暴" },
  { index: 8, track: "inner", type: "settlement", label: "结账日" },
  { index: 9, track: "inner", type: "investment", label: "投资" },
  { index: 10, track: "inner", type: "wealth_leisure", label: "有钱有闲" },
  { index: 11, track: "inner", type: "quality_life", label: "品生活" },
  { index: 12, track: "inner", type: "health", label: "健康管理" },
  { index: 13, track: "inner", type: "tax_audit", label: "税务审计" },
  { index: 14, track: "inner", type: "investment", label: "投资" },
  { index: 15, track: "inner", type: "wealth_leisure", label: "有钱有闲" },
];

export const OUTER_TRACK_SIZE = OUTER_TRACK.length;
export const INNER_TRACK_SIZE = INNER_TRACK.length;
