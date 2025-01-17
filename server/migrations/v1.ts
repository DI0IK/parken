import { parseIDs } from "../helper";
import Database from "../db";

export async function upgradeToVersion1(db: Database) {
  await db.run(
    `CREATE TABLE IF NOT EXISTS parkplatz_daten (
      id INTEGER,
      updated_at INTEGER,
      free_capacity INTEGER,
      PRIMARY KEY (id, updated_at)
    )`
  );

  await db.run(`CREATE TABLE IF NOT EXISTS parkplatz_meta (
    id INTEGER PRIMARY KEY,
    name TEXT
  )`);

  const IDS = parseIDs(process.env.PARKING_IDS || "");
  for (const id of IDS) {
    await db.run(
      `INSERT OR IGNORE INTO parkplatz_meta (id, name) VALUES (?, ?)`,
      [id, `Parkplatz ${id}`]
    );
  }

  await db.run(`INSERT INTO db_version (version) VALUES (1)`);
}
