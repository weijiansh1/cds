from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from pathlib import Path

NAMESPACE = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "docrel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


@dataclass
class DailyRecord:
    city: str
    date_key: int
    date_iso: str
    year: int
    month: int
    counterfactual: float
    observed: float
    net_reduction: float


def _normalize_target(target: str) -> str:
    cleaned = target.lstrip("/")
    if cleaned.startswith("xl/"):
        return cleaned
    return f"xl/{cleaned}"


def _col_ref_to_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    value = 0
    for ch in letters:
        value = value * 26 + (ord(ch.upper()) - 64)
    return value - 1


def _cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    value_node = cell.find("main:v", NAMESPACE)
    if cell_type == "inlineStr":
        inline_node = cell.find("main:is/main:t", NAMESPACE)
        return inline_node.text if inline_node is not None else ""
    if value_node is None or value_node.text is None:
        return ""
    if cell_type == "s":
        index = int(value_node.text)
        return shared_strings[index] if 0 <= index < len(shared_strings) else ""
    return value_node.text


def _parse_sheet_rows(xlsx_path: Path) -> list[list[str]]:
    rows: list[list[str]] = []
    with zipfile.ZipFile(xlsx_path) as archive:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared_xml = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in shared_xml.findall("main:si", NAMESPACE):
                text = "".join((node.text or "") for node in item.findall(".//main:t", NAMESPACE))
                shared_strings.append(text)

        workbook_xml = ET.fromstring(archive.read("xl/workbook.xml"))
        first_sheet = workbook_xml.find("main:sheets/main:sheet", NAMESPACE)
        if first_sheet is None:
            return rows

        relation_id = first_sheet.attrib.get(
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        )
        if not relation_id:
            return rows

        rel_xml = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        target = None
        for rel in rel_xml.findall("pkgrel:Relationship", NAMESPACE):
            if rel.attrib.get("Id") == relation_id:
                target = _normalize_target(rel.attrib["Target"])
                break
        if not target:
            return rows

        sheet_xml = ET.fromstring(archive.read(target))
        for row_node in sheet_xml.findall("main:sheetData/main:row", NAMESPACE):
            cells = row_node.findall("main:c", NAMESPACE)
            values: dict[int, str] = {}
            max_col = -1
            for cell in cells:
                cell_ref = cell.attrib.get("r", "A1")
                col_index = _col_ref_to_index(cell_ref)
                values[col_index] = _cell_value(cell, shared_strings)
                max_col = max(max_col, col_index)
            if max_col >= 0:
                row = [values.get(i, "") for i in range(max_col + 1)]
                rows.append(row)

    return rows


def _parse_date_key(date_raw: str) -> tuple[int, str, int, int]:
    clean = re.sub(r"\D", "", date_raw)
    if len(clean) != 8:
        raise ValueError(f"Invalid date: {date_raw}")
    year = int(clean[0:4])
    month = int(clean[4:6])
    day = int(clean[6:8])
    return int(clean), f"{year:04d}-{month:02d}-{day:02d}", year, month


def _find_column_index(headers: list[str], candidates: tuple[str, ...], fallback: int) -> int:
    for index, header in enumerate(headers):
        text = str(header or "").strip().lower()
        if any(candidate.lower() in text for candidate in candidates):
            return index
    return fallback


def _row_value(row: list[str], index: int) -> str:
    return row[index] if 0 <= index < len(row) else ""


def load_city_records(xlsx_path: Path) -> list[DailyRecord]:
    city_name = xlsx_path.name.split("_", 1)[0]
    rows = _parse_sheet_rows(xlsx_path)
    if len(rows) <= 1:
        return []

    headers = rows[0]
    date_index = _find_column_index(headers, ("日期", "date"), 0)
    counterfactual_index = _find_column_index(headers, ("反事实", "counterfactual"), 1)
    observed_index = _find_column_index(headers, ("实际观测", "观测值", "observed", "actual"), 2)
    net_index = _find_column_index(headers, ("净减排", "政策净", "net_reduction", "net reduction"), 3)

    records: list[DailyRecord] = []
    for row in rows[1:]:
        date_raw = _row_value(row, date_index)
        if not date_raw:
            continue
        try:
            date_key, date_iso, year, month = _parse_date_key(date_raw)
            counterfactual = float(_row_value(row, counterfactual_index))
            observed = float(_row_value(row, observed_index))
            net_reduction = float(_row_value(row, net_index))
        except (ValueError, TypeError):
            continue

        records.append(
            DailyRecord(
                city=city_name,
                date_key=date_key,
                date_iso=date_iso,
                year=year,
                month=month,
                counterfactual=counterfactual,
                observed=observed,
                net_reduction=net_reduction,
            )
        )

    return records
