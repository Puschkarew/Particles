import { createServer } from 'http';
import { readFileSync, statSync, existsSync } from 'fs';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5555;
const ROOT_DIR = join(__dirname, 'standalone-dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.ply': 'application/octet-stream',
    '.sog': 'application/octet-stream',
    '.wasm': 'application/wasm'
};

const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    let pathname = req.url.split('?')[0];
    
    // Serve index.html for root
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    const filePath = join(ROOT_DIR, pathname);
    
    const normalizedPath = normalize(filePath);
    const normalizedRoot = normalize(ROOT_DIR);
    
    if (!normalizedPath.startsWith(normalizedRoot)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404);
        res.end('Not Found: ' + pathname);
        return;
    }
    
    try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
    } catch (err) {
        console.error('Error reading file:', err);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n✓ Standalone server running on http://127.0.0.1:${PORT}`);
    console.log(`✓ Open: http://127.0.0.1:${PORT}/iframe/gaussian-splatting_reveal.html\n`);
});























