#!/usr/bin/env python3
"""Convert air_defense_master.xlsx into defense JSON files.

Usage:
  python3 tool/excel_to_json.py
  python3 tool/excel_to_json.py --xlsx /path/to/air_defense_master.xlsx
"""

from __future__ import annotations

import argparse
import json
import math
import posixpath
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

REQUIRED_HEADERS = [
    "system_code",
    "defense_role",
    "recommended_system_count",
    "defended_center_min_km",
    "defended_center_max_km",
    "radar_count",
    "kkm_count",
    "ffs_count",
    "radar_min_track_range_m",
    "radar_illum_capacity",
    "radar_setup_time_ill_track_sec",
    "radar_track_range_rcs1_km",
    "radar_azimuth_min_deg",
    "radar_azimuth_max_deg",
    "radar_elevation_min_deg",
    "radar_elevation_max_deg",
    "ffs_effective_range_km",
    "ffs_effective_altitude_km",
    "missile_per_ffs",
    "total_ready_missile",
    "reload_min_per_missile",
    "interceptor_p_success",
    "dist_radar_kkm_min_m",
    "dist_radar_kkm_max_m",
    "dist_kkm_ffs_min_m",
    "dist_kkm_ffs_max_m",
    "dist_radar_ffs_min_m",
    "dist_radar_ffs_max_m",
    "dist_ffs_ffs_min_m",
    "dist_ffs_ffs_max_m",
    "note",
    "munition_code",
    "munition_name",
    "munition_min_range_km",
    "munition_max_range_km",
    "munition_max_eff_range_km",
    "munition_min_altitude_km",
    "munition_max_altitude_km",
    "munition_speed_mps",
    "munition_p_success",
    "munition_ill_req",
    "weapon_setup_time_sec",
    "weapon_launch_delay_sec",
]

OPTIONAL_HEADERS = [
    "radar_min_rcs_m2",
    "radar_max_rcs_m2",
    "akr_min_rcs_m2",
    "akr_max_rcs_m2",
    "ffs_height_above_ground_m",
    "radar_height_above_ground_m",
    "Radar_LOS_needed",
    "FSS_LOS_needed",
    "radar_hva_value",
    "akr_count",
    "eo_count",
    "ffs_min_count",
    "ffs_max_count",
    "dist_radar_akr_min_m",
    "dist_radar_akr_max_m",
    "dist_kkm_akr_min_m",
    "dist_kkm_akr_max_m",
    "dist_akr_ffs_min_m",
    "dist_akr_ffs_max_m",
    "dist_radar_eo_min_m",
    "dist_radar_eo_max_m",
    "dist_kkm_eo_min_m",
    "dist_kkm_eo_max_m",
    "dist_eo_ffs_min_m",
    "dist_eo_ffs_max_m",
]


def parse_num(value: object) -> object:
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    try:
        if any(ch in text for ch in [".", "e", "E"]):
            num = float(text)
            return int(num) if num.is_integer() else num
        return int(text)
    except ValueError:
        try:
            num = float(text.replace(",", "."))
            return int(num) if num.is_integer() else num
        except ValueError:
            return text


def col_index(cell_ref: str) -> int:
    col = "".join(ch for ch in cell_ref if ch.isalpha())
    idx = 0
    for ch in col:
        idx = idx * 26 + (ord(ch.upper()) - 64)
    return idx - 1


