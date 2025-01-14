import express from "express";
import { createServer } from "http";
import axios from "axios";
import sqlite3 from "sqlite3";

const app = express();
const db = new sqlite3.Database("/data/parken.sqlite3");

const API_URL =
  "https://api.mobidata-bw.de/park-api/api/public/v3/parking-sites";
const IDS = [
  390, // DHBW Karlsruhe
];

app.use("/api", express.json());

app.get("/data/:id", async (req, res) => {
  const { id } = req.params;
  const { start, end } = req.query;

  if (isNaN(Number(id))) {
    res.status(400).send("Invalid ID");
    return;
  } else if (!IDS.includes(Number(id))) {
    res.status(400).send("ID not found");
    return;
  }

  if (start && isNaN(Number(start))) {
    res.status(400).send("Invalid start");
    return;
  }

  if (end && isNaN(Number(end))) {
    res.status(400).send("Invalid end");
    return;
  }

  let sql = `SELECT * FROM parkplatz_daten WHERE id = ?`;

  if (start) {
    sql += ` AND updated_at >= ?`;
  }

  if (end) {
    sql += ` AND updated_at <= ?`;
  }

  sql += ` ORDER BY updated_at ASC LIMIT 100`;

  const params = [id];

  if (start) {
    params.push(Number(start));
  }

  if (end) {
    params.push(Number(end));
  }

  const data = await run(sql, params);

  const meta = await run(`SELECT * FROM parkplatz_meta WHERE id = ?`, [id]);

  res.json({ data, meta });
});

app.use("/", express.static("../client"));

const server = createServer(app);

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

async function run(sql: string, params: any[] = []) {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

async function setupDatabase() {
  await run(
    `CREATE TABLE IF NOT EXISTS parkplatz_daten (
      id INTEGER,
      updated_at INTEGER,
      free_capacity INTEGER,
      PRIMARY KEY (id, updated_at)
    )`
  );

  await run(`CREATE TABLE IF NOT EXISTS parkplatz_meta (
    id INTEGER PRIMARY KEY,
    name TEXT
  )`);

  for (const id of IDS) {
    await run(`INSERT OR IGNORE INTO parkplatz_meta (id, name) VALUES (?, ?)`, [
      id,
      `Parkplatz ${id}`,
    ]);
  }
}

async function getData() {
  const { data } = await axios.get(API_URL);

  for (const id of IDS) {
    const site = data.items.find((site) => site.id === id);

    if (!site) {
      console.log("Site not found");
      continue;
    }

    const { realtime_data_updated_at, realtime_free_capacity, name } = site;

    const realtime_data_updated_at_unix = new Date(
      realtime_data_updated_at
    ).getTime();

    await run(
      `INSERT OR IGNORE INTO parkplatz_daten (id, updated_at, free_capacity) VALUES (?, ?, ?)`,
      [id, realtime_data_updated_at_unix, realtime_free_capacity]
    );

    await run(`UPDATE parkplatz_meta SET name = ? WHERE id = ?`, [name, id]);
  }
}

setupDatabase().then(() => {
  getData();

  setInterval(getData, 1000 * 60);
});
