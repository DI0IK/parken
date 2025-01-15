import express from "express";
import { createServer } from "http";
import axios from "axios";
import { parseIDs } from "./helper";
import Database from "./db";
import apiRouter from "./api";

const app = express();
const db = Database.getInstance();

const API_URL =
  "https://api.mobidata-bw.de/park-api/api/public/v3/parking-sites";
const IDS = parseIDs(process.env.PARKING_IDS || "");

app.use("/api", express.json());
app.use("/api", apiRouter);

app.use("/", express.static("/app/client"));

const server = createServer(app);

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});

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

    await db.run(
      `INSERT OR IGNORE INTO parkplatz_daten (id, updated_at, free_capacity) VALUES (?, ?, ?)`,
      [id, realtime_data_updated_at_unix, realtime_free_capacity]
    );

    await db.run(`UPDATE parkplatz_meta SET name = ? WHERE id = ?`, [name, id]);
  }
}

db.setupDatabase().then(() => {
  getData();

  setInterval(getData, 1000 * 60);
});
