require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInserts() {
    const dummyUserId = '11111111-1111-1111-1111-111111111112';
    const dummyId = '11111111-1111-1111-1111-111111111111';

    let output = '';

    output += '--- Testing Profile Upsert ---\n';
    const { error: profileError } = await supabase.from('profiles').upsert({
        id: dummyUserId,
        username: 'test_username',
        bio: 'test_bio',
        avatar_url: 'http://example.com'
    });
    output += `Profile upsert result: ${profileError ? profileError.message : 'Success'}\n`;

    output += '\n--- Testing Item with WEAR_COUNT ---\n';
    const { error: itemError1 } = await supabase.from('items').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        category: 'top',
        image_url: 'test',
        wear_count: 5,
        last_worn: new Date().toISOString()
    });
    output += `Item upsert (wear_count) result: ${itemError1 ? itemError1.message : 'Success'}\n`;

    output += '\n--- Testing Item with TIMES_WORN ---\n';
    const { error: itemError2 } = await supabase.from('items').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        category: 'top',
        image_url: 'test',
        times_worn: 5,
        last_worn_at: new Date().toISOString()
    });
    output += `Item upsert (times_worn) result: ${itemError2 ? itemError2.message : 'Success'}\n`;

    output += '\n--- Testing Outfit with THEME ---\n';
    const { error: outfitError1 } = await supabase.from('outfits').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        theme: 'casual',
        ai_notes: 'cool',
        collage_url: 'url'
    });
    output += `Outfit upsert (theme) result: ${outfitError1 ? outfitError1.message : 'Success'}\n`;

    output += '\n--- Testing Outfit with STYLE ---\n';
    const { error: outfitError2 } = await supabase.from('outfits').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        style: 'casual',
        notes: 'cool',
        image_url: 'url'
    });
    output += `Outfit upsert (style) result: ${outfitError2 ? outfitError2.message : 'Success'}\n`;

    fs.writeFileSync('out3.txt', output, 'utf8');
}

checkInserts();
