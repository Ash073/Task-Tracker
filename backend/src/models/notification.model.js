const { supabase } = require('../config/db');

const TABLE = 'notification_logs';

function toApp(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    type: row.type,
    title: row.title,
    body: row.body,
    quote: row.quote,
    link: row.link,
    sentAt: row.sent_at,
    delivered: row.delivered,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const NotificationLog = {
  async create(data) {
    const dbData = {
      user_id: data.userId,
      task_id: data.taskId || null,
      type: data.type,
      title: data.title,
      body: data.body,
      quote: data.quote || '',
      link: data.link || '',
      delivered: data.delivered || false,
    };
    const { data: row, error } = await supabase.from(TABLE).insert(dbData).select().single();
    if (error) throw error;
    return toApp(row);
  },

  async find(filter = {}, options = {}) {
    let query = supabase.from(TABLE).select('*');
    if (filter.userId) query = query.eq('user_id', filter.userId);
    query = query.order('sent_at', { ascending: false });
    if (options.limit) query = query.limit(options.limit);
    const { data: rows, error } = await query;
    if (error) throw error;
    return rows.map(toApp);
  },

  async findByIdAndUpdate(id, updates) {
    const dbData = {};
    if (updates.delivered !== undefined) dbData.delivered = updates.delivered;
    const { data: row, error } = await supabase.from(TABLE).update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return toApp(row);
  },
};

module.exports = NotificationLog;