def read_sheet_rows(xlsx_path: Path, sheet_name: str | None = None) -> list[list[str]]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            sroot = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in sroot.findall("a:si", NS):
                parts = [t.text or "" for t in si.findall(".//a:t", NS)]
                shared_strings.append("".join(parts))

        sheet_path = "xl/worksheets/sheet1.xml"
        if sheet_name is not None:
            workbook = ET.fromstring(zf.read("xl/workbook.xml"))
            sheet = next((s for s in workbook.findall("a:sheets/a:sheet", NS)
                          if s.get("name") == sheet_name), None)
            if sheet is None:
                raise ValueError(f"Missing worksheet: {sheet_name}")
            rel_id = sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
            rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
            target = next(r.get("Target") for r in rels if r.get("Id") == rel_id)
            sheet_path = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
        wroot = ET.fromstring(zf.read(sheet_path))
        sheet_data = wroot.find("a:sheetData", NS)
        if sheet_data is None:
            return []

        rows: list[list[str]] = []
        for row in sheet_data.findall("a:row", NS):
            cell_values = {}
            for cell in row.findall("a:c", NS):
                ref = cell.attrib.get("r", "")
                idx = col_index(ref)
                ctype = cell.attrib.get("t")
                value = ""
                if ctype == "s":
                    value_node = cell.find("a:v", NS)
                    if value_node is not None and value_node.text:
                        value = shared_strings[int(value_node.text)]
                elif ctype == "inlineStr":
                    text_node = cell.find("a:is/a:t", NS)
                    value = "" if text_node is None or text_node.text is None else text_node.text
                else:
                    value_node = cell.find("a:v", NS)
                    value = "" if value_node is None or value_node.text is None else value_node.text
                cell_values[idx] = value

            max_i = max(cell_values.keys()) if cell_values else -1
            rows.append([cell_values.get(i, "") for i in range(max_i + 1)])
        return rows


def apply_munition_costs(root: dict, xlsx_path: Path) -> None:
    """Apply USD unit costs by stable munition code, leaving all other fields intact."""
    rows = read_sheet_rows(xlsx_path, "munition_costs")
    if not rows or rows[0][:2] != ["munition_code", "Cost"]:
        raise ValueError("munition_costs must start with munition_code and Cost columns")
    costs = {}
    for row in rows[1:]:
        if not row or not row[0].strip():
            continue
        code = row[0].strip()
        value = parse_num(row[1] if len(row) > 1 else None)
        if code in costs:
            raise ValueError(f"Duplicate munition cost: {code}")
        if not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
            raise ValueError(f"Invalid USD cost for {code}: {value!r}")
        costs[code] = value
    for munition in root["munitions"]:
        if munition["code"] not in costs:
            raise ValueError(f"Missing USD cost for {munition['code']}")
    for munition in root["munitions"]:
        munition["Cost"] = costs[munition["code"]]
    root.setdefault("meta", {}).setdefault("units", {})["Cost"] = "USD"


def normalize_records(rows: list[list[str]]) -> list[dict[str, str]]:
    if not rows:
        return []
    headers = rows[0]
    missing = [h for h in REQUIRED_HEADERS if h not in headers]
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(missing)}")

    records: list[dict[str, str]] = []
    for raw in rows[1:]:
        row = raw + [""] * max(0, len(headers) - len(raw))
        row = row[: len(headers)]
        rec = {headers[i]: row[i] for i in range(len(headers))}
        for header in OPTIONAL_HEADERS:
            rec.setdefault(header, "")
        if str(rec.get("system_code", "")).strip():
            records.append(rec)
    return records


def parse_bool(value: object) -> bool:
    text = str(value).strip().lower()
    if text in ("1", "true"):
        return True
    if text in ("0", "false"):
        return False
    raise ValueError(f"Expected boolean (1/0 or true/false), got {value!r}")


def apply_system_los(root: dict, records: list[dict[str, str]]) -> None:
    flags = {}
    for rec in records:
        code = rec["system_code"].strip()
        if code in flags:
            raise ValueError(f"Duplicate system code: {code}")
        flags[code] = {field: parse_bool(rec.get(field))
                       for field in ("Radar_LOS_needed", "FSS_LOS_needed")}
    for system in root["systems"]:
        if system["code"] not in flags:
            raise ValueError(f"Missing LOS values for {system['code']}")
    for system in root["systems"]:
        system.update(flags[system["code"]])


def apply_radar_heights(root: dict, records: list[dict[str, str]]) -> None:
    apply_component_heights(root, records, "radar")


def apply_ffs_heights(root: dict, records: list[dict[str, str]]) -> None:
    apply_component_heights(root, records, "ffs")


