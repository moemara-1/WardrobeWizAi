const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log('Testing missing RLS policies for Outfits and Twins...');

    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    if (!users?.length) return;
    const userId = users[0].id;

    const { data: twins, error: twinErr } = await supabase.from('digital_twins').select('*').limit(1);
    console.log('Anon reading Twins:', twinErr ? twinErr.message : (twins?.length ? 'Success' : 'Empty'));

    const { data: outfits, error: outErr } = await supabase.from('outfits').select('*').limit(1);
    console.log('Anon reading Outfits:', outErr ? outErr.message : (outfits?.length ? 'Success' : 'Empty'));
}

checkRLS();
