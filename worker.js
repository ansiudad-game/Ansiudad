import { generateGame } from './server/generateGame.js';

const json = (body, status, headers = {}) => Response.json(body, {
    status, headers: { 'Cache-Control': 'no-store', ...headers },
});

export default {
    async fetch(request, env) {
        const pathname = new URL(request.url).pathname;
        if (pathname !== '/api/sendPrompt') {
            if (pathname.startsWith('/api/')) return json({ success: false, error: 'Not found' }, 404);
            return env.ASSETS.fetch(request);
        }
        if (request.method !== 'POST') {
            return json({ success: false, error: 'Method not allowed' }, 405, { Allow: 'POST' });
        }
        // Limit bytes while reading, including requests without Content-Length.
        let body;
        try {
            const reader = request.body?.getReader();
            const chunks = [];
            let size = 0;
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    size += value.byteLength;
                    if (size > 16384) {
                        await reader.cancel();
                        return json({ success: false, error: 'Request too large' }, 413);
                    }
                    chunks.push(value);
                }
            }
            body = JSON.parse(await new Blob(chunks).text());
        } catch {
            return json({ success: false, error: 'Invalid JSON body' }, 400);
        }
        const result = await generateGame(body, env);
        return json(result.body, result.status);
    },
};
