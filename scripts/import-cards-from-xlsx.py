#!/usr/bin/env python3
"""从 Excel 配套文件导入全量卡牌库，生成 lib/cards/game-cards.json"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
XLSX = ROOT / "「圈层突围」人生跃迁沙盘游戏 完整配套文件.xlsx"
OUT = ROOT / "lib" / "cards" / "game-cards.json"

CATEGORY_MAP = {
    "小机会卡": "small",
    "大机会卡": "big",
    "市场信息卡": "market",
    "风险卡": "risk",
    "有钱有闲卡": "wealth_leisure",
    "投资卡": "investment",
    "品质生活卡": "quality_life",
}

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_to_idx(col: str) -> int:
    n = 0
    for c in col:
        n = n * 26 + (ord(c) - 64)
    return n - 1


def parse_cell_ref(ref: str) -> tuple[int, int]:
    m = re.match(r"([A-Z]+)(\d+)", ref)
    assert m
    return col_to_idx(m.group(1)), int(m.group(2)) - 1


def parse_money(raw: str) -> tuple[float | None, bool]:
    """解析金额，返回 (数值, 是否月度)"""
    if not raw or raw.strip() in ("", "None", "未知", "null"):
        return None, False
    s = raw.strip()
    if "%" in s or "总收入" in s or "总支出" in s:
        return None, False
    monthly = "/月" in s
    s = s.replace("/月", "").replace("￥", "").replace(",", "")
    negative = s.startswith("-")
    if negative:
        s = s[1:]
    try:
        if s.endswith(("w", "W", "万")):
            val = float(s[:-1]) * 10000
        else:
            val = float(s)
    except ValueError:
        return None, False
    if negative:
        val = -val
    return val, monthly


def parse_note(note: str) -> dict:
    result: dict = {}
    if not note:
        return result
    for part in note.split("|"):
        part = part.strip()
        if part.startswith("首付:"):
            v, _ = parse_money(part[3:])
            if v is not None:
                result["downPayment"] = int(v)
        elif part.startswith("抵押贷款:"):
            v, _ = parse_money(part[5:])
            if v is not None:
                result["loan"] = int(v)
    return result


def parse_attrs(attrs: str) -> dict:
    result: dict = {}
    if not attrs:
        return result
    for part in attrs.split("|"):
        if ":" not in part:
            continue
        key, val = part.split(":", 1)
        key = key.strip()
        val = val.strip()
        if val in ("None", ""):
            continue
        if key == "品质积分":
            try:
                result["qualityPoints"] = int(float(val))
            except ValueError:
                pass
        elif key == "时间积分":
            try:
                result["timePoints"] = int(float(val))
            except ValueError:
                pass
    return result


def parse_market_price(desc: str) -> int | None:
    m = re.search(r"出价[￥¥]?(\d+)", desc)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d{5,})", desc)
    if m:
        return int(m.group(1))
    return None


def build_effect(row: dict) -> dict:
    category = row["category"]
    title = row["title"]
    desc = row["desc"]
    cost_raw = row["cost"]
    income_raw = row["income"]
    yield_raw = row["yield_rate"]
    note = row["note"]
    attrs = parse_attrs(row["attrs"])
    effect: dict = {**attrs}

    cost_val, cost_monthly = parse_money(cost_raw)
    income_val, income_monthly = parse_money(income_raw)

    note_data = parse_note(note)

    if category == "大机会卡":
        total = int(cost_val) if cost_val else None
        down = note_data.get("downPayment")
        loan = note_data.get("loan")
        if down is None and total and loan:
            down = total - loan
        if down is not None:
            effect["downPayment"] = down
            effect["cost"] = down
        elif total:
            effect["cost"] = total
        if loan:
            effect["loan"] = loan
        if yield_raw and yield_raw not in ("", "None") and "%" not in yield_raw:
            try:
                y = float(yield_raw)
            except ValueError:
                y = 0
            if y > 0:
                effect["passiveIncome"] = int(y)
            elif y < 0:
                effect["passiveIncome"] = 0
                effect["expense"] = int(abs(y))
        return effect

    if category == "小机会卡":
        if "股票" in title and cost_val is not None and cost_val < 1000:
            shares = 100
            effect["cost"] = int(cost_val * shares)
            effect["sharePrice"] = int(cost_val)
            effect["shares"] = shares
        elif cost_val is not None:
            effect["cost"] = int(abs(cost_val))
        if income_val is not None and 0 < income_val < 1:
            base = effect.get("cost", 0)
            effect["passiveIncome"] = int(base * income_val)
        elif income_monthly and income_val:
            effect["passiveIncome"] = int(income_val)
        elif yield_raw and yield_raw not in ("", "None") and "%" not in yield_raw and effect.get("cost"):
            try:
                y = float(yield_raw)
            except ValueError:
                y = 0
            if y <= 100 and effect["cost"] > 1000:
                effect["passiveIncome"] = int(effect["cost"] * y / 100)
            elif y > 0:
                effect["passiveIncome"] = int(y)
        return effect

    if category == "投资卡":
        if cost_val is not None:
            effect["cost"] = int(abs(cost_val))
        if income_monthly and income_val:
            effect["passiveIncome"] = int(income_val)
        return effect

    if category == "有钱有闲卡":
        if cost_val is not None:
            effect["cost"] = int(abs(cost_val))
        if income_monthly and income_val:
            effect["passiveIncome"] = int(income_val)
        return effect

    if category == "品质生活卡":
        if cost_val is not None:
            effect["cost"] = int(abs(cost_val))
        if income_monthly and income_val:
            effect["passiveIncome"] = int(income_val)
        return effect

    if category == "风险卡":
        if cost_val is not None and cost_val > 0:
            effect["cashDelta"] = -int(cost_val)
        if "3%" in cost_raw or "总收入" in cost_raw:
            effect["percentIncomeLoss"] = 0.03
        title_lower = title + desc
        if "失业" in title_lower:
            effect["payTotalExpense"] = True
            effect["skipRound"] = True
        if "离婚" in title or "官司" in title:
            effect["percentCashLoss"] = 0.5
        if "亲人生病" in title:
            effect["skipRound"] = True
        return effect

    if category == "市场信息卡":
        price = parse_market_price(desc)
        if price:
            effect["marketPrice"] = price
        effect["marketEvent"] = True
        return effect

    if cost_val is not None:
        effect["cost"] = int(abs(cost_val))
    if income_monthly and income_val:
        effect["passiveIncome"] = int(income_val)
    return effect


def load_sheet_rows() -> list[dict]:
    with zipfile.ZipFile(XLSX) as z:
        ss: list[str] = []
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(".//m:si", NS):
            ss.append("".join((t.text or "") for t in si.findall(".//m:t", NS)))

        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        target = None
        for sh in wb.findall(".//m:sheet", NS):
            if sh.attrib.get("name") == "全量卡牌库":
                rid = sh.attrib[
                    "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                ]
                target = "xl/" + rid_map[rid].lstrip("/")

        assert target
        root = ET.fromstring(z.read(target))
        grid: dict[tuple[int, int], str] = {}
        max_r = 0
        for row in root.findall(".//m:sheetData/m:row", NS):
            for c in row.findall("m:c", NS):
                ci, ri = parse_cell_ref(c.attrib["r"])
                v = c.find("m:v", NS)
                val = v.text if v is not None else ""
                if c.attrib.get("t") == "s" and val.isdigit():
                    val = ss[int(val)]
                grid[(ri, ci)] = val.strip()
                max_r = max(max_r, ri)

    rows: list[dict] = []
    for r in range(2, max_r + 1):
        row = [grid.get((r, c), "") for c in range(10)]
        if not row[0] or row[0].startswith("「"):
            continue
        rows.append(
            {
                "category": row[0],
                "circle": row[1],
                "code": row[2],
                "title": row[3],
                "desc": row[4],
                "cost": row[5],
                "income": row[6],
                "yield_rate": row[7],
                "attrs": row[8],
                "note": row[9],
            }
        )
    return rows


def main() -> None:
    rows = load_sheet_rows()
    cards = []
    for row in rows:
        card_type = CATEGORY_MAP.get(row["category"])
        if not card_type:
            continue
        code = row["code"].replace("-", "_").lower()
        content = row["desc"] or row["title"]
        if row["note"] and row["note"] not in content:
            content = f"{content}\n\n备注：{row['note']}" if content else row["note"]
        cards.append(
            {
                "id": f"card_{code}",
                "type": card_type,
                "category": row["category"],
                "code": row["code"],
                "circle": row["circle"],
                "name": row["title"],
                "content": content.strip(),
                "effect": build_effect(row),
                "status": True,
            }
        )

    # 外圈「进修学习」格子专用卡（Excel 无独立分类）
    cards.extend(
        [
            {
                "id": "card_study_outer_001",
                "type": "study",
                "category": "进修学习",
                "code": "S-1",
                "circle": "牛马圈",
                "name": "职业技能进修",
                "content": "支付 5,000 元学费，提升职业技能，月薪 +2,000。",
                "effect": {"cost": 5000, "laborIncome": 2000},
                "status": True,
            },
            {
                "id": "card_study_outer_002",
                "type": "study",
                "category": "进修学习",
                "code": "S-2",
                "circle": "牛马圈",
                "name": "在线 MBA 预备班",
                "content": "支付 8,000 元学费，管理能力提升，月薪 +3,000。",
                "effect": {"cost": 8000, "laborIncome": 3000},
                "status": True,
            },
            {
                "id": "card_study_inner_001",
                "type": "study",
                "category": "进修学习",
                "code": "S-3",
                "circle": "老板圈/核心圈",
                "name": "高管研修班",
                "content": "支付 15,000 元学费，进入高管课程，月薪 +5,000。",
                "effect": {"cost": 15000, "laborIncome": 5000},
                "status": True,
            },
        ]
    )

    # 品质生活中带「学习/进修」的也归入 study 类型，便于进修格子抽卡
    for c in list(cards):
        if c["type"] == "quality_life" and any(
            k in c["name"] for k in ("学习", "进修", "课程")
        ):
            study = {**c, "type": "study", "category": "进修学习"}
            study["id"] = c["id"] + "_study"
            cards.append(study)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(cards, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    by_type: dict[str, int] = {}
    for c in cards:
        by_type[c["type"]] = by_type.get(c["type"], 0) + 1
    print(f"Wrote {len(cards)} cards to {OUT}")
    print("By type:", json.dumps(by_type, ensure_ascii=False))


if __name__ == "__main__":
    main()
