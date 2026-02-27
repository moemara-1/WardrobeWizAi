const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    let log = '';

    const { error: likeError } = await supabase
        .from('likes')
        .insert({ post_id: 'test-post-text', user_id: 'test-user-text' });
    log += 'Like with texts: ' + (likeError ? likeError.message : 'Success') + '\n';

    const { error: likeError2 } = await supabase
        .from('likes')
        .insert({ post_id: 'fa8ebbaa-2a29-4786-9dc4-8fbbcf8930ea', user_id: 'fa8ebbaa-2a29-4786-9dc4-8fbbcf8930ea' });
    log += 'Like with UUIDs: ' + (likeError2 ? likeError2.message : 'Success') + '\n';

    const { error: commentError } = await supabase
        .from('comments')
        .insert({
            id: 'fa8ebbaa-2a29-4786-9dc4-8fbbcf8930ea',
            post_id: 'test-post-text',
            user_id: 'test-user-text',
            username: 'test',
            text: 'hello',
            created_at: new Date().toISOString()
        });
    log += 'Comment with post_id text: ' + (commentError ? commentError.message : 'Success') + '\n';

    fs.writeFileSync('out_socials_schema.txt', log, 'utf8');
}

run();
