# Frontend Development Workflow Rules

This document defines the mandatory workflow for making changes to the frontend/UI or served assets.

## Critical Workflow Rule

**After every meaningful update that affects the frontend/UI or served assets, you MUST:**

1. **Bump the build version** (patch increment, e.g. v1.4.5 → v1.4.6)
2. **Rebuild the frontend** so the served files contain the new version
3. **Restart the local server** on port 5555 so it serves the new build
4. **Verify the server is serving the new build** by checking the served JS (not just the file on disk)

## Step-by-Step Process

### 1. Bump Build Version

The build version is defined in **two files** (both must be updated to match):

- `src/examples/gaussian-splatting/reveal.controls.mjs` (line ~11)
- `src/examples/gaussian-splatting/reveal.example.mjs` (line ~10)

Update the `BUILD_VERSION` constant in both files:
```javascript
const BUILD_VERSION = 'v1.4.6';  // Increment patch version
```

**Where it's displayed in UI:**
- At the top of the settings panel as "Build: vX.Y.Z" (first item)
- In the Scene folder as "Build Version: vX.Y.Z" (read-only field)

### 2. Rebuild Frontend

From the `engine/examples/` directory, run:
```bash
cd engine/examples
npm run build
```

This command:
- Builds metadata
- Runs Rollup to compile and bundle all frontend assets
- Outputs to `dist/` directory

### 3. Restart Server

Stop any existing server process on port 5555, then start:
```bash
cd engine/examples
# Kill existing process if any
lsof -ti:5555 | xargs kill -9 2>/dev/null || true
# Start server
node simple-server.mjs
```

The server must bind to `127.0.0.1:5555` and serve from the `dist/` directory.

### 4. Verify Served Content

**CRITICAL**: Verify the server is actually serving the new version, not just check the file on disk.

Run this verification command:
```bash
curl -s "http://127.0.0.1:5555/iframe/gaussian-splatting_reveal.controls.mjs" | grep -n "BUILD_VERSION.*v1.4.6" || echo "ERROR: New version not found in served JS"
```

Replace `v1.4.6` with the actual new version you just set.

**Expected output:** Should show a line like:
```
11:const BUILD_VERSION = 'v1.4.6';
```

**If the verification fails:**
- The server may be serving cached content
- The server process may not have been restarted
- The build may not have completed successfully
- Check server logs for errors

## Quick Reference Commands

```bash
# 1. Update version in both files (manual edit required)
# reveal.controls.mjs and reveal.example.mjs

# 2. Rebuild
cd engine/examples && npm run build

# 3. Restart server
cd engine/examples
lsof -ti:5555 | xargs kill -9 2>/dev/null || true
node simple-server.mjs

# 4. Verify (replace v1.4.6 with actual new version)
curl -s "http://127.0.0.1:5555/iframe/gaussian-splatting_reveal.controls.mjs" | grep -n "BUILD_VERSION.*v1.4.6"
```

## Acceptance Criteria

After completing all steps, you should be able to:

1. Open: `http://127.0.0.1:5555/iframe/gaussian-splatting_reveal.html`
2. Immediately see the new build version in the UI:
   - At the top of the settings panel as "Build: vX.Y.Z"
   - In the Scene folder as "Build Version: vX.Y.Z"
3. Verify via curl that the served JS contains the new version

**No troubleshooting should be needed** - if the verification step passes, the UI will show the correct version.

## When to Follow This Workflow

Follow this workflow for:
- ✅ UI/UX changes
- ✅ Controls panel modifications
- ✅ Frontend code changes in `src/examples/gaussian-splatting/`
- ✅ Asset configuration changes
- ✅ Any change that affects what the user sees in the browser

You do NOT need to follow this for:
- ❌ Backend-only changes (e.g., `/api/scenes` endpoint logic)
- ❌ Documentation-only changes
- ❌ Test files
- ❌ Changes that don't affect the served frontend

## Troubleshooting

**Problem**: Verification shows old version even after rebuild and restart

**Solutions**:
1. Ensure you updated BOTH files (reveal.controls.mjs AND reveal.example.mjs)
2. Check that `npm run build` completed without errors
3. Verify the server was actually restarted (check process ID)
4. Try hard refresh in browser (Ctrl+Shift+R / Cmd+Shift+R)
5. Check browser console for errors loading the module

**Problem**: Server won't start on port 5555

**Solutions**:
1. Check if another process is using the port: `lsof -i:5555`
2. Kill the process: `lsof -ti:5555 | xargs kill -9`
3. Verify you're in the correct directory: `cd engine/examples`

