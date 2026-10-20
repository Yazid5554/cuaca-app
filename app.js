const express = require("express");
const app = express();
const PORT = 3000;

// Kode cuaca dari Open-Meteo -> teks bahasa Indonesia
const kodeCuaca = {
  0: "Cerah", 1: "Cerah berawan", 2: "Berawan sebagian", 3: "Mendung",
  45: "Berkabut", 48: "Berkabut tebal",
  51: "Gerimis ringan", 53: "Gerimis", 55: "Gerimis lebat",
  61: "Hujan ringan", 63: "Hujan", 65: "Hujan lebat",
  80: "Hujan lokal ringan", 81: "Hujan lokal", 82: "Hujan lokal lebat",
  95: "Badai petir", 96: "Badai petir + es", 99: "Badai petir lebat",
};

// Endpoint API kita: /api/cuaca?kota=Jakarta
app.get("/api/cuaca", async (req, res) => {
  const kota = req.query.kota;
  if (!kota) return res.status(400).json({ error: "Nama kota wajib diisi" });

  try {
    // 1. Cari koordinat kota (geocoding)
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(kota)}&count=1&language=id`
    );
    const geo = await geoRes.json();
    if (!geo.results || geo.results.length === 0) {
      return res.status(404).json({ error: "Kota tidak ditemukan" });
    }
    const { name, country, latitude, longitude } = geo.results[0];

    // 2. Ambil data cuaca berdasarkan koordinat
    const cuacaRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
    );
    const data = await cuacaRes.json();
    const c = data.current;

    res.json({
      kota: name,
      negara: country,
      suhu: c.temperature_2m,
      kelembapan: c.relative_humidity_2m,
      angin: c.wind_speed_10m,
      kondisi: kodeCuaca[c.weather_code] || "Tidak diketahui",
    });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data cuaca" });
  }
});

// Halaman web (tampilan)
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aplikasi Cuaca</title>
  <style>
    body { font-family: Arial, sans-serif; background: #e8f1fb; display: flex;
           justify-content: center; padding-top: 60px; margin: 0; }
    .card { background: white; padding: 28px; border-radius: 14px; width: 320px;
            box-shadow: 0 4px 16px rgba(0,0,0,.1); text-align: center; }
    input { padding: 10px; width: 62%; border: 1px solid #ccc; border-radius: 8px; }
    button { padding: 10px 14px; border: 0; background: #2f7de1; color: white;
             border-radius: 8px; cursor: pointer; }
    #hasil { margin-top: 20px; line-height: 1.8; }
    .suhu { font-size: 48px; font-weight: bold; }
    .error { color: #c0392b; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Cek Cuaca</h2>
    <input id="kota" placeholder="Contoh: Jakarta" />
    <button onclick="cari()">Cari</button>
    <div id="hasil"></div>
  </div>

  <script>
    async function cari() {
      const kota = document.getElementById("kota").value.trim();
      const hasil = document.getElementById("hasil");
      if (!kota) return;
      hasil.textContent = "Loading...";

      const res = await fetch("/api/cuaca?kota=" + encodeURIComponent(kota));
      const d = await res.json();

      if (d.error) {
        hasil.innerHTML = '<span class="error">' + d.error + "</span>";
        return;
      }
      hasil.innerHTML =
        "<b>" + d.kota + ", " + d.negara + "</b>" +
        '<div class="suhu">' + d.suhu + "°C</div>" +
        d.kondisi + "<br>Kelembapan: " + d.kelembapan + "%" +
        "<br>Angin: " + d.angin + " km/jam";
    }
    document.getElementById("kota").addEventListener("keydown", e => {
      if (e.key === "Enter") cari();
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log("Server jalan di http://localhost:" + PORT);
});
