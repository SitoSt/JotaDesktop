import WebSocket from 'ws';

const ws = new WebSocket('ws://green-house.local/api/jota/ws/test_user_123', {
    headers: {
        'x-api-key': 'jota_desktop_vPucN40NDDBkQkTt' // From .env JOTA_API_KEY
    }
});

ws.on('open', () => {
    console.log('Connected to server successfully');
    setTimeout(() => {
        console.log('Closing connection normally');
        ws.close();
        process.exit(0);
    }, 2000);
});

ws.on('message', (data) => {
    console.log('Received message:', data.toString());
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

ws.on('close', (code, reason) => {
    console.log('WebSocket closed with code:', code, 'reason:', reason.toString());
});
