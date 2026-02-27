require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testSocials() {
    let log = '';
    // Assuming a post and a user from a previous test
    const testUserId = '11111111-1111-1111-1111-111111111111'; // Dummy
    const testPostId = 'post-1234';

    const { error: likeError } = await supabase.from('likes').insert({ post_id: testPostId, user_id: testUserId });
    log += `Like Error: ${likeError ? likeError.message : 'Success'}\n`;

    const { error: commentError } = await supabase.from('comments').insert({
        id: `comment-${Date.now()}`,
        post_id: testPostId,
        user_id: testUserId,
        username: 'test',
        text: 'test'
    });
    log += `Comment Error: ${commentError ? commentError.message : 'Success'}\n`;

    fs.writeFileSync('out_socials.txt', log, 'utf8');
}
testSocials();
