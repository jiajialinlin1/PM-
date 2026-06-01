import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

let database;

export function getDatabase() {
  if (!database) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
    database = new DatabaseSync(config.databasePath);
    database.exec('PRAGMA foreign_keys = ON');
    migrate(database);
  }

  return database;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planned',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      message TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function listFeatures() {
  return getDatabase()
    .prepare(`
      SELECT id, title, description, status, priority, created_at AS createdAt, updated_at AS updatedAt
      FROM features
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        id DESC
    `)
    .all();
}

export function createFeature({ title, description = '', priority = 'medium' }) {
  const result = getDatabase()
    .prepare(`
      INSERT INTO features (title, description, priority)
      VALUES (?, ?, ?)
    `)
    .run(title.trim(), description.trim(), priority);

  return getFeatureById(result.lastInsertRowid);
}

export function updateFeatureStatus(id, status) {
  getDatabase()
    .prepare(`
      UPDATE features
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(status, id);

  return getFeatureById(id);
}

export function getFeatureById(id) {
  return getDatabase()
    .prepare(`
      SELECT id, title, description, status, priority, created_at AS createdAt, updated_at AS updatedAt
      FROM features
      WHERE id = ?
    `)
    .get(id);
}

export function listFeedback() {
  return getDatabase()
    .prepare(`
      SELECT id, author, message, source, created_at AS createdAt
      FROM feedback
      ORDER BY id DESC
      LIMIT 25
    `)
    .all();
}

export function createFeedback({ author = 'Anonymous', message, source = 'manual' }) {
  const result = getDatabase()
    .prepare(`
      INSERT INTO feedback (author, message, source)
      VALUES (?, ?, ?)
    `)
    .run(author.trim() || 'Anonymous', message.trim(), source.trim() || 'manual');

  return getDatabase()
    .prepare(`
      SELECT id, author, message, source, created_at AS createdAt
      FROM feedback
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);
}

export function resetDemoData() {
  const db = getDatabase();
  db.exec('DELETE FROM feedback; DELETE FROM features;');
}
