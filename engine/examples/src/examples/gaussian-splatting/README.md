# Gaussian Splatting Reveal Example

This example demonstrates reveal effects for Gaussian Splatting point clouds using PlayCanvas Engine.

## Features

- **Multiple Reveal Effects**: Radial, Rain, and Grid eruption animations
- **Scene Management**: Switch between multiple 3D scenes with smooth transitions
- **Settings Persistence**: Auto-save and restore settings via localStorage
- **Interactive Controls**: Real-time parameter adjustment via Lil GUI
- **Camera Controls**: Orbit camera with auto-rotate functionality

## Files

- `reveal.example.mjs` - Main example file
- `reveal.controls.mjs` - UI controls using Lil GUI
- `scene-config.mjs` - Scene configuration and asset management
- `settings-manager.mjs` - Settings persistence (localStorage)
- `script-factory.mjs` - Script creation and configuration helpers

## Build Version

The build version is tracked in both `reveal.example.mjs` and `reveal.controls.mjs`. Ensure both files have matching `BUILD_VERSION` constants.

## Usage

The example runs automatically when loaded in the PlayCanvas Examples viewer. Settings are automatically saved to localStorage and restored on reload.

## Effects

- **Radial**: Reveals points in a radial wave pattern from the center
- **Rain**: Points fall from above and land in place
- **Grid**: Points erupt in grid blocks with staggered timing

## Verification Checklist

### Optional Manual Checks

1. **Version Consistency**: Run from repository root (optional, before committing):
   ```bash
   node check-version.mjs
   ```
   Expected output: `✅ Version consistency check passed: vX.Y.Z`
   
   Note: This is a manual command, not an automated git hook. Run it manually when needed.

### Browser Testing (PlayCanvas Examples Viewer)

1. **Initial Load**:
   - Open the example in PlayCanvas Examples viewer
   - Verify the scene loads without errors
   - Check browser console for any errors (should be clean)
   - Initial scene should be "Future" with radial reveal effect active

2. **Effect Switching**:
   - Switch to "Rain" effect - verify points fall from above
   - Switch to "Grid" effect - verify grid eruption animation
   - Switch back to "Radial" effect - verify radial wave pattern
   - All effect switches should be smooth with no console errors

3. **Scene Switching** (all 10 scenes):
   - Switch to "Ceramic" - verify scene loads and transition works
   - Switch to "Room" - verify scene loads
   - Switch to "The Bull" - verify scene loads
   - Switch to "Cluster Fly XXL" - verify scene loads
   - Switch to "Bull 06 Selection" - verify scene loads
   - Switch to "Bull2" - verify scene loads
   - Switch to "Chair" - verify scene loads
   - Switch to "Chair2" - verify scene loads
   - Switch to "Skull" - verify scene loads
   - Switch back to "Future" - verify scene loads
   - All scene transitions should be smooth with reverse reveal animation

4. **Settings Persistence**:
   - Adjust any setting (e.g., Speed, Thickness, Point Size)
   - Reload the page
   - Verify settings are restored to the adjusted values
   - Check browser console for "✅ Loaded settings from localStorage" message

5. **Console Verification**:
   - Open browser DevTools console
   - Verify no JavaScript errors appear
   - Verify build version is logged: `[Build vX.Y.Z]`
   - Verify available scenes count: `count: 10 expected: 10`

### Files to Verify

- All module imports resolve correctly:
  - `./scene-config.mjs`
  - `./settings-manager.mjs`
  - `./script-factory.mjs`
- No duplicate function definitions in `reveal.example.mjs`
- All function calls use imported modules (not local definitions)
