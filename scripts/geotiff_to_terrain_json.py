#!/usr/bin/env python3
"""Convert a GeoTIFF elevation raster into the terrain JSON used by the web UI."""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
from pathlib import Path


METERS_PER_DEG_LAT = 111_320.0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_tif", type=Path, help="Source GeoTIFF/DTED-derived TIFF file")
    parser.add_argument("output_json", type=Path, help="Output terrain JSON path")
    parser.add_argument("--max-width", type=int, default=1200, help="Maximum output grid width")
    parser.add_argument("--max-height", type=int, default=600, help="Maximum output grid height")
    parser.add_argument("--name", default="", help="Terrain display name")
    parser.add_argument("--gdalinfo", default="gdalinfo", help="gdalinfo executable")
    parser.add_argument("--gdal-translate", default="gdal_translate", help="gdal_translate executable")
    return parser.parse_args()


def run_json(command: list[str]) -> dict:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def choose_grid_size(src_width: int, src_height: int, max_width: int, max_height: int) -> tuple[int, int]:
    if src_width <= 0 or src_height <= 0:
        raise ValueError("Invalid source raster size")
    scale = min(max_width / src_width, max_height / src_height, 1.0)
    width = max(2, int(round(src_width * scale)))
    height = max(2, int(round(src_height * scale)))
    return width, height


def lon_to_x(lon: float, center_lon: float, center_lat: float) -> float:
    return (lon - center_lon) * METERS_PER_DEG_LAT * math.cos(math.radians(center_lat))


def lat_to_y(lat: float, center_lat: float) -> float:
    return (lat - center_lat) * METERS_PER_DEG_LAT


def read_xyz_grid(path: Path, width: int, height: int, center_lon: float, center_lat: float) -> list[list[float]]:
    rows: list[list[float]] = []
    current: list[float] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            parts = line.strip().split()
            if len(parts) < 3:
                continue
            try:
                elevation = float(parts[2])
            except ValueError:
                elevation = 0.0
            if not math.isfinite(elevation):
                elevation = 0.0
            current.append(round(elevation, 2))
            if len(current) == width:
                rows.append(current)
                current = []
    if current:
        rows.append(current)
    if len(rows) != height or any(len(row) != width for row in rows):
        raise ValueError(f"Unexpected XYZ shape: expected {width}x{height}, got {width}x{len(rows)}")
    return rows


def build_terrain(info: dict, xyz_path: Path, width: int, height: int, name: str, source: Path) -> dict:
    corners = info.get("cornerCoordinates") or {}
    upper_left = corners.get("upperLeft")
    lower_right = corners.get("lowerRight")
    center = corners.get("center")
    if not upper_left or not lower_right or not center:
        raise ValueError("GeoTIFF corner coordinates are missing")

    west_lon, north_lat = float(upper_left[0]), float(upper_left[1])
    east_lon, south_lat = float(lower_right[0]), float(lower_right[1])
    center_lon, center_lat = float(center[0]), float(center[1])

    x_min = lon_to_x(west_lon, center_lon, center_lat)
    x_max = lon_to_x(east_lon, center_lon, center_lat)
    y_min = lat_to_y(south_lat, center_lat)
    y_max = lat_to_y(north_lat, center_lat)
    cell_size_x = (x_max - x_min) / max(1, width - 1)
    cell_size_y = (y_max - y_min) / max(1, height - 1)
    elevations = read_xyz_grid(xyz_path, width, height, center_lon, center_lat)

    flat = [value for row in elevations for value in row]
    band = (info.get("bands") or [{}])[0]
    epsg = ((info.get("stac") or {}).get("proj:epsg") or None)

    return {
        "type": "dted-grid",
        "name": name or source.stem,
        "source": source.name,
        "crs": {
            "epsg": epsg,
            "name": "WGS 84" if epsg == 4326 else "",
        },
        "geo": {
            "center": {"lat": center_lat, "lon": center_lon},
            "bounds": {
                "westLon": west_lon,
                "eastLon": east_lon,
                "southLat": south_lat,
                "northLat": north_lat,
            },
            "sourceRaster": {
                "width": int((info.get("size") or [0, 0])[0]),
                "height": int((info.get("size") or [0, 0])[1]),
                "bandType": str(band.get("type") or ""),
            },
        },
        "origin": {"x": round(x_min, 2), "y": round(y_min, 2), "lat": center_lat, "lon": center_lon},
        "xMin": round(x_min, 2),
        "xMax": round(x_max, 2),
        "yMin": round(y_min, 2),
        "yMax": round(y_max, 2),
        "width": width,
        "height": height,
        "cellSizeMeters": round((cell_size_x + cell_size_y) / 2, 2),
        "cellSizeXMeters": round(cell_size_x, 2),
        "cellSizeYMeters": round(cell_size_y, 2),
        "rowsNorthToSouth": True,
        "minElevationM": round(min(flat), 2),
        "maxElevationM": round(max(flat), 2),
        "elevations": elevations,
    }


def main() -> None:
    args = parse_args()
    info = run_json([args.gdalinfo, "-json", str(args.input_tif)])
    src_width, src_height = [int(value) for value in info["size"]]
    width, height = choose_grid_size(src_width, src_height, args.max_width, args.max_height)

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="terrain_xyz_") as tmpdir:
        xyz_path = Path(tmpdir) / "terrain.xyz"
        run([
            args.gdal_translate,
            "-q",
            "-of",
            "XYZ",
            "-r",
            "average",
            "-outsize",
            str(width),
            str(height),
            str(args.input_tif),
            str(xyz_path),
        ])
        terrain = build_terrain(info, xyz_path, width, height, args.name, args.input_tif)

    args.output_json.write_text(json.dumps(terrain, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Wrote {args.output_json} | {terrain['width']}x{terrain['height']} | "
        f"{terrain['minElevationM']}..{terrain['maxElevationM']} m"
    )


if __name__ == "__main__":
    main()
