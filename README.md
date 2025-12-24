# Gaussian Splatting Reveal Demo

A WebGL-based demo showcasing reveal effects for Gaussian Splatting scenes.

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- Modern browser with WebGL 2.0 support

### Running the Demo

1. **Start the server:**
   ```bash
   node standalone-server.mjs
   ```

2. **Open in browser:**
   Navigate to: `http://127.0.0.1:5555/iframe/gaussian-splatting_reveal.html`

The server will:
- Serve files from the `standalone-dist` directory
- Run on port 5555
- Set correct MIME types for `.mjs`, `.wasm`, `.ply`, and `.sog` files

### Troubleshooting

**Black screen:**
- Ensure all assets are downloaded (check Network tab in DevTools)
- Verify WebGL 2.0 is supported in your browser
- Check browser console for errors
- If using Git LFS, ensure binary files are pulled:
  ```bash
  git lfs install
  git lfs pull
  git lfs checkout
  ```

**Port already in use:**
- Stop any existing server on port 5555
- Or modify `PORT` in `standalone-server.mjs` to use a different port

**404 errors for static files:**
- Ensure the server is running from the repository root
- Verify `standalone-dist/static/` directory exists with required assets

**Module loading errors:**
- Check that `.mjs` files are served with `Content-Type: application/javascript`
- The Node server handles this automatically; Python's `http.server` may not

### Verification Checklist

- [ ] Server starts without errors
- [ ] Page loads at `http://127.0.0.1:5555/iframe/gaussian-splatting_reveal.html`
- [ ] No fatal console errors (warnings are acceptable)
- [ ] Control panel appears on the right side
- [ ] Scene renders in the canvas area (may need to click "Load Full Scene" button)
- [ ] All network requests return 200 status

## Project Structure

- `standalone-dist/` - Built distribution files
  - `iframe/` - Demo HTML and scripts
  - `static/` - Assets (splats, scripts, libraries)
- `standalone-server.mjs` - Development server
- `engine/` - PlayCanvas engine source

## Notes

- The demo uses ES modules, requiring a proper HTTP server (not `file://` protocol)
- Binary assets (`.ply`, `.sog`) are served as `application/octet-stream`
- WebAssembly files (`.wasm`) are served as `application/wasm`






