(function () {
  "use strict";

  var API = "https://api.open-meteo.com/v1/forecast";
  var REFRESH_MS = 10 * 60 * 1000;
  var cities = JSON.parse(document.getElementById("cities-data").textContent);

  var WEATHER = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    56: "Freezing drizzle", 57: "Heavy freezing drizzle", 61: "Light rain", 63: "Rain",
    65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain", 71: "Light snow",
    73: "Snow", 75: "Heavy snow", 77: "Snow grains", 80: "Light showers", 81: "Showers",
    82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail"
  };

  var $ = function (id) { return document.getElementById(id); };
  var state = { unit: "C", data: null };

  function toUnit(c) { return state.unit === "F" ? c * 9 / 5 + 32 : c; }
  function fmtTemp(c) { return Math.round(toUnit(c)) + "°" + state.unit; }

  function compass(deg) {
    var d = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return d[Math.round(deg / 22.5) % 16];
  }

  function showError(msg) {
    var el = $("error");
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function render() {
    var d = state.data;
    if (!d) { return; }
    var c = d.current;
    $("temp").textContent = fmtTemp(c.temperature_2m);
    $("desc").textContent = WEATHER[c.weather_code] || "Unknown conditions";
    $("feels").textContent = fmtTemp(c.apparent_temperature);
    $("wind").textContent = Math.round(c.wind_speed_10m) + " km/h " + compass(c.wind_direction_10m);
    $("pressure").textContent = Math.round(c.surface_pressure) + " hPa";
    $("humidity").textContent = Math.round(c.relative_humidity_2m) + "%";
    $("humidity-bar").style.width = Math.max(0, Math.min(100, c.relative_humidity_2m)) + "%";
    $("time").textContent = c.time.replace("T", " ") + " (" + (d.timezone_abbreviation || d.timezone) + ")";
    drawChart(d);
  }

  function drawChart(d) {
    var times = d.hourly.time, temps = d.hourly.temperature_2m;
    var start = Math.max(0, times.indexOf(d.current.time));
    if (start < 0 || start + 24 > times.length) { start = Math.max(0, times.length - 24); }
    var xs = times.slice(start, start + 24);
    var ys = temps.slice(start, start + 24).map(toUnit);
    if (!ys.length) { $("chart").textContent = "No hourly data."; return; }

    var W = 640, H = 240, L = 40, R = 12, T = 14, B = 28;
    var min = Math.floor(Math.min.apply(null, ys)) - 1;
    var max = Math.ceil(Math.max.apply(null, ys)) + 1;
    var x = function (i) { return L + (W - L - R) * i / Math.max(1, ys.length - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - (v - min) / (max - min)); };

    var out = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Temperature over the next 24 hours">';
    for (var g = 0; g <= 4; g++) {
      var v = min + (max - min) * g / 4, gy = y(v);
      out += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>';
      out += '<text x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + Math.round(v) + "°</text>";
    }
    var pts = ys.map(function (v, i) { return x(i).toFixed(1) + "," + y(v).toFixed(1); });
    out += '<polygon class="area" points="' + L + "," + (H - B) + " " + pts.join(" ") + " " + x(ys.length - 1) + "," + (H - B) + '"/>';
    out += '<polyline class="line" points="' + pts.join(" ") + '"/>';
    ys.forEach(function (v, i) {
      if (i % 4 === 0) {
        out += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + xs[i].slice(11, 16) + "</text>";
        out += '<circle class="dot" cx="' + x(i) + '" cy="' + y(v) + '" r="3"><title>' +
          xs[i].slice(11, 16) + " " + v.toFixed(1) + "°" + state.unit + "</title></circle>";
      }
    });
    $("chart").innerHTML = out + "</svg>";
  }

  function load() {
    var city = cities[Number($("station").value)];
    var params = new URLSearchParams({
      latitude: city.lat,
      longitude: city.lon,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m",
      hourly: "temperature_2m",
      forecast_days: 2,
      timezone: "auto"
    });
    return fetch(API + "?" + params.toString())
      .then(function (r) {
        if (!r.ok) { throw new Error("HTTP " + r.status); }
        return r.json();
      })
      .then(function (data) {
        if (!data.current || !data.hourly) { throw new Error("Unexpected response"); }
        state.data = data;
        showError("");
        render();
      })
      .catch(function () {
        showError("Sorry, we couldn't load the weather for " + city.name +
          " right now. Please check your connection; we'll try again shortly.");
      });
  }

  $("station").addEventListener("change", load);
  document.querySelectorAll(".toggle button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.unit = btn.dataset.unit;
      document.querySelectorAll(".toggle button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      render();
    });
  });

  load();
  setInterval(load, REFRESH_MS);
})();
