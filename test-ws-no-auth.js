import WebSocket from 'ws';
const test = (name, headers) => {
    return new Promise((resolve) => {
        const ws = new WebSocket('ws://green-house.local/api/jota/ws/test_user_123', { headers });
        ws.on('open', () => { console.log(name, 'Connected'); });
        ws.on('close', (code, reason) => { console.log(name, 'Closed:', code, reason.toString()); resolve(); });
        ws.on('error', (err) => { console.log(name, 'Error:', err.message); resolve(); });
    });
};

(async () => {
    await test('NO_AUTH', {});
    await test('WRONG_AUTH', { 'x-api-key': 'wrong' });
    await test('CORRECT_AUTH', { 'x-api-key': 'jota_desktop_vPucN40NDDBkQkTt' });
    await test('UPPERCASE_AUTH', { 'X-API-Key': 'jota_desktop_vPucN40NDDBkQkTt' });
})();
