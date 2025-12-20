# Scene Loading Issue Diagnosis & Fix

## Problem Summary

Scenes appear in the dropdown but do not load when selected. The system was using a hardcoded scene list while the API provides a dynamic list, causing new scenes to fail silently.

## Root Cause Analysis

1. **Hardcoded Scene Configuration**: The code used `AVAILABLE_SCENES` from `scene-config.mjs` instead of fetching from API
2. **Pre-configured Assets Only**: Assets were only created for hardcoded scenes during initialization
3. **No Dynamic Asset Creation**: When new scenes were selected, `createSceneEntity` would fail because:
   - The scene wasn't in `availableScenes` array (which came from hardcoded list)
   - The asset didn't exist for that scene ID
4. **Silent Failures**: Errors were logged but not clearly communicated

## Fixes Implemented

### 1. Dynamic Scene Loading from API
- Added `fetchScenesFromAPI()` function that:
  - Fetches scenes from `/api/scenes` endpoint
  - Builds `sceneInfoMap` (Map of sceneId → scene info including URL)
  - Falls back to hardcoded scenes if API fails
  - Called with `await` at module level before initialization

### 2. Dynamic Asset Creation
- Created `getOrCreateAsset()` function that:
  - Checks if asset exists for a scene ID
  - If not, creates it dynamically using URL from API response
  - Registers the asset with PlayCanvas asset registry
- Updated `createSceneEntity()` to use `getOrCreateAsset()` instead of expecting pre-existing assets

### 3. Enhanced Error Handling
- Added comprehensive error logging with build version prefix
- Implemented `sceneLoadError` event emission with detailed error information
- Updated `changeToScene()` to:
  - Validate scene exists before attempting load
  - Handle asset loading asynchronously using `app.assets.load()` and callbacks
  - Provide clear error messages with scene name, URL, and failure reason
  - Handle both 'ready' and 'error' events on assets
- Added error handling in controls to listen for `sceneLoadError` events

### 4. Asset Loading
- Changed from `asset.load()` to `app.assets.load(asset)` (correct PlayCanvas API)
- Added error event handler for asset loading failures
- Added proper callback handling for asset ready state

## Files Modified

1. **engine/examples/src/examples/gaussian-splatting/reveal.example.mjs**
   - Added `fetchScenesFromAPI()` function (lines ~64-116)
   - Added `getOrCreateAsset()` function (lines ~189-219)
   - Updated `createSceneEntity()` with dynamic asset creation (lines ~222-287)
   - Updated `changeToScene()` with async asset loading and error handling (lines ~323-403)
   - Fixed initial scene creation to use API scenes
   - Updated BUILD_VERSION to v1.5.0

2. **engine/examples/src/examples/gaussian-splatting/reveal.controls.mjs**
   - Added `sceneLoadError` event handler for better error feedback (lines ~503-543)
   - Updated BUILD_VERSION to v1.5.0

## Testing Status

### Files Verified Accessible (HTTP 200):
- ✅ `/static/assets/splats/chair2.ply` - 200 OK
- ✅ `/static/assets/splats/cluster%20fly%20XXL.ply` - 200 OK
- ✅ `/api/scenes` - Returns 10 scenes correctly

### UI Status:
- ✅ Build version v1.5.0 visible in UI
- ✅ Scene dropdown populated with 10 scenes from API
- ⚠️ Scene selection needs manual testing (browser automation limitations)

### Console Logs Expected:
When scenes are selected, you should see logs like:
- `[Build v1.5.0] 🎬 Changing to scene "chair2" (chair2)`
- `[Build v1.5.0] Creating asset dynamically for scene "chair2" with URL: /static/assets/splats/chair2.ply`
- `[Build v1.5.0] ⏳ Asset for "chair2" not loaded, loading now...`
- `[Build v1.5.0] ✅ Asset for "chair2" loaded successfully`
- `[Build v1.5.0] ✅ Created scene entity for "chair2" (chair2)`

If errors occur, you'll see:
- `[Build v1.5.0] ❌ Scene change failed: [reason]`
- `[Build v1.5.0] ❌ Failed to load asset for "[sceneId]": [error]`

## Manual Testing Required

Due to browser automation limitations with dropdowns, manual testing is needed:

1. Open browser console (F12)
2. Select a scene from dropdown (e.g., "chair2", "cluster fly XXL")
3. Check console for logs showing:
   - Scene change initiation
   - Asset creation/loading
   - Success or error messages
4. Check Network tab for HTTP requests to scene files
5. Verify scene loads visually

## Next Steps

1. Manually test scene selection with browser console open
2. Verify all scenes load correctly
3. Test with newly added scene files
4. Verify error messages are clear when failures occur
5. If issues persist, check console logs for specific error messages

