const { supabase } = require('../config/db');

const TABLE = 'tasks';

function toApp(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    priority: row.priority,
    category: row.category,
    goalTag: row.goal_tag,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    deadline: row.deadline,
    link: row.link,
    xpReward: row.xp_reward,
    notes: row.notes,
    status: row.status,
    completedAt: row.completed_at,
    reminder15min: row.reminder_15min,
    scheduledJobs: row.scheduled_jobs,
    source: row.source,
    adjustedFromOriginal: row.adjusted_from_original,
    originalStartTime: row.original_start_time,
    motivationQuote: row.motivation_quote,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDB(data) {
  const map = {};
  if (data.userId !== undefined) map.user_id = data.userId;
  if (data.name !== undefined) map.name = data.name;
  if (data.priority !== undefined) map.priority = data.priority;
  if (data.category !== undefined) map.category = data.category;
  if (data.goalTag !== undefined) map.goal_tag = data.goalTag;
  if (data.startTime !== undefined) map.start_time = data.startTime instanceof Date ? data.startTime.toISOString() : data.startTime;
  if (data.endTime !== undefined) map.end_time = data.endTime instanceof Date ? data.endTime.toISOString() : data.endTime; 
  if (data.duration !== undefined) map.duration = data.duration;
  if (data.deadline !== undefined) map.deadline = data.deadline;
  if (data.link !== undefined) map.link = data.link;
  if (data.xpReward !== undefined) map.xp_reward = data.xpReward;
  if (data.notes !== undefined) map.notes = data.notes;
  if (data.status !== undefined) map.status = data.status;
  if (data.completedAt !== undefined) map.completed_at = data.completedAt;
  if (data.reminder15min !== undefined) map.reminder_15min = data.reminder15min;
  if (data.scheduledJobs !== undefined) map.scheduled_jobs = data.scheduledJobs;
  if (data.source !== undefined) map.source = data.source;
  if (data.adjustedFromOriginal !== undefined) map.adjusted_from_original = data.adjustedFromOriginal;
  if (data.originalStartTime !== undefined) map.original_start_time = data.originalStartTime;
  if (data.motivationQuote !== undefined) map.motivation_quote = data.motivationQuote;
  return map;
}

const Task = {
  async create(data) {
    const dbData = toDB(data);
    const { data: row, error } = await supabase.from(TABLE).insert(dbData).select().single();
    if (error) throw error;
    return toApp(row);
  },

  async insertMany(items) {
    const dbItems = items.map(toDB);
    const { data: rows, error } = await supabase.from(TABLE).insert(dbItems).select();
    if (error) throw error;
    return rows.map(toApp);
  },

  async find(filter = {}, sort = {}) {
    if (filter._id && filter._id.$in && filter._id.$in.length > 100) {
      // Chunking to avoid URL length limits
      const chunks = [];
      for (let i = 0; i < filter._id.$in.length; i += 100) {
        chunks.push(filter._id.$in.slice(i, i + 100));
      }
      const results = await Promise.all(chunks.map(chunk => this.find({ ...filter, _id: { $in: chunk } }, sort)));
      return results.flat();
    }

    let query = supabase.from(TABLE).select('*');
    if (filter._id && filter._id.$in) query = query.in('id', filter._id.$in);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.user_id) query = query.eq('user_id', filter.user_id);
    if (filter.status) {
      if (filter.status.$in) {
        query = query.in('status', filter.status.$in);
      } else {
        query = query.eq('status', filter.status);
      }
    }
    if (filter.startTime) {
      if (filter.startTime.$gte) query = query.gte('start_time', filter.startTime.$gte.toISOString());
      if (filter.startTime.$lt) query = query.lt('start_time', filter.startTime.$lt.toISOString());
      if (filter.startTime.$gt) query = query.gt('start_time', filter.startTime.$gt.toISOString());
    }

    // Default sort by start_time ascending
    query = query.order('start_time', { ascending: true });

    const { data: rows, error } = await query;
    if (error) throw error;
    return rows.map(toApp);
  },

  async findById(id) {
    const { data: row, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return toApp(row);
  },

  async findOneAndUpdate(filter, updates, options = {}) {
    const dbData = toDB(updates);
    let query = supabase.from(TABLE).update(dbData);
    if (filter._id || filter.id) query = query.eq('id', filter._id || filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: row, error } = await query.select().single();
    if (error && error.code !== 'PGRST116') throw error;
    return toApp(row);
  },

  async findOneAndDelete(filter) {
    let query = supabase.from(TABLE).delete();
    if (filter._id || filter.id) query = query.eq('id', filter._id || filter.id);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: row, error } = await query.select().single();
    if (error && error.code !== 'PGRST116') throw error;
    return toApp(row);
  },

  async deleteMany(filter) {
    if (filter._id && filter._id.$in && filter._id.$in.length > 100) {
      const chunks = [];
      for (let i = 0; i < filter._id.$in.length; i += 100) {
        chunks.push(filter._id.$in.slice(i, i + 100));
      }
      const results = await Promise.all(chunks.map(chunk => this.deleteMany({ ...filter, _id: { $in: chunk } })));
      return results.flat();
    }

    let query = supabase.from(TABLE).delete();
    if (filter._id && filter._id.$in) query = query.in('id', filter._id.$in);
    if (filter.userId) query = query.eq('user_id', filter.userId);
    const { data: rows, error } = await query.select();
    if (error) throw error;
    return rows;
  },

  async countDocuments(filter = {}) {
    let query = supabase.from(TABLE).select('id', { count: 'exact', head: true });
    if (filter.userId) query = query.eq('user_id', filter.userId);
    if (filter.status) query = query.eq('status', filter.status);
    const { count, error } = await query;
    if (error) throw error;
    return count;
  },
};

module.exports = Task;
