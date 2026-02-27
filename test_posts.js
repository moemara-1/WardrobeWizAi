require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkPosts() {
    console.log('Fetching posts...');
    const { data: rows, error } = await supabase
        .from('posts')
        .select('id, user_id, image_url')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching posts:', JSON.stringify(error, null, 2));
        return;
    }

    console.log('Posts fetched:', rows.length);
    if (rows.length > 0) {
        const userIds = [...new Set(rows.map(r => r.user_id))];
        console.log('Fetching profiles for user IDs:', userIds);

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);

        if (profileError) {
            console.error('Error fetching profiles:', JSON.stringify(profileError, null, 2));
        } else {
            console.log('Profiles fetched:', profiles.length);
            console.log(profiles);
        }
    } else {
        console.log('No posts found.');
    }
}

checkPosts();
