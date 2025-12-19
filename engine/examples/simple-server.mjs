import { createServer } from 'http';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5555;
const DIST_DIR = join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = createServer((req, res) => {
    // Устанавливаем заголовки для отключения кэширования (более агрессивные)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${Date.now()}"`);
    
    let pathname = req.url.split('?')[0]; // Убираем query параметры
    
    // Обработка корневого пути
    if (pathname === '/' || pathname === '/index.html') {
        pathname = '/index.html';
    }
    
    const filePath = join(DIST_DIR, pathname);
    
    // Проверка безопасности пути
    const normalizedPath = normalize(filePath);
    const normalizedDist = normalize(DIST_DIR);
    
    if (!normalizedPath.startsWith(normalizedDist)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        // Если файл не найден, пробуем index.html
        const indexPath = join(DIST_DIR, 'index.html');
        if (existsSync(indexPath)) {
            const content = readFileSync(indexPath);
            const ext = extname(indexPath);
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
            res.end(content);
            return;
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
    }
    
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
    } catch (err) {
        console.error('Error reading file:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log(`\n✓ Сервер запущен на http://localhost:${PORT}`);
    console.log(`✓ Откройте в браузере: http://localhost:${PORT}/index.html#/gaussian-splatting/reveal\n`);
});






