const fs = require('fs');

async function main() {
    const token = 'r8_BtrAi5eDv6eoBI72Z0AbZ6mHg0hilub4fai2B';
    const path = 'C:\\Users\\User\\Pictures\\Screenshots\\Screenshot 2026-02-14 003528.png';

    try {
        if (!fs.existsSync(path)) {
            console.error(`File not found: ${path}`);
            return;
        }

        const b64 = fs.readFileSync(path, 'base64');
        const imageUri = `data:image/png;base64,${b64}`;

        console.error('Calling Replicate Llama Vision...');

        // Using meta/llama-3.2-11b-vision-instruct
        const resp = await fetch('https://api.replicate.com/v1/models/meta/llama-3.2-11b-vision-instruct/predictions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'wait'
            },
            body: JSON.stringify({
                input: {
                    image: imageUri,
                    prompt: "Read all the text in this image exactly as it appears. Return ONLY the text.",
                    max_tokens: 1000
                }
            })
        });

        if (!resp.ok) {
            console.error('Replicate Error:', await resp.text());
            return;
        }

        const data = await resp.json();
        const output = data.output;

        // Output is strictly string array or string
        const text = Array.isArray(output) ? output.join('') : String(output || '');
        console.log(text);

    } catch (e) {
        console.error('Script Error:', e);
    }
}

main();
