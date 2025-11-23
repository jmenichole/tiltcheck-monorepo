import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function addToWaitlist(email) {
  const { data, error } = await supabase
    .from('waitlist')
    .insert([{ email }]);

  if (error) {
    console.error('Error adding to waitlist:', error);
    throw error;
  }

  return data;
}