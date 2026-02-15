// Simple event emitter (mitt-style, no dependency)
const listeners = new Set();
const emitter = {
	emit: (event, payload) => {
		if (event === 'change') listeners.forEach(fn => fn(payload));
	},
	on: (event, fn) => {
		if (event === 'change') listeners.add(fn);
	},
	off: (event, fn) => {
		if (event === 'change') listeners.delete(fn);
	}
};

// StockLogDAO: Offline-first, FTS, CRUD, batch, getByProduct, getRecent
import { getDb, runTx } from './Database';

const FTS_TABLE = 'stock_logs_fts';

const StockLogDAO = {
	async insert(log) {
		const result = await runTx(async tx => {
			await tx.executeSql(
				`INSERT OR REPLACE INTO stock_logs (id, product_id, user_id, type, quantity, stock_before, stock_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
				[log.id, log.product_id, log.user_id, log.type, log.quantity, log.stock_before, log.stock_after, log.notes, log.created_at]
			);
		});
		emitter.emit('change', { type: 'insert', log });
		return result;
	},

	async batchInsert(logs) {
		const result = await runTx(async tx => {
			for (const log of logs) {
				await tx.executeSql(
					`INSERT OR REPLACE INTO stock_logs (id, product_id, user_id, type, quantity, stock_before, stock_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
					[log.id, log.product_id, log.user_id, log.type, log.quantity, log.stock_before, log.stock_after, log.notes, log.created_at]
				);
			}
		});
		emitter.emit('change', { type: 'batchInsert', logs });
		return result;
	},

	async getByProduct(productId, limit = 50) {
		const db = await getDb();
		try {
			const result = await db.getAllAsync(
				`SELECT * FROM stock_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT ?;`,
				[productId, limit]
			);
			return result;
		} catch (err) {
			console.error('getByProduct error:', err);
			return [];
		}
	},

	async getRecent(limit = 50) {
		const db = await getDb();
		try {
			const result = await db.getAllAsync(
				`SELECT * FROM stock_logs ORDER BY created_at DESC LIMIT ?;`,
				[limit]
			);
			return result;
		} catch (err) {
			console.error('getRecent error:', err);
			return [];
		}
	},

	async searchFTS(query, limit = 50) {
		const db = await getDb();
		try {
			const result = await db.getAllAsync(
				`SELECT l.* FROM stock_logs l INNER JOIN ${FTS_TABLE} fts ON l.id = fts.log_id WHERE fts.search_content MATCH ? ORDER BY l.created_at DESC LIMIT ?;`,
				[query + '*', limit]
			);
			return result;
		} catch (err) {
			console.error('searchFTS error:', err);
			return [];
		}
	},

	async delete(id) {
		const result = await runTx(async tx => {
			await tx.executeSql(`DELETE FROM stock_logs WHERE id = ?;`, [id]);
		});
		emitter.emit('change', { type: 'delete', id });
		return result;
	},

	onChange(listener) {
		emitter.on('change', listener);
		return () => emitter.off('change', listener);
	},
};

export default StockLogDAO;