def apply_component_heights(root: dict, records: list[dict[str, str]], component: str) -> None:
    """Copy height above local ground in metres without changing terrain elevation."""
    heights = {}
    for rec in records:
        code = rec["system_code"].strip()
        if code in heights:
            raise ValueError(f"Duplicate system code: {code}")
        height = parse_num(rec.get(f"{component}_height_above_ground_m"))
        if not isinstance(height, (int, float)) or not math.isfinite(height) or height < 0:
            raise ValueError(f"Invalid {component} height in metres for {code}: {height!r}")
        heights[code] = height
    for system in root["systems"]:
        if system["code"] not in heights:
            raise ValueError(f"Missing {component} height for {system['code']}")
    for system in root["systems"]:
        system.setdefault("technical", {}).setdefault(component, {})["heightAboveGroundM"] = heights[system["code"]]


def apply_radar_rcs(root: dict, records: list[dict[str, str]], component: str = "radar") -> None:
    bounds = {}
    for rec in records:
        code = rec["system_code"].strip()
        if code in bounds:
            raise ValueError(f"Duplicate system code: {code}")
        if component == "akr" and not any(s["code"] == code and "akr" in s.get("technical", {}) for s in root["systems"]):
            continue
        minimum = parse_num(rec.get(f"{component}_min_rcs_m2"))
        maximum = parse_num(rec.get(f"{component}_max_rcs_m2"))
        if any(not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0
               for v in (minimum, maximum)):
            raise ValueError(f"Invalid radar RCS bounds for {code}")
        if minimum > maximum:
            raise ValueError(f"Minimum radar RCS exceeds maximum for {code}")
        bounds[code] = {"minRcsM2": minimum, "maxRcsM2": maximum}
    for system in root["systems"]:
        if component == "akr" and "akr" not in system.get("technical", {}):
            continue
        if system["code"] not in bounds:
            raise ValueError(f"Missing radar RCS bounds for {system['code']}")
    for system in root["systems"]:
        if component == "akr" and "akr" not in system.get("technical", {}):
            continue
        system.setdefault("technical", {}).setdefault(component, {}).update(bounds[system["code"]])


def with_min_max(count_value: object, min_value: object, max_value: object) -> tuple[object, object, object]:
    count = parse_num(count_value)
    minimum = parse_num(min_value)
    maximum = parse_num(max_value)
    if minimum is None:
        minimum = count
    if maximum is None:
        maximum = count
    if count is None:
        count = minimum if minimum is not None else maximum
    return count, minimum, maximum


