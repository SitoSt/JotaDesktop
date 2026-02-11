const { app, BrowserWindow, session } = require('electron');
const path = require('path');
require('dotenv').config();

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // For simplicity in this demo, though contextIsolation: true is safer
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:4321');
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

app.whenReady().then(() => {
    // Intercept requests to inject the API key
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ['*://green-house.local/*'] },
        (details, callback) => {
            details.requestHeaders['x-api-key'] = process.env.JOTA_API_KEY;
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
