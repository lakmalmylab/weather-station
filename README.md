# Weather Station

A small static website showing live weather for a list of stations (cities):
current temperature, conditions, humidity, wind, pressure, "feels like", a 24-hour
temperature chart (inline SVG), a °C/°F toggle and a 10-minute auto-refresh. Data comes
straight from the browser to the free [Open-Meteo](https://open-meteo.com/) API (no key).
Python renders the page into `dist/`, which is deployed to Azure Static Web Apps.

## Layout

```
data/cities.json           stations: name, country, lat, lon
scripts/build.py           validates data, renders src/ + data/ into dist/
src/index.html             template with {{ placeholders }}
src/styles.css, app.js     plain CSS / JavaScript, no frameworks
tests/test_build.py        pytest suite
staticwebapp.config.json   routing fallback, security headers, CSP
ruff.toml, requirements-dev.txt
```

Add a station by editing `data/cities.json`; the build fails with `ValueError` on bad entries.

## Run locally

Requires Python 3.12+.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check .
pytest
python scripts/build.py
python -m http.server 8000 --directory dist
```

Then open <http://localhost:8000>. The build id is the first 7 characters of
`GITHUB_SHA` when set, otherwise a timestamp.