def build_systems_json(records: list[dict[str, str]]) -> dict:
    systems = []
    for rec in records:
        code = rec["system_code"].strip()
        role = rec.get("defense_role", "").strip()
        note = rec.get("note", "").strip()
        munition_code = rec.get("munition_code", "").strip()
        ffs_count, ffs_min_count, ffs_max_count = with_min_max(
            rec.get("ffs_count"),
            rec.get("ffs_min_count"),
            rec.get("ffs_max_count"),
        )
        missile_per_ffs = parse_num(rec.get("missile_per_ffs"))
        total_ready = parse_num(rec.get("total_ready_missile"))
        if total_ready is None and missile_per_ffs is not None and ffs_count is not None:
            total_ready = parse_num(missile_per_ffs) * parse_num(ffs_count)

        components = [
            {
                "type": "Radar",
                "count": parse_num(rec.get("radar_count")),
                "HVA_value": parse_num(rec.get("radar_hva_value")),
            },
            {"type": "KKM", "count": parse_num(rec.get("kkm_count"))},
        ]
        akr_count = parse_num(rec.get("akr_count"))
        if akr_count not in (None, 0):
            components.append({"type": "AKR", "count": akr_count})
        eo_count = parse_num(rec.get("eo_count"))
        if eo_count not in (None, 0):
            components.append({"type": "EO", "count": eo_count})
        components.append(
            {
                "type": "FFS",
                "count": ffs_count,
                "minCount": ffs_min_count,
                "maxCount": ffs_max_count,
                "interceptorPerComponent": missile_per_ffs,
                "totalReadyInterceptor": total_ready,
            }
        )

        intra_system = {
            "radarToKkm": {
                "min": parse_num(rec.get("dist_radar_kkm_min_m")),
                "max": parse_num(rec.get("dist_radar_kkm_max_m")),
            },
            "kkmToFfs": {
                "min": parse_num(rec.get("dist_kkm_ffs_min_m")),
                "max": parse_num(rec.get("dist_kkm_ffs_max_m")),
            },
            "radarToFfs": {
                "min": parse_num(rec.get("dist_radar_ffs_min_m")),
                "max": parse_num(rec.get("dist_radar_ffs_max_m")),
            },
            "radarToAkr": {
                "min": parse_num(rec.get("dist_radar_akr_min_m")),
                "max": parse_num(rec.get("dist_radar_akr_max_m")),
            },
            "kkmToAkr": {
                "min": parse_num(rec.get("dist_kkm_akr_min_m")),
                "max": parse_num(rec.get("dist_kkm_akr_max_m")),
            },
            "akrToFfs": {
                "min": parse_num(rec.get("dist_akr_ffs_min_m")),
                "max": parse_num(rec.get("dist_akr_ffs_max_m")),
            },
            "ffsToFfs": {
                "min": parse_num(rec.get("dist_ffs_ffs_min_m")),
                "max": parse_num(rec.get("dist_ffs_ffs_max_m")),
            },
        }
        optional_pairs = {
            "radarToEo": {
                "min": parse_num(rec.get("dist_radar_eo_min_m")),
                "max": parse_num(rec.get("dist_radar_eo_max_m")),
            },
            "kkmToEo": {
                "min": parse_num(rec.get("dist_kkm_eo_min_m")),
                "max": parse_num(rec.get("dist_kkm_eo_max_m")),
            },
            "eoToFfs": {
                "min": parse_num(rec.get("dist_eo_ffs_min_m")),
                "max": parse_num(rec.get("dist_eo_ffs_max_m")),
            },
        }
        for key, value in optional_pairs.items():
            if value["min"] is not None or value["max"] is not None:
                intra_system[key] = value

        system = {
            "id": f"ADS_{code}",
            "code": code,
            "role": role,
            "integration": {
                "upperK2Managed": True,
                "airPictureSharing": True,
                "linkEnabled": True,
            },
            "components": components,
            "technical": {
                "radar": {
                    "trackRange": {
                        "minTrackRangeM": parse_num(rec.get("radar_min_track_range_m")),
                        "referenceRcsM2": 1,
                        "rangeKm": parse_num(rec.get("radar_track_range_rcs1_km")),
                        "rcsScaling": "range scales with fourth-root of RCS",
                    },
                    "illumCapacity": parse_num(rec.get("radar_illum_capacity")),
                    "setupTimeIllTrackSec": parse_num(rec.get("radar_setup_time_ill_track_sec")),
                    "azimuthDeg": {
                        "min": parse_num(rec.get("radar_azimuth_min_deg")),
                        "max": parse_num(rec.get("radar_azimuth_max_deg")),
                    },
                    "elevationDeg": {
                        "min": parse_num(rec.get("radar_elevation_min_deg")),
                        "max": parse_num(rec.get("radar_elevation_max_deg")),
                    },
                },
                "engagement": {
                    "effectiveRangeKm": parse_num(rec.get("ffs_effective_range_km")),
                    "effectiveAltitudeKm": parse_num(rec.get("ffs_effective_altitude_km")),
                },
            },
            "interceptor": {
                "primaryMunitionCode": munition_code or None,
                "reloadTimeMinPerMissile": parse_num(rec.get("reload_min_per_missile")),
                "weaponSetupTimeSec": parse_num(rec.get("weapon_setup_time_sec")),
                "weaponLaunchDelaySec": parse_num(rec.get("weapon_launch_delay_sec")),
            },
            "intraSystemDistanceConstraintsM": intra_system,
        }
        if munition_code:
            system["compatibleMunitions"] = [munition_code]
        if note:
            system["note"] = note
        systems.append(system)

    return {
        "meta": {
            "version": "1.0",
            "generatedFrom": "air_defense_master.xlsx",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "units": {
                "distance": "km",
                "altitude": "km",
                "angle": "deg",
                "componentSpacing": "m",
                "count": "count",
                "time": "min",
                "probability": "0-1",
            },
        },
        "systems": systems,
    }


