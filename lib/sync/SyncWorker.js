// SyncWorker.js: Realtime sync for stock_logs (Supabase <-> SQLite)
import { supabase } from '../supabase';
import StockLogDAO from '../dao/StockLogDAO';
import SyncQueueDAO from '../dao/SyncQueueDAO';
import { migrate } from '../dao/Database';

let subscription = null;

export async function startStockLogRealtimeSync() {
	await migrate();
	if (subscription) return; // already subscribed
	subscription = supabase
		.channel('public:stock_logs')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'stock_logs' }, async payload => {
			const { eventType, new: newRow, old: oldRow } = payload;
			if (eventType === 'INSERT' || eventType === 'UPDATE') {
				// Upsert to SQLite
				await StockLogDAO.insert(newRow);
			} else if (eventType === 'DELETE') {
				await StockLogDAO.delete(oldRow.id);
			}
		})
		.subscribe();
}

export async function stopStockLogRealtimeSync() {
	if (subscription) {
		await supabase.removeChannel(subscription);
		subscription = null;
	}
}

// Optionally: implement pushQueue for local->server sync
export async function pushLocalStockLogQueue() {
	const queue = await SyncQueueDAO.getAll();
	for (const item of queue) {
		if (item.type === 'stocklog_insert') {
			await supabase.from('stock_logs').upsert(item.payload);
		} else if (item.type === 'stocklog_delete') {
			await supabase.from('stock_logs').delete().eq('id', item.payload.id);
		}
		await SyncQueueDAO.remove(item.id);
	}
}
