require('dotenv').config();

async function checkSchema() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/';
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });

        if (!res.ok) {
            console.error('Failed to fetch schema:', res.status, res.statusText);
            return;
        }

        const data = await res.json();

        // Log the properties of the tables we care about
        const tables = ['profiles', 'items', 'outfits', 'posts', 'digital_twins'];

        for (const table of tables) {
            console.log(`\n=== Schema for ${table} ===`);
            const def = data.definitions[table];
            if (def && def.properties) {
                console.log(Object.keys(def.properties).join(', '));
            } else {
                console.log('Table definition not found or has no properties');
            }
        }
    } catch (error) {
        console.error('Error fetching schema:', error);
    }
}

checkSchema();
