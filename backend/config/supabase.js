const { createClient } = require('@supabase/supabase-js');

let supabase = null;

const initSupabase = () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️  Supabase credentials missing — file storage disabled');
    return;
  }
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  console.log('✅ Supabase client initialized');
};

const getSupabase = () => {
  if (!supabase) throw new Error('Supabase not initialized');
  return supabase;
};

module.exports = { initSupabase, getSupabase };
