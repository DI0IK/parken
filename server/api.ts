import { Router } from "express";
import Database from "./db";
import { parseIDs } from "./helper";

const router = Router();
const db = Database.getInstance();
const IDS = parseIDs(process.env.PARKING_IDS || "");

router.get("/garages", async (req, res) => {
  const garages = await db.all(`SELECT id, name FROM parkplatz_meta`);
  res.json(garages);
});

router.get("/data/:id", async (req, res) => {
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

  let sql = `SELECT updated_at, free_capacity FROM parkplatz_daten WHERE id = ?`;

  if (start) {
    sql += ` AND updated_at >= ?`;
  }

  if (end) {
    sql += ` AND updated_at <= ?`;
  }

  sql += ` ORDER BY updated_at ASC LIMIT 1000`;

  const params = [Number(id)] as number[];

  if (start) {
    params.push(Number(start));
  }

  if (end) {
    params.push(Number(end));
  }

  const data = await db.all(sql, params);

  const meta = await db.get(
    `SELECT name, capacity FROM parkplatz_meta WHERE id = ?`,
    [id]
  );

  res.json({ data, meta });
});

export default router;
