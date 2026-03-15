const bcrypt = require('bcryptjs');
const { supabase } = require('../config/db');

const TABLE = 'users';

// Convert DB row (snake_case) to app format (camelCase)
function toApp(row) {
  if (!row) return null;
  return {
    _id: row.id,
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    goal: row.goal,
    detectedGoal: row.detected_goal,
    xp: row.xp,
    level: row.level,
    streak: row.streak,
    lastActiveDate: row.last_active_date,
    completedTasksCount: row.completed_tasks_count,
    mode: row.mode,
    settings: row.settings,
    weakAreas: row.weak_areas,
    productivityPattern: row.productivity_pattern,
    expoPushToken: row.expo_push_token,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert app format to DB row
function toDB(data) {
  const map = {};
  if (data.name !== undefined) map.name = data.name;
  if (data.email !== undefined) map.email = data.email.toLowerCase();
  if (data.password !== undefined) map.password = data.password;
  if (data.goal !== undefined) map.goal = data.goal;
  if (data.detectedGoal !== undefined) map.detected_goal = data.detectedGoal;
  if (data.xp !== undefined) map.xp = data.xp;
  if (data.level !== undefined) map.level = data.level;
  if (data.streak !== undefined) map.streak = data.streak;
  if (data.lastActiveDate !== undefined) map.last_active_date = data.lastActiveDate;
  if (data.completedTasksCount !== undefined) map.completed_tasks_count = data.completedTasksCount;
  if (data.mode !== undefined) map.mode = data.mode;
  if (data.settings !== undefined) map.settings = data.settings;
  if (data.weakAreas !== undefined) map.weak_areas = data.weakAreas;
  if (data.productivityPattern !== undefined) map.productivity_pattern = data.productivityPattern;
  if (data.expoPushToken !== undefined) map.expo_push_token = data.expoPushToken;
  if (data.avatarUrl !== undefined) map.avatar_url = data.avatarUrl;
  return map;
}

const User = {
  async create(data) {
    const hashed = await bcrypt.hash(data.password, 12);
    const dbData = toDB({ ...data, password: hashed });
    const { data: row, error } = await supabase.from(TABLE).insert(dbData).select().single();
    if (error) throw error;
    return toApp(row);
  },

  async findOne(filter) {
    let query = supabase.from(TABLE).select('*');
    if (filter.email) query = query.eq('email', filter.email.toLowerCase());
    const { data: row, error } = await query.single();
    if (error && error.code !== 'PGRST116') throw error;
    const user = toApp(row);
    if (user) user.comparePassword = (plain) => bcrypt.compare(plain, user.password);
    return user;
  },

  async findById(id, options = {}) {
    let selectStr = '*';
    if (options.select === '-password') {
      selectStr = 'id,name,email,goal,detected_goal,xp,level,streak,last_active_date,completed_tasks_count,mode,settings,weak_areas,productivity_pattern,created_at,updated_at';
    }
    const { data: row, error } = await supabase.from(TABLE).select(selectStr).eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    const user = toApp(row);
    if (user && options.select !== '-password') {
      user.comparePassword = (plain) => bcrypt.compare(plain, user.password);
    }
    return user;
  },

  async findByIdAndUpdate(id, updates, options = {}) {
    // Handle $inc operator
    if (updates.$inc) {
      for (const [key, val] of Object.entries(updates.$inc)) {
        const { data: current } = await supabase.from(TABLE).select(key === 'completedTasksCount' ? 'completed_tasks_count' : key).eq('id', id).single();
        if (current) {
          const dbKey = key === 'completedTasksCount' ? 'completed_tasks_count' : key;
          updates[key] = (current[dbKey] || 0) + val;
        }
      }
      delete updates.$inc;
    }

    const dbData = toDB(updates);
    let selectStr = '*';
    if (options.select === '-password') {
      selectStr = 'id,name,email,goal,detected_goal,xp,level,streak,last_active_date,completed_tasks_count,mode,settings,weak_areas,productivity_pattern,created_at,updated_at';
    }
    const { data: row, error } = await supabase.from(TABLE).update(dbData).eq('id', id).select(selectStr).single();
    if (error) throw error;
    return toApp(row);
  },
};

module.exports = User;
