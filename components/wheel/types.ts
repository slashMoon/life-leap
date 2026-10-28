export interface WheelToken {
  id: string;
  label: string;
  track: "outer" | "inner";
  index: number;
  color?: string;
  active?: boolean;
  dice?: number | null;
  /** 其他玩家跃迁时，让对方棋子亮一圈 */
  glow?: boolean;
}
