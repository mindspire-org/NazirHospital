// Electron Main Process
import { app, BrowserWindow, ipcMain, nativeTheme, shell, dialog, session } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let splashShownAt = 0;
let splashReady = false;
let mainReady = false;
const MIN_SPLASH_MS = 2000;
let backendProcess = null;
let appConfig = null;

function resolveIconPath() {
  const names = ['hospital_icon.ico', 'hospital_icon.png', 'hospital_icon.jpeg'];
  const locations = [
    // Dev/public
    path.join(__dirname, '..', 'public'),
    // Packaged extraResources (unpacked)
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'public'),
    // Packaged extraResources direct
    path.join(process.resourcesPath || '', 'public'),
    // As a fallback, check dist as well
    path.join(__dirname, '..', 'dist'),
  ];
  for (const dir of locations) {
    for (const n of names) {
      const p = path.join(dir, n);
      try { if (fs.existsSync(p)) return p; } catch {}
    }
  }
  // Fallback to dev path even if missing; Electron will ignore if not found
  return path.join(__dirname, '..', 'public', 'hospital_icon.ico');
}

// Ensure single instance of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // Another instance is already running; quit this one immediately
  app.quit();
} else {
  // Focus existing window on second instance
  app.on('second-instance', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      try { splashWindow.show(); splashWindow.focus(); } catch {}
      return;
    }
    if (mainWindow) {
      try {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } catch {}
    }
  });

// Preview helper: accept a PDF data URL or base64 string and show it in preview window
ipcMain.handle('print:preview-pdf', async (_event, dataUrlOrBase64) => {
  try {
    let base64 = ''
    if (typeof dataUrlOrBase64 === 'string'){
      const s = dataUrlOrBase64.trim()
      if (s.startsWith('data:')){
        const idx = s.indexOf('base64,')
        base64 = idx !== -1 ? s.substring(idx + 'base64,'.length) : ''
      } else {
        base64 = s
      }
    }
    if (!base64) return { ok: false, error: 'Invalid PDF data' }
    const buf = Buffer.from(base64, 'base64')
    const tmp = path.join(app.getPath('temp'), `preview-${Date.now()}.pdf`)
    fs.writeFileSync(tmp, buf)
    const win = new BrowserWindow({ width: 1000, height: 800, show: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
    await win.loadURL(pathToFileURL(tmp).toString())
    win.on('closed', () => { try { fs.unlinkSync(tmp) } catch {} })
    return { ok: true, path: tmp }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
})
}

const isDev = !app.isPackaged || !!process.env.VITE_DEV_SERVER_URL;

function resolveBackendEntry() {
  // In dev, run from project server folder
  if (isDev) {
    return path.join(__dirname, '..', 'server', 'index.js');
  }
  // In production, try realistic locations depending on electron-builder packing
  const candidates = [
    // Preferred: extraResources -> server/dist/server.js (unpacked)
    path.join(process.resourcesPath, 'server', 'dist', 'server.js'),
    path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist', 'server.js'),
    // If resources packed under app
    path.join(process.resourcesPath, 'app', 'server', 'dist', 'server.js'),
    // Legacy index.js fallback
    path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'index.js'),
    path.join(process.resourcesPath, 'app', 'server', 'index.js'),
    // Dev-like fallback
    path.join(__dirname, '..', 'server', 'dist', 'server.js'),
    path.join(__dirname, '..', 'server', 'index.js'),
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  // Return the first as a best-effort fallback
  return candidates[0];
}

function startBackend() {
  const entry = resolveBackendEntry();
  const env = { ...process.env };
  // Use 4000 in both dev and production unless overridden
  env.PORT = env.PORT || '4000';

  // Set working directory so dotenv and relative paths work
  const cwd = (function(){
    if (isDev) return path.join(__dirname, '..', 'server');
    // Prefer resources/server (extraResources)
    const resServer = path.join(process.resourcesPath, 'server');
    if (fs.existsSync(resServer)) return resServer;
    const unpacked = path.join(process.resourcesPath, 'app.asar.unpacked', 'server');
    if (fs.existsSync(unpacked)) return unpacked;
    const appServer = path.join(process.resourcesPath, 'app', 'server');
    return appServer;
  })();

  // In production, use Electron binary in Node mode to run the backend script
  // This avoids launching another Electron app instance.
  const nodeExec = process.execPath;
  if (!isDev) env.ELECTRON_RUN_AS_NODE = '1';

  backendProcess = spawn(nodeExec, [entry], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    cwd,
  });

  // Write backend logs to file for diagnostics in production
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch {}
    const logFile = path.join(logsDir, 'backend.log');
    const append = (tag, chunk) => {
      try {
        const line = `[${new Date().toISOString()}][${tag}] ${chunk.toString()}`;
        fs.appendFileSync(logFile, line);
      } catch {}
    };
    backendProcess.stdout?.on('data', (d) => append('OUT', d));
    backendProcess.stderr?.on('data', (d) => append('ERR', d));
  } catch {}


  backendProcess.on('error', (err) => {
    console.error('[backend] failed to start:', err);
  });
  backendProcess.on('exit', (code, signal) => {
    console.log('[backend] exited', { code, signal });
  });
}

