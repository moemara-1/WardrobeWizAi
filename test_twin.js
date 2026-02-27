const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTwin() {
    console.log('Testing Digital Twins Schema and Insertions...');

    // Get any user ID
    const { data: users, error: userErr } = await supabase.from('profiles').select('id').limit(1);
    if (userErr || !users || users.length === 0) {
        console.error('Failed to get a user', userErr);
        return;
    }
    const userId = users[0].id;
    console.log('Testing with User:', userId);

    // 1. Check if user already has a twin
    const { data: twin, error: twinFetchErr } = await supabase.from('digital_twins').select('*').eq('user_id', userId).maybeSingle();
    console.log('Fetch Result:', twinFetchErr ? twinFetchErr.message : (twin ? 'Twin Exists' : 'No Twin Found'));

    // 2. Attempt to create a NEW twin manually to see if it throws a constraint error
    const newId = `twin_${Date.now()}`;
    const { data: insertData, error: insertErr } = await supabase.from('digital_twins').insert({
        id: newId,
        user_id: userId,
        twin_image_url: 'test_url.jpg',
    });

    console.log('Insert Secondary Twin Result:', insertErr ? JSON.stringify(insertErr) : 'Success');
}

checkTwin();
