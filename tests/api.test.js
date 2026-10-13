import test from 'node:test';
import assert from 'node:assert/strict';

let calls = [];
let failJsonMode = false;
let failProvider = false;
let incompleteRoles = false;
globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.groq.com/openai/v1/chat/completions');
    const payload = JSON.parse(options.body);
    calls.push(payload);
    if (failProvider) return Response.json({ error: { message: 'private provider details' } }, { status: 500 });
    if (failJsonMode && payload.response_format) {
        return Response.json({ error: { message: 'response_format json_object unsupported' } }, { status: 400 });
    }
    const count = Number(payload.messages[1].content.match(/exactamente (\d+)/)[1]);
    const content = payload.messages[1].content.includes('eventos')
        ? { events: [{ title: 'Evento', description: 'Una fuga deja al barrio sin agua. Presenta una alternativa para abastecerlo.' }] }
        : { roles: Array.from({length:count}, () => ({ name: 'Rol', priorities: incompleteRoles ? '' : 'Acceso al agua.', interests: 'Servicios públicos.' })) };
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
};
const { default: worker } = await import('../worker.js');
const { default: vercel } = await import('../api/sendPrompt.js');
const { eventOnly } = await import('../server/generateGame.js');
const env = { GROQ_API_KEY: 'test-only', GROQ_MODEL: 'test-model' };
const body = { prompt: 'Agua', _numberOfTeams: '2', _numberOfRoles: '5' };
const post = (value) => new Request('https://example.com/api/sendPrompt', { method: 'POST', body: JSON.stringify(value) });

test('Worker routes and validation do not call Groq', async () => {
    const before = calls.length;
    const get = await worker.fetch(new Request('https://example.com/api/sendPrompt'), env);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('Allow'), 'POST');
    assert.equal((await worker.fetch(new Request('https://example.com/api/missing'), env)).status, 404);
    assert.equal((await worker.fetch(new Request('https://example.com/api/sendPrompt', { method: 'POST', body: '{' }), env)).status, 400);
    for (const value of [null, {}, {...body, _numberOfTeams: 6}, {...body, _numberOfRoles: 26}, {...body, _numberOfRoles: true}, {...body, prompt: 'a'.repeat(2001)}]) {
        assert.equal((await worker.fetch(post(value), env)).status, 400);
    }
    assert.equal((await worker.fetch(post({prompt:'a'.repeat(17000)}),env)).status,413);
    const asset = await worker.fetch(new Request('https://example.com/juego.html'), { ASSETS: { fetch: () => new Response('game') } });
    assert.equal(await asset.text(), 'game');
    assert.equal(calls.length,before);
});

test('Worker preserves the nested game response and model setting', async () => {
    calls = [];
    const response = await worker.fetch(post(body), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const result = await response.json();
    assert.deepEqual(result.data.events.events, [{title:'Evento',description:'Una fuga deja al barrio sin agua.'}]);
    assert.equal(result.data.roles.roles.length, 5);
    assert.ok(result.data.roles.roles.every(role => role.priorities === 'Acceso al agua.'));
    assert.equal(calls.length,2);
    assert.ok(calls.every(call => call.model === 'test-model'));
});

test('Event cleanup keeps the news and removes player instructions', () => {
    assert.equal(eventOnly('Un corto incendió el mercado. PRESENTA una propuesta para apagarlo.'), 'Un corto incendió el mercado.');
    assert.equal(eventOnly('Una fuga dejó sin agua al barrio.'), 'Una fuga dejó sin agua al barrio.');
    assert.ok(eventOnly('palabra '.repeat(50)).split(/\s+/).length <= 35);
});

test('Empty role descriptions trigger one retry and never return blank cards', async () => {
    calls = [];
    incompleteRoles = true;
    try {
        assert.equal((await worker.fetch(post(body), env)).status, 502);
        assert.equal(calls.filter(call => call.messages[1].content.includes('roles')).length, 2);
    } finally {
        incompleteRoles = false;
    }
});

test('JSON mode fallback and provider errors', async () => {
    calls = [];
    failJsonMode = true;
    assert.equal((await worker.fetch(post(body),env)).status,200);
    assert.equal(calls.length,4);
    failJsonMode = false;
    failProvider = true;
    const response = await worker.fetch(post(body),env);
    assert.equal(response.status,502);
    assert.ok(!(await response.text()).includes('private provider details'));
    failProvider = false;
    assert.equal((await worker.fetch(post(body),{})).status,502);
});

test('Vercel adapter retains compatibility', async () => {
    const oldKey = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = 'test-only';
    const res = { setHeader(){}, status(code){this.code=code;return this;}, json(value){this.body=value;return this;} };
    try {
        await vercel({method:'POST',body},res);
        assert.equal(res.code,200);
        assert.equal(res.body.success,true);
    } finally {
        if (oldKey === undefined) delete process.env.GROQ_API_KEY;
        else process.env.GROQ_API_KEY = oldKey;
    }
});
