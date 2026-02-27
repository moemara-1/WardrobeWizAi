const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSocial() {
    console.log('Testing likes table insert...');

    // Create a dummy user auth if possible, or just insert
    // Need to log in to satisfy RLS for authenticated insertion

    // We'll just test the schema via an unauthenticated insert first, which should fail with RLS.
    // If we want auth, we can sign in. But let's just see if we can get the actual schema error by passing valid UUIDs.

    // 1. Fetch any valid post id and any valid user id
    const { data: posts, error: postErr } = await supabase.from('posts').select('id, user_id').limit(1);
    if (postErr || !posts || posts.length === 0) {
        console.error('No posts found', postErr);
        return;
    }
    const postId = posts[0].id;
    const ownerId = posts[0].user_id;

    console.log(`Using Post ID: ${postId} (Owner: ${ownerId})`);

    // Attempt to insert a like
    const { data: likeData, error: likeError } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: ownerId }); // Use the owner ID just to have a valid UUID

    console.log('Like Insert Result:', likeError ? likeError.message : 'Success');

    if (likeError && likeError.message.includes('row-level security')) {
        // Create a test user or authenticate
        console.log('RLS blocked the insert as expected without auth. We need the auth token.');
    }

    // Test comment schema mismatch
    const { error: commentErr } = await supabase.from('comments').insert({
        id: crypto.randomUUID(),
        post_id: postId,
        user_id: ownerId,
        username: 'tester',
        text: 'Testing comments',
    });
    console.log('Comment Insert Result:', commentErr ? commentErr.message : 'Success');
}

testSocial();
