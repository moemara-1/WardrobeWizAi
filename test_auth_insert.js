require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthInsert() {
    let log = '';
    // Generate random email without underscore just in case Supabase rejects it
    const rando = Math.floor(Math.random() * 1000000);
    const email = `testuser${rando}@example.com`;
    const password = 'Password123!';

    log += `Signing up ${email}...\n`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: 'test_user',
                full_name: 'Test Setup User'
            }
        }
    });

    if (authError) {
        log += `Auth Error: ${authError.message}\n`;
        fs.writeFileSync('out_auth2.txt', log, 'utf8');
        return;
    }

    const user = authData.user;
    log += `Signup successful! User ID: ${user.id}\n`;

    // Wait a sec for the trigger to insert into profiles
    await new Promise(r => setTimeout(r, 1000));

    log += '\n--- Testing Authenticated Item Upsert ---\n';
    const dummyItem = {
        id: `item-${Date.now()}-test`,
        user_id: user.id,
        name: 'Test Shirt',
        category: 'top', // MUST match enum
        image_url: 'file:///path/to/image.jpg',
        clean_image_url: null,
        brand: 'Test Brand',
        colors: ['red'],
        garment_type: 't-shirt',
        layer_type: null,
        tags: ['test'],
        estimated_value: 10,
        model_name: null,
        subcategory: null,
        wear_count: 0,
        last_worn: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { error: itemError } = await supabase.from('items').upsert(dummyItem);

    if (itemError) {
        log += `Item Upsert Error: ${JSON.stringify(itemError, null, 2)}\n`;
    } else {
        log += 'Item Upsert SUCCESS! The item successfully saved to the cloud.\n';
    }

    // Double check profiles
    const { data: profile, error: profError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profError) {
        log += `Profile fetch error: ${profError.message}\n`;
    } else {
        log += `\nProfile correctly created by trigger: ${!!profile}\n`;
    }

    fs.writeFileSync('out_auth2.txt', log, 'utf8');
}

testAuthInsert();
