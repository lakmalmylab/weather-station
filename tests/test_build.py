import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

import build  # noqa: E402


def write_cities(tmp_path: Path, cities: object) -> Path:
    path = tmp_path / "cities.json"
    path.write_text(json.dumps(cities), encoding="utf-8")
    return path


def test_bundled_cities_are_valid():
    cities = build.load_cities()
    assert len(cities) >= 7


@pytest.mark.parametrize(
    "lat, lon",
    [(91, 0), (-91, 0), (0, 181), (0, -181), ("1", 0), (None, 0)],
)
def test_invalid_coordinates_rejected(tmp_path, lat, lon):
    path = write_cities(tmp_path, [{"name": "X", "country": "Y", "lat": lat, "lon": lon}])
    with pytest.raises(ValueError):
        build.load_cities(path)


def test_empty_and_missing_fields_rejected(tmp_path):
    with pytest.raises(ValueError):
        build.load_cities(write_cities(tmp_path, []))
    with pytest.raises(ValueError):
        build.load_cities(write_cities(tmp_path, [{"name": "X", "lat": 1, "lon": 1}]))


def test_build_outputs_files(tmp_path):
    dist = build.build(dist=tmp_path / "dist")
    for name in ("index.html", "styles.css", "app.js", "staticwebapp.config.json"):
        assert (dist / name).is_file()
    assert "{{" not in (dist / "index.html").read_text(encoding="utf-8")


def test_options_are_escaped():
    out = build.render_options([{"name": "<b>", "country": "A&B", "lat": 0, "lon": 0}])
    assert "<b>" not in out
    assert "&lt;b&gt;" in out and "A&amp;B" in out


def test_build_id_from_sha(monkeypatch):
    monkeypatch.setenv("GITHUB_SHA", "abcdef1234567")
    assert build.build_id() == "abcdef1"
