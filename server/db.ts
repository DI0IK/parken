import sqlite3 from "sqlite3";
import { upgradeToVersion1 } from "./migrations/v1";
import { upgradeToVersion2 } from "./migrations/v2";

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
      `CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
      )`
    );

    const versionRow = await this.get(`SELECT version FROM db_version`);
    const currentVersion = versionRow ? versionRow.version : 0;

    if (currentVersion < 1) {
      await upgradeToVersion1(this);
    }

    if (currentVersion < 2) {
      await upgradeToVersion2(this);
    }

    // Future upgrades can be handled here
    // if (currentVersion < 3) {
    //   await upgradeToVersion3(this);
    // }
  }
}

export default Database;