function waitForBackend(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 1500 }, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          res.resume();
          return resolve(true);
        }
        res.resume();
        retry();
      });
      req.on('error', retry);
      req.on('timeout', () => { try { req.destroy(); } catch {} retry(); });
      function retry() {
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(attempt, 500);
      }
    };
    attempt();
  });
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  splashWindow.once('ready-to-show', () => { splashShownAt = Date.now(); splashWindow.show(); });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0b1117' : '#ffffff',
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      // Enable native window.open so print previews and popups can open safely
      nativeWindowOpen: true,
    },
  });

  const tryShow = () => {
    const elapsed = Math.max(0, Date.now() - (splashShownAt || Date.now()));
    if (!splashReady || !mainReady || elapsed < MIN_SPLASH_MS) return;
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    try {
      mainWindow.show();
      mainWindow.focus();
      if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        setTimeout(() => { try { mainWindow.setAlwaysOnTop(false); } catch {} }, 100);
      }
      mainWindow.setSkipTaskbar(false);
    } catch {}
  };

  // When the app UI fully loads, mark ready and attempt to show
  mainWindow.webContents.once('did-finish-load', () => { mainReady = true; tryShow(); });
  // Also handle earlier readiness for some packaging scenarios
  mainWindow.once('ready-to-show', () => { mainReady = true; tryShow(); });

  if (isDev) {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    mainWindow.loadURL(devURL);
    // Only open DevTools if explicitly requested
    if (process.env.ELECTRON_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    try {
      if (!fs.existsSync(indexPath)) {
        dialog.showErrorBox(
          'Application files missing',
          'The application UI files were not found (dist/index.html is missing).\n\nPlease rebuild the app using "npm run build" then create the installer with "npm run dist:win".'
        );
        // Close splash if visible and quit to avoid blank window hanging
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        app.quit();
        return;
      }
    } catch {}
    mainWindow.loadFile(indexPath);
  }

  // Allow app popups (about:blank or same-origin) for print previews; external links go to default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    const isAppUrl = !url || url === 'about:blank' || url.startsWith('file://') || url.startsWith(devURL);
    if (isAppUrl) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          webPreferences: {
            // Harden child windows
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }
    try { if (/^https?:\/\//i.test(url)) shell.openExternal(url); } catch {}
    return { action: 'deny' };
  });

  // Optional hardening: prevent navigation away from app's index except dev URL
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const devURL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:8080';
    const isAppFile = url.startsWith('file://') || url.startsWith(devURL);
    if (!isAppFile) {
      e.preventDefault();
      try { if (/^https?:\/\//i.test(url)) shell.openExternal(url); } catch {}
    }
  });

  // Keyboard: Ctrl+P opens the system print dialog for the current page
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && !input.alt && !input.shift && input.type === 'keyDown' && input.key?.toLowerCase() === 'p') {
      event.preventDefault();
      try {
        mainWindow.webContents.print({ printBackground: true, silent: false });
      } catch (e) {
        console.warn('Print failed from shortcut:', e);
      }
    }
  });

  // Note: do not override window.open so the app can open print previews/popups as intended
}

// IPC: Printing helpers
ipcMain.handle('print:current', async (event, options = {}) => {
  const wc = event?.sender;
  if (!wc) return { ok: false, error: 'No sender' };
  return new Promise((resolve) => {
    try {
      wc.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    } catch (e) {
      resolve({ ok: false, error: e?.message || String(e) });
    }
  });
});

ipcMain.handle('shell:open-path', async (_event, p) => {
  try {
    if (typeof p !== 'string' || !p.trim()) return { ok: false, error: 'Invalid path' }
    const r = await shell.openPath(p)
    if (r) return { ok: false, error: r }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || String(e) }
  }
})

