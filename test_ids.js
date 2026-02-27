require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkIds() {
    let log = '';

    log += '\n--- Testing Item with STR ID ---\n';
    const { error: itemError1 } = await supabase.from('items').upsert({
        id: `item-${Date.now()}`,
        user_id: '11111111-1111-1111-1111-111111111112',
        name: 'test',
        category: 'top',
        image_url: 'test'
    });
    log += `Item result: ${itemError1 ? itemError1.message : 'Success'}\n`;

    log += '\n--- Testing Outfit with STR ID ---\n';
    const { error: outfitError1 } = await supabase.from('outfits').upsert({
        id: `outfit-${Date.now()}`,
        user_id: '11111111-1111-1111-1111-111111111112',
        name: 'test'
    });
    log += `Outfit STR result: ${outfitError1 ? outfitError1.message : 'Success'}\n`;

    // Try testing outfit with a string array for item_ids
    log += '\n--- Testing Outfit Item IDs as STR Array ---\n';
    const { error: outfitError2 } = await supabase.from('outfits').upsert({
        id: `outfit-${Date.now()}`,
        user_id: '11111111-1111-1111-1111-111111111112',
        name: 'test',
        item_ids: ['item-1', 'item-2']
    });
    log += `Outfit STR Array result: ${outfitError2 ? outfitError2.message : 'Success'}\n`;

    fs.writeFileSync('out_ids.txt', log, 'utf8');
}

checkIds();
