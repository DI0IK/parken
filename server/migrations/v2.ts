import { parseIDs } from "../helper";
import Database from "../db";

export async function upgradeToVersion2(db: Database) {
  await db.run(`ALTER TABLE parkplatz_meta ADD COLUMN capacity INTEGER`);

  const IDS = parseIDs(process.env.PARKING_IDS || "");
  for (const id of IDS) {
    await db.run(`UPDATE parkplatz_meta SET capacity = ? WHERE id = ?`, [
      0,
      id,
    ]);
  }

  await db.run(`UPDATE db_version SET version = 2`);
}
