import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1);

    console.log('Supabase test - Error:', error);
    console.log('Supabase test - Data:', data);

    return { success: !error, error, data };
  } catch (e) {
    console.error('Exception:', e);
    return { success: false, error: e };
  }
}
