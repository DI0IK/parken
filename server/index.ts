import express from "express";
import { createServer } from "http";
import axios from "axios";
import { JSDOM } from "jsdom";
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
  for (const id of IDS) {
    if (id.startsWith("http")) {
      const { data } = await axios.get(id.split("|")[0], {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3",
        },
      });

      const doc = new JSDOM(data);
      const realtime_free_capacity = parseInt(
        doc.window.document.querySelector(".live-daten-container span")
          .textContent
      );
      const realtime_data_updated_at = Date.now();

      await db.run(
        `INSERT OR IGNORE INTO parkplatz_daten (id, updated_at, free_capacity) VALUES (?, ?, ?)`,
        [id.split("|")[1], realtime_data_updated_at, realtime_free_capacity]
      );
    } else {
      try {
        const { data } = await axios.get(API_URL + "/" + id, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3",
          },
        });

        const site = data;

        if (!site) {
          console.log("Site not found");
          continue;
        }

        const {
          realtime_data_updated_at,
          realtime_free_capacity,
          name,
          capacity,
        } = site;

        const realtime_data_updated_at_unix = new Date(
          realtime_data_updated_at
        ).getTime();

        console.log(
          "Updating data for",
          name,
          "with ID",
          id,
          "and capacity",
          capacity
        );

        await db.run(
          `INSERT OR IGNORE INTO parkplatz_daten (id, updated_at, free_capacity) VALUES (?, ?, ?)`,
          [id, realtime_data_updated_at_unix, realtime_free_capacity]
        );

        await db.run(
          `UPDATE parkplatz_meta SET name = ?, capacity = ? WHERE id = ?`,
          [name, capacity, id]
        );
      } catch (e) {
        console.error("Error fetching API and saving data:", e);
      }
    }
  }
}

db.setupDatabase().then(() => {
  getData();

  setInterval(getData, 1000 * 60);
});
