import sqlite3 from "sqlite3";
import { parseIDs } from "./helper";

class Database {
  private static instance: Database;
  private db: sqlite3.Database;

  private constructor() {
    this.db = new sqlite3.Database("/data/parken.sqlite3");
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
  get(sql: string, params: any[] = []): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }

  run(sql: string, params: any[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async setupDatabase() {
    await this.run(
      `CREATE TABLE IF NOT EXISTS parkplatz_daten (
        id INTEGER,
        updated_at INTEGER,
        free_capacity INTEGER,
        PRIMARY KEY (id, updated_at)
      )`
    );

    await this.run(`CREATE TABLE IF NOT EXISTS parkplatz_meta (
      id INTEGER PRIMARY KEY,
      name TEXT
    )`);

    const IDS = parseIDs(process.env.PARKING_IDS || "");
    for (const id of IDS) {
      await this.run(
        `INSERT OR IGNORE INTO parkplatz_meta (id, name) VALUES (?, ?)`,
        [id, `Parkplatz ${id}`]
      );
    }
  }
}

export default Database;
