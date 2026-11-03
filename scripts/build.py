"""Render src/ and data/ into dist/."""

from __future__ import annotations

import html
import json
import os
import shutil
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = ROOT / "data" / "cities.json"
DIST = ROOT / "dist"
SITE_TITLE = "Weather Station"
STATIC_FILES = ["styles.css", "app.js"]
REQUIRED_FIELDS = ("name", "country", "lat", "lon")


def _is_number(value: object) -> bool:
    return isinstance(value, int | float) and not isinstance(value, bool)


def load_cities(path: Path = DATA) -> list[dict]:
    """Load and validate the station list, raising ValueError on bad data."""
    cities = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(cities, list) or not cities:
        raise ValueError("cities.json must be a non-empty list")
    for i, city in enumerate(cities):
        if not isinstance(city, dict):
            raise ValueError(f"city #{i} must be an object")
        for field in REQUIRED_FIELDS:
            if field not in city:
                raise ValueError(f"city #{i} is missing '{field}'")
        for field in ("name", "country"):
            if not isinstance(city[field], str) or not city[field].strip():
                raise ValueError(f"city #{i} has an invalid '{field}'")
        if not _is_number(city["lat"]) or not -90 <= city["lat"] <= 90:
            raise ValueError(f"city '{city['name']}' has invalid lat: {city['lat']!r}")
        if not _is_number(city["lon"]) or not -180 <= city["lon"] <= 180:
            raise ValueError(f"city '{city['name']}' has invalid lon: {city['lon']!r}")
    return cities


def build_id() -> str:
    sha = os.environ.get("GITHUB_SHA", "").strip()
    if sha:
        return sha[:7]
    return datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def render_options(cities: list[dict]) -> str:
    return "\n".join(
        f'<option value="{i}">{html.escape(c["name"])}, {html.escape(c["country"])}</option>'
        for i, c in enumerate(cities)
    )


def render_index(template: str, cities: list[dict]) -> str:
    # "<" is escaped so the JSON can never close a <script> tag early.
    cities_json = json.dumps(cities, ensure_ascii=False).replace("<", "\\u003c")
    values = {
        "site_title": html.escape(SITE_TITLE),
        "build_id": html.escape(build_id()),
        "city_options": render_options(cities),
        "cities_json": cities_json,
    }
    for key, value in values.items():
        template = template.replace("{{ " + key + " }}", value)
    return template


def build(dist: Path = DIST, cities_path: Path = DATA) -> Path:
    cities = load_cities(cities_path)
    if dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True)
    template = (SRC / "index.html").read_text(encoding="utf-8")
    (dist / "index.html").write_text(render_index(template, cities), encoding="utf-8")
    for name in STATIC_FILES:
        shutil.copy2(SRC / name, dist / name)
    shutil.copy2(ROOT / "staticwebapp.config.json", dist / "staticwebapp.config.json")
    return dist


if __name__ == "__main__":
    out = build()
    print(f"Built {out} (build {build_id()})")
