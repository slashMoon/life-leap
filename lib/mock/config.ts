/** 默认使用 Mock；仅当 USE_MOCK_DATA=false 时走 MySQL */
export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA !== "false";
}
