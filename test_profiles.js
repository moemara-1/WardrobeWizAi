require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProfiles() {
    console.log('Fetching 1 profile to check columns...');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, bio, display_name')
        .limit(1);

    if (error) {
        console.error('Error fetching profile:', JSON.stringify(error, null, 2));
    } else {
        console.log('Profile data:', data);
    }
}

checkProfiles();
