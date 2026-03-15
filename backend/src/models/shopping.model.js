const { supabase } = require('../config/db');

const LIST_TABLE = 'shopping_lists';
const ITEM_TABLE = 'shopping_items';

function listToApp(row, items = []) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    title: row.title,
    items: items.map(itemToApp),
    status: row.status,
    reminderTime: row.reminder_time,
    totalCost: row.total_cost,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function itemToApp(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    listId: row.list_id,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    cost: row.cost,
    notes: row.notes,
    checked: row.checked,
  };
}

function listToDB(data) {
  const map = {};
  if (data.userId !== undefined) map.user_id = data.userId;
  if (data.title !== undefined) map.title = data.title;
  if (data.status !== undefined) map.status = data.status;
  if (data.reminderTime !== undefined) map.reminder_time = data.reminderTime;
  if (data.totalCost !== undefined) map.total_cost = data.totalCost;
  if (data.source !== undefined) map.source = data.source;
  return map;
}

async function fetchListWithItems(listRow) {
  const { data: items } = await supabase.from(ITEM_TABLE).select('*').eq('list_id', listRow.id);
  return listToApp(listRow, items || []);
}

const ShoppingList = {
  async create(data) {
    const dbData = listToDB(data);
    const { data: row, error } = await supabase.from(LIST_TABLE).insert(dbData).select().single();
    if (error) throw error;

    // Insert items if provided
    if (data.items && data.items.length) {
      const itemRows = data.items.map(item => ({
        list_id: row.id,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || '',
        cost: item.cost || 0,
        notes: item.notes || '',
        checked: item.checked || false,
      }));
      await supabase.from(ITEM_TABLE).insert(itemRows);
    }

    return fetchListWithItems(row);
  },

  async find(filter = {}, sort = {}) {
    let query = supabase.from(LIST_TABLE).select('*');
    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.status) query = query.eq('status', filter.status);
    query = query.order('created_at', { ascending: false });
    const { data: rows, error } = await query;
    if (error) throw error;
    const results = [];
    for (const row of rows) {
      results.push(await fetchListWithItems(row));
    }
    return results;
  },

  async findOne(filter) {
    let query = supabase.from(LIST_TABLE).select('*');
    if (filter._id || filter.id) query = query.eq('id', filter._id || filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: row, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!row) return null;
    return fetchListWithItems(row);
  },

  async findOneAndUpdate(filter, updates, options = {}) {
    const dbData = listToDB(updates);
    let query = supabase.from(LIST_TABLE).update(dbData);
    if (filter._id || filter.id) query = query.eq('id', filter._id || filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: row, error } = await query.select().single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!row) return null;

    // If items are provided in updates, replace them
    if (updates.items) {
      await supabase.from(ITEM_TABLE).delete().eq('list_id', row.id);
      if (updates.items.length) {
        const itemRows = updates.items.map(item => ({
          list_id: row.id,
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || '',
          cost: item.cost || 0,
          notes: item.notes || '',
          checked: item.checked || false,
        }));
        await supabase.from(ITEM_TABLE).insert(itemRows);
      }
    }

    return fetchListWithItems(row);
  },

  async findOneAndDelete(filter) {
    let query = supabase.from(LIST_TABLE).delete();
    if (filter._id || filter.id) query = query.eq('id', filter._id || filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: row, error } = await query.select().single();
    if (error && error.code !== 'PGRST116') throw error;
    return row ? listToApp(row) : null;
  },

  // Toggle a specific item's checked status
  async toggleItem(listId, itemId) {
    const { data: item, error: fetchErr } = await supabase.from(ITEM_TABLE).select('*').eq('id', itemId).eq('list_id', listId).single();
    if (fetchErr) throw fetchErr;
    if (!item) return null;
    const { error } = await supabase.from(ITEM_TABLE).update({ checked: !item.checked }).eq('id', itemId);
    if (error) throw error;
    // Return the full list
    const { data: listRow } = await supabase.from(LIST_TABLE).select('*').eq('id', listId).single();
    return fetchListWithItems(listRow);
  },
};

module.exports = ShoppingList;
