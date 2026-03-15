const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_API_KEY
);

const connectDB = async () => {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) throw error;
    console.log('Supabase connected successfully');
  } catch (err) {
    console.error('Supabase connection error:', err.message);
    process.exit(1);
  }
};

module.exports = { supabase, connectDB };
