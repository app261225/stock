// Database.js: SQLite init, migration, FTS5 for stock_logs, triggers
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;
let dbPromise = null;
const DB_NAME = 'stockapp.db';

// Initialize database using async API (expo-sqlite v16+)
async function initDb() {
	if (Platform.OS === 'web') {
		throw new Error('[SQLite] expo-sqlite is not supported on web. Run on Android/iOS device or emulator.');
	}

	if (typeof SQLite.openDatabaseAsync !== 'function') {
		throw new Error('[SQLite] openDatabaseAsync is not a function. Check expo-sqlite installation.');
	}

	if (!db) {
		db = await SQLite.openDatabaseAsync(DB_NAME);
		await db.execAsync(`PRAGMA foreign_keys = ON;`);
	}
	return db;
}

export async function getDb() {
	if (!db) {
		if (!dbPromise) {
			dbPromise = initDb();
		}
		db = await dbPromise;
	}
	return db;
}

export async function runTx(fn) {
	const database = await getDb();
	// Wrapper untuk transaction-like behavior dengan callback API
	return await fn({
		executeSql: async (sql, params = []) => {
			return await database.runAsync(sql, params);
		}
	});
}

export async function migrate() {
	try {
		const database = await getDb();
		if (!database) {
			throw new Error('[SQLite] Database instance is null');
		}
		// Execute all schema statements with execAsync (supports multiple statements)
		const schemaStatements = `
			CREATE TABLE IF NOT EXISTS stock_logs (
				id TEXT PRIMARY KEY NOT NULL,
				product_id TEXT NOT NULL,
				user_id TEXT,
				type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
				quantity INTEGER NOT NULL,
				stock_before INTEGER NOT NULL,
				stock_after INTEGER NOT NULL,
				notes TEXT,
				created_at TEXT NOT NULL
			);
			
			CREATE VIRTUAL TABLE IF NOT EXISTS stock_logs_fts USING fts5(
				log_id UNINDEXED,
				search_content,
				tokenize = 'unicode61 remove_diacritics 2'
			);
			
			CREATE TRIGGER IF NOT EXISTS stock_logs_ai AFTER INSERT ON stock_logs BEGIN
				INSERT INTO stock_logs_fts(log_id, search_content)
				VALUES (new.id, COALESCE(new.notes, '') || ' ' || new.type);
			END;
			
			CREATE TRIGGER IF NOT EXISTS stock_logs_au AFTER UPDATE ON stock_logs BEGIN
				UPDATE stock_logs_fts SET search_content = COALESCE(new.notes, '') || ' ' || new.type WHERE log_id = new.id;
			END;
			
			CREATE TRIGGER IF NOT EXISTS stock_logs_ad AFTER DELETE ON stock_logs BEGIN
				DELETE FROM stock_logs_fts WHERE log_id = old.id;
			END;
			
			CREATE INDEX IF NOT EXISTS idx_logs_product ON stock_logs(product_id);
			CREATE INDEX IF NOT EXISTS idx_logs_created ON stock_logs(created_at DESC);
			CREATE INDEX IF NOT EXISTS idx_logs_type ON stock_logs(type);
		`;
		
		await database.execAsync(schemaStatements);
		console.log('[SQLite] Database migration completed successfully');
	} catch (error) {
		console.error('[SQLite] Migration error:', error);
		throw error;
	}
}
