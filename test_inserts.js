require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkInserts() {
    const dummyUserId = 'e9018c15-837d-411a-a0aa-43d964yf9qcs'; // from earlier
    const dummyId = '11111111-1111-1111-1111-111111111111';

    console.log('--- Testing Profile Upsert ---');
    // Wait, anon key can't upsert other people's profile due to RLS unless RLS is broken or disabled
    // BUT what we WANT is the SCHEMA error if the column doesn't exist.
    // Schema errors (400) happen BEFORE RLS policy checks! 

    const { error: profileError } = await supabase.from('profiles').upsert({
        id: dummyUserId,
        username: 'test_username',
        bio: 'test_bio',
        avatar_url: 'http://example.com'
    });
    console.log('Profile upsert result:', profileError ? profileError.message : 'Success (or RLS blocked it without schema error)');

    console.log('\n--- Testing Item with WEAR_COUNT ---');
    const { error: itemError1 } = await supabase.from('items').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        category: 'top',
        image_url: 'test',
        wear_count: 5,
        last_worn: new Date().toISOString()
    });
    console.log('Item upsert (wear_count) result:', itemError1 ? itemError1.message : 'Success');

    console.log('\n--- Testing Item with TIMES_WORN ---');
    const { error: itemError2 } = await supabase.from('items').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        category: 'top',
        image_url: 'test',
        times_worn: 5,
        last_worn_at: new Date().toISOString()
    });
    console.log('Item upsert (times_worn) result:', itemError2 ? itemError2.message : 'Success');

    console.log('\n--- Testing Outfit with THEME ---');
    const { error: outfitError1 } = await supabase.from('outfits').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        theme: 'casual',
        ai_notes: 'cool',
        collage_url: 'url'
    });
    console.log('Outfit upsert (theme) result:', outfitError1 ? outfitError1.message : 'Success');

    console.log('\n--- Testing Outfit with STYLE ---');
    const { error: outfitError2 } = await supabase.from('outfits').upsert({
        id: dummyId,
        user_id: dummyUserId,
        name: 'test',
        style: 'casual',
        notes: 'cool',
        image_url: 'url'
    });
    console.log('Outfit upsert (style) result:', outfitError2 ? outfitError2.message : 'Success');
}

checkInserts();