ipcMain.handle('print:html', async (_event, html, options = {}) => {
  if (typeof html !== 'string' || !html.trim()) return { ok: false, error: 'Invalid HTML' };
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await new Promise((resolve) => {
      win.webContents.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        try { win.close(); } catch {}
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    });
  } catch (e) {
    try { win.close(); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
});

// Preview helper: render provided HTML to PDF and show it in a preview window
ipcMain.handle('print:preview-html', async (_event, html, options = {}) => {
  if (typeof html !== 'string' || !html.trim()) return { ok: false, error: 'Invalid HTML' };
  const tmpDir = app.getPath('temp');
  const pdfPath = path.join(tmpDir, `preview-${Date.now()}.pdf`);
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: false } });
  try {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const data = await win.webContents.printToPDF({ printBackground: true, marginsType: 0, ...options });
    fs.writeFileSync(pdfPath, data);
    try { win.close(); } catch {}
    const pv = new BrowserWindow({ width: 1000, height: 800, show: true, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    await pv.loadURL(pathToFileURL(pdfPath).toString());
    pv.on('closed', () => { try { fs.unlinkSync(pdfPath) } catch {} });
    return { ok: true, path: pdfPath };
  } catch (e) {
    try { win.close() } catch {}
    try { console.error('[print:preview-html] failed:', e) } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
});

// Preview helper: render current page to PDF and show it in a preview window
ipcMain.handle('print:preview-current', async (event, options = {}) => {
  const sender = event?.sender;
  if (!sender) return { ok: false, error: 'No sender' };
  try {
    const pdfData = await sender.printToPDF({ printBackground: true, marginsType: 0, ...options });
    const tmpDir = app.getPath('temp');
    const file = path.join(tmpDir, `preview-${Date.now()}.pdf`);
    fs.writeFileSync(file, pdfData);
    const win = new BrowserWindow({
      width: 1000,
      height: 800,
      show: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    await win.loadURL(pathToFileURL(file).toString());
    // Clean up temp file when window closes
    win.on('closed', () => { try { fs.unlinkSync(file); } catch {} });
    return { ok: true, path: file };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('print:url', async (_event, url, options = {}) => {
  if (typeof url !== 'string' || !url.trim()) return { ok: false, error: 'Invalid URL' };
  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await win.loadURL(url);
    return await new Promise((resolve) => {
      win.webContents.print({ printBackground: true, silent: false, ...options }, (success, failureReason) => {
        try { win.close(); } catch {}
        if (success) resolve({ ok: true });
        else resolve({ ok: false, error: failureReason || 'Unknown print error' });
      });
    });
  } catch (e) {
    try { win.close(); } catch {}
    return { ok: false, error: e?.message || String(e) };
  }
});

app.whenReady().then(async () => {
  try {
    const candidates = [
      path.join(process.resourcesPath || '', 'app-config.json'),
      path.join(process.resourcesPath || '', 'app', 'app-config.json'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'app-config.json'),
      path.join(__dirname, 'app-config.json'),
      path.join(app.getPath('userData'), 'app-config.json'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          appConfig = JSON.parse(raw);
          break;
        }
      } catch {}
    }
  } catch {}
  // Redirect accidental file:///api/* requests to the local backend in Electron prod
  try {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      try {
        const url = details.url || '';
        if (url.startsWith('file://')) {
          const idx = url.indexOf('/api/');
          if (idx !== -1) {
            const rest = url.substring(idx + '/api'.length);
            const remote = appConfig && typeof appConfig.remoteApiBaseUrl === 'string' && appConfig.remoteApiBaseUrl.trim();
            if (remote) {
              const base = remote.replace(/\/$/, '');
              const redirectURL = `${base}${rest}`;
              return callback({ redirectURL });
            }
            const port = Number(process.env.PORT) || 4000;
            const redirectURL = `http://127.0.0.1:${port}/api${rest}`;
            return callback({ redirectURL });
          }
        }
      } catch {}
      callback({});
    });
  } catch {}

  // Start backend by default, but allow disabling via ELECTRON_NO_BACKEND=1.
  // Splash/UI are fully decoupled and will not wait for the backend.
  {
    const allowLocal = process.env.ELECTRON_NO_BACKEND === '1' ? false : (appConfig && appConfig.startLocalBackend === false ? false : true);
    if (allowLocal) startBackend();
  }

  // Always show splash (dev and prod). In prod, briefly wait for backend.
  createSplash();
  createMainWindow();

  // Force-close splash and show main after MIN_SPLASH_MS even if UI load events
  // are delayed. This fully decouples splash behavior from app/backend readiness.
  setTimeout(() => {
    try { splashReady = true; } catch {}
    try { mainReady = true; } catch {}
    try {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
        if (process.platform === 'win32') {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          setTimeout(() => { try { mainWindow.setAlwaysOnTop(false); } catch {} }, 100);
        }
        mainWindow.setSkipTaskbar(false);
      }
    } catch {}
  }, MIN_SPLASH_MS + 200);

  // Splash will be closed when main window is ready-to-show (after a minimum splash duration).

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplash();
      createMainWindow();
    }
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill(process.platform === 'win32' ? 'SIGTERM' : 'SIGINT');
    }
  } catch (e) {
    // ignore
  }
});

// Optional: allow splash to request closing itself earlier
ipcMain.handle('splash:ready', () => {
  splashReady = true;
  try {
    // In case main window is already loaded, attempt to show now
    if (mainWindow && mainWindow.webContents && mainWindow.webContents.isLoading() === false) {
      mainReady = true;
    }
  } catch {}
  // Defer actual close/show to the readiness check in createMainWindow
  try {
    const elapsed = Math.max(0, Date.now() - (splashShownAt || Date.now()));
    if (elapsed >= MIN_SPLASH_MS && mainReady) {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      try {
        mainWindow.show();
        mainWindow.focus();
        if (process.platform === 'win32') {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          setTimeout(() => { try { mainWindow.setAlwaysOnTop(false); } catch {} }, 100);
        }
        mainWindow.setSkipTaskbar(false);
      } catch {}
    }
  } catch {}
});