def build_munitions_json(records: list[dict[str, str]]) -> dict:
    munitions = []
    for rec in records:
        code = rec["system_code"].strip()
        munition_code = rec.get("munition_code", "").strip()
        if not munition_code:
            continue

        munition = {
            "code": munition_code,
            "name": rec.get("munition_name", "").strip() or munition_code,
            "systemCode": code,
            "illReq": int(parse_num(rec.get("munition_ill_req")) or 0),
            "kinematics": {
                "speedMps": parse_num(rec.get("munition_speed_mps")),
            },
            "effectiveness": {
                "pSuccess": parse_num(rec.get("munition_p_success")),
            },
            "engagementEnvelope": {
                "minRangeKm": parse_num(rec.get("munition_min_range_km")),
                "maxRangeKm": parse_num(rec.get("munition_max_range_km")),
                "maxEffRangeKm": parse_num(rec.get("munition_max_eff_range_km"))
                or (
                    round(float(parse_num(rec.get("munition_max_range_km"))) * 0.8, 3)
                    if parse_num(rec.get("munition_max_range_km")) is not None
                    else None
                ),
                "minAltitudeKm": parse_num(rec.get("munition_min_altitude_km")),
                "maxAltitudeKm": parse_num(rec.get("munition_max_altitude_km")),
            },
        }
        munitions.append(munition)

    return {
        "meta": {
            "version": "1.0",
            "generatedFrom": "air_defense_master.xlsx",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "units": {
                "distance": "km",
                "altitude": "km",
                "speed": "m/s",
            },
        },
        "munitions": munitions,
    }


