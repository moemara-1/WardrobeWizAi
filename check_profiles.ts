import { supabase } from './lib/supabase';

async function checkProfiles() {
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        console.log('Profiles data:', data);
        console.log('Profiles error:', error);
    } catch (e) {
        console.error('Exception:', e);
    }
}

checkProfiles();
