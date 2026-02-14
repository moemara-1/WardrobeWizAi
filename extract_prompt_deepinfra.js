const fs = require('fs');

async function main() {
    const token = '8RelYOcO9Zh9jPThQsZda63hcPBSEv5e';
    const path = 'C:\\Users\\User\\Pictures\\Screenshots\\Screenshot 2026-02-14 003528.png';
    const model = 'meta-llama/Llama-3.2-11B-Vision-Instruct';

    try {
        if (!fs.existsSync(path)) {
            console.error(`File not found: ${path}`);
            return;
        }

        const b64 = fs.readFileSync(path, 'base64');
        const imageUri = `data:image/png;base64,${b64}`;

        console.error('Calling DeepInfra Llama Vision...');

        const resp = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: "Read all the text in this screenshot exactly as it appears. Return ONLY the text." },
                        { type: 'image_url', image_url: { url: imageUri } }
                    ]
                }],
                max_tokens: 1000
            })
        });

        if (!resp.ok) {
            console.error('DeepInfra Error:', await resp.text());
            return;
        }

        const data = await resp.json();
        const text = data.choices[0].message.content;
        console.log(text);

    } catch (e) {
        console.error('Script Error:', e);
    }
}

main();