def build_deployment_json(records: list[dict[str, str]]) -> dict:
    criteria = []
    for rec in records:
        code = rec["system_code"].strip()
        role = rec.get("defense_role", "").strip()
        note = rec.get("note", "").strip()
        pair_constraints = [
            {
                "pair": "Radar-KKM",
                "min": parse_num(rec.get("dist_radar_kkm_min_m")),
                "max": parse_num(rec.get("dist_radar_kkm_max_m")),
            },
            {
                "pair": "KKM-FFS",
                "min": parse_num(rec.get("dist_kkm_ffs_min_m")),
                "max": parse_num(rec.get("dist_kkm_ffs_max_m")),
            },
            {
                "pair": "Radar-FFS",
                "min": parse_num(rec.get("dist_radar_ffs_min_m")),
                "max": parse_num(rec.get("dist_radar_ffs_max_m")),
            },
            {
                "pair": "Radar-AKR",
                "min": parse_num(rec.get("dist_radar_akr_min_m")),
                "max": parse_num(rec.get("dist_radar_akr_max_m")),
            },
            {
                "pair": "KKM-AKR",
                "min": parse_num(rec.get("dist_kkm_akr_min_m")),
                "max": parse_num(rec.get("dist_kkm_akr_max_m")),
            },
            {
                "pair": "AKR-FFS",
                "min": parse_num(rec.get("dist_akr_ffs_min_m")),
                "max": parse_num(rec.get("dist_akr_ffs_max_m")),
            },
            {
                "pair": "FFS-FFS",
                "min": parse_num(rec.get("dist_ffs_ffs_min_m")),
                "max": parse_num(rec.get("dist_ffs_ffs_max_m")),
            },
        ]
        optional_pairs = [
            ("Radar-EO", rec.get("dist_radar_eo_min_m"), rec.get("dist_radar_eo_max_m")),
            ("KKM-EO", rec.get("dist_kkm_eo_min_m"), rec.get("dist_kkm_eo_max_m")),
            ("EO-FFS", rec.get("dist_eo_ffs_min_m"), rec.get("dist_eo_ffs_max_m")),
        ]
        for pair_name, min_value, max_value in optional_pairs:
            min_num = parse_num(min_value)
            max_num = parse_num(max_value)
            if min_num is None and max_num is None:
                continue
            pair_constraints.append(
                {
                    "pair": pair_name,
                    "min": min_num,
                    "max": max_num,
                }
            )

        item = {
            "systemCode": code,
            "defenseRole": role,
            "minimumSuggestedSystemCount": parse_num(rec.get("recommended_system_count")),
            "distanceFromProtectedCenterKm": {
                "min": parse_num(rec.get("defended_center_min_km")),
                "max": parse_num(rec.get("defended_center_max_km")),
            },
            "pairDistanceConstraintsM": pair_constraints,
        }
        if note:
            item["note"] = note
        criteria.append(item)

    return {
        "meta": {
            "version": "1.0",
            "generatedFrom": "air_defense_master.xlsx",
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "units": {
                "distanceFromProtectedCenter": "km",
                "componentSpacing": "m",
                "systemCount": "count",
            },
        },
        "deploymentCriteria": criteria,
    }


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    default_xlsx = script_dir.parent / "air_defense_master.xlsx"
    default_systems = script_dir.parent / "air_defense_systems.json"
    default_deployment = script_dir.parent / "air_defense_deployment_criteria.json"
    default_munitions = script_dir.parent / "air_defense_munitions.json"

    parser = argparse.ArgumentParser(description="Convert air_defense_master.xlsx into JSON files.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--radar-rcs-only", action="store_true",
                      help="Update only radar minimum/maximum RCS (square metres) in existing systems JSON")
    mode.add_argument("--ffs-heights-only", action="store_true",
                      help="Update only FFS height above ground (metres) in the existing systems JSON")
    mode.add_argument("--radar-heights-only", action="store_true",
                      help="Update only radar height above ground (metres) in the existing systems JSON")
    mode.add_argument("--los-only", action="store_true",
                      help="Update only boolean LOS fields in the existing systems JSON")
    mode.add_argument("--costs-only", action="store_true",
                        help="Update only USD costs in the existing munitions JSON from munition_costs")
    parser.add_argument("--xlsx", type=Path, default=default_xlsx, help="Master Excel file path")
    parser.add_argument("--systems-json", type=Path, default=default_systems, help="Output systems JSON path")
    parser.add_argument(
        "--deployment-json",
        type=Path,
        default=default_deployment,
        help="Output deployment criteria JSON path",
    )
    parser.add_argument(
        "--munitions-json",
        type=Path,
        default=default_munitions,
        help="Output munitions JSON path",
    )
    args = parser.parse_args()

    if not args.xlsx.exists():
        raise FileNotFoundError(f"Excel file not found: {args.xlsx}")

    if args.costs_only:
        root = json.loads(args.munitions_json.read_text(encoding="utf-8"))
        apply_munition_costs(root, args.xlsx)
        args.munitions_json.write_text(json.dumps(root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated USD costs: {args.munitions_json}")
        return

    rows = read_sheet_rows(args.xlsx)
    records = normalize_records(rows)
    if not records:
        raise ValueError("No valid system rows found in master sheet")

    if args.radar_rcs_only:
        root = json.loads(args.systems_json.read_text(encoding="utf-8"))
        apply_radar_rcs(root, records)
        apply_radar_rcs(root, records, "akr")
        args.systems_json.write_text(json.dumps(root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated radar RCS bounds: {args.systems_json}")
        return

    if args.ffs_heights_only:
        root = json.loads(args.systems_json.read_text(encoding="utf-8"))
        apply_ffs_heights(root, records)
        args.systems_json.write_text(json.dumps(root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated FFS heights: {args.systems_json}")
        return

    if args.radar_heights_only:
        root = json.loads(args.systems_json.read_text(encoding="utf-8"))
        apply_radar_heights(root, records)
        args.systems_json.write_text(json.dumps(root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated radar heights: {args.systems_json}")
        return

    if args.los_only:
        root = json.loads(args.systems_json.read_text(encoding="utf-8"))
        apply_system_los(root, records)
        args.systems_json.write_text(json.dumps(root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Updated LOS fields: {args.systems_json}")
        return

    systems_root = build_systems_json(records)
    apply_system_los(systems_root, records)
    apply_radar_heights(systems_root, records)
    apply_ffs_heights(systems_root, records)
    apply_radar_rcs(systems_root, records)
    apply_radar_rcs(systems_root, records, "akr")
    deployment_root = build_deployment_json(records)
    munitions_root = build_munitions_json(records)
    apply_munition_costs(munitions_root, args.xlsx)

    args.systems_json.write_text(json.dumps(systems_root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.deployment_json.write_text(
        json.dumps(deployment_root, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    args.munitions_json.write_text(json.dumps(munitions_root, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote: {args.systems_json}")
    print(f"Wrote: {args.deployment_json}")
    print(f"Wrote: {args.munitions_json}")
    print(f"Systems converted: {len(records)}")


if __name__ == "__main__":
    main()
