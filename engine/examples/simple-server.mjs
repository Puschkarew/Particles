import { createServer } from 'http';
import { readFileSync, statSync, existsSync, readdirSync } from 'fs';
import { join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 5555;
const DIST_DIR = join(__dirname, 'dist');
// Source directory for splat files - this is the real folder on disk
const SPLATS_DIR = join(__dirname, 'assets', 'splats');

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

/**
 * Convert filename to scene ID (stable, sanitized identifier)
 * @param {string} filename - The filename without path
 * @returns {string} Scene ID
 */
function filenameToId(filename) {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Convert to lowercase, replace spaces and special chars with underscores
    return nameWithoutExt
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Convert filename to scene name (human-readable)
 * @param {string} filename - The filename without path
 * @returns {string} Scene name
 */
function filenameToName(filename) {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Return as-is (preserves spaces and capitalization)
    return nameWithoutExt;
}

/**
 * Handle /api/scenes endpoint - scans splats directory and returns all valid scene files
 */
function handleApiScenes(req, res) {
    // Log the absolute directory being scanned
    console.log(`[API /api/scenes] Scanning directory: ${SPLATS_DIR}`);
    
    // Set JSON response headers with no-cache
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    try {
        // Check if directory exists
        if (!existsSync(SPLATS_DIR)) {
            console.error(`[API /api/scenes] Directory does not exist: ${SPLATS_DIR}`);
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Splats directory not found' }));
            return;
        }
        
        const stats = statSync(SPLATS_DIR);
        if (!stats.isDirectory()) {
            console.error(`[API /api/scenes] Path is not a directory: ${SPLATS_DIR}`);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Splats path is not a directory' }));
            return;
        }
        
        // Read directory contents (fresh read on every request - no caching)
        const files = readdirSync(SPLATS_DIR);
        console.log(`[API /api/scenes] Found ${files.length} files in directory`);
        
        // Valid scene file extensions (case-insensitive)
        const validExtensions = ['.ply', '.sog', '.splat', '.ksplat', '.spz'];
        
        // Filter and process scene files
        const scenes = files
            .filter(file => {
                // Check if it's a file (not a directory)
                const filePath = join(SPLATS_DIR, file);
                try {
                    const fileStats = statSync(filePath);
                    if (!fileStats.isFile()) {
                        return false;
                    }
                } catch (err) {
                    return false;
                }
                
                // Check extension (case-insensitive)
                const ext = extname(file).toLowerCase();
                return validExtensions.includes(ext);
            })
            .map(file => {
                const id = filenameToId(file);
                const name = filenameToName(file);
                // Generate URL-encoded filename for use in URLs
                const encodedFilename = encodeURIComponent(file);
                return {
                    id,
                    name,
                    filename: file,
                    url: `/static/assets/splats/${encodedFilename}`
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name
        
        console.log(`[API /api/scenes] Returning ${scenes.length} valid scenes`);
        
        // Return as JSON object with scenes array (matches verification command format)
        res.writeHead(200);
        res.end(JSON.stringify({ scenes }));
        
    } catch (error) {
        console.error(`[API /api/scenes] Error scanning directory:`, error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Failed to scan splats directory', message: error.message }));
    }
}

const server = createServer((req, res) => {
    // Устанавливаем заголовки для отключения кэширования (более агрессивные)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('ETag', `"${Date.now()}"`);
    
    let pathname = req.url.split('?')[0]; // Убираем query параметры
    
    // Handle /api/scenes endpoint
    if (pathname === '/api/scenes') {
        handleApiScenes(req, res);
        return;
    }
    
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






