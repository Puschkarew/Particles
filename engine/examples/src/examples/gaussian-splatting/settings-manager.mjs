/**
 * Settings Manager for Gaussian Splatting Reveal Example
 * Handles localStorage persistence and auto-save functionality
 */

const SETTINGS_STORAGE_KEY = 'reveal-settings';

/**
 * List of all settings keys to save (excludes hidden motion parameters)
 */
export const SETTINGS_KEYS = [
    'speed', 'acceleration', 'delay', 'pointMotionSpeed', 'floatMotionSpeed',
    'pointCloudScale',
    'pointCloudDensity', 'dotWaveThickness', 'oceanWaveThickness', 'oceanWaveInterval',
    'oceanWaveSpeedMultiplier', 'oceanWaveLiftScale', 'oceanWaveBrightness',
    'waveSpeed', 'waveAmplitude', 'distanceDarkening', 'baseBrightness',
    'oscillationIntensity', 'endRadius', 'revealStartRadius',
    'pointCloudOpacity', 'dotTintHex', 'effect',
    'loadFullSceneDuration', 'loadFullSceneWaveThickness', 'loadFullSceneMotionFadeRange',
    'hideSceneDuration', 'hideSceneMode', 'hideSceneLayerThickness'
];

/**
 * Load settings from localStorage
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @returns {object|null} Loaded settings object or null if none found
 */
export function loadSettings(observer) {
    try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved) {
            const settings = JSON.parse(saved);
            // Apply all saved settings to observer
            Object.keys(settings).forEach(key => {
                observer.set(key, settings[key]);
            });
            // Force hidden motion parameters to 0 (they should not be saved/loaded)
            observer.set('dispersiveMotionSpeed', 0);
            observer.set('flagMotionSpeed', 0);
            observer.set('waveMotionSpeed', 0);
            return settings;
        }
    } catch (e) {
        console.warn('Failed to load settings from localStorage:', e);
    }
    return null;
}

/**
 * Save settings to localStorage
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 */
export function saveSettings(observer) {
    try {
        const settings = {};
        
        SETTINGS_KEYS.forEach(key => {
            const value = observer.get(key);
            if (value !== undefined && value !== null) {
                settings[key] = value;
            }
        });
        
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        console.log('Settings saved to localStorage:', settings);
    } catch (e) {
        console.warn('Failed to save settings to localStorage:', e);
    }
}

/**
 * Initialize auto-save functionality with debouncing
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {object} savedSettings - Previously loaded settings (if any)
 * @param {Function} onSave - Optional callback when settings are saved
 */
export function initializeAutoSave(observer, savedSettings = null, onSave = null) {
    // Debounce save to avoid too frequent localStorage writes
    let saveTimeout = null;
    const debouncedSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentSpeed = observer.get('speed');
            console.log('💾 Saving settings to localStorage, current speed:', currentSpeed);
            saveSettings(observer);
            if (onSave) onSave();
        }, 300); // Save after 300ms of inactivity
    };

    // Listen to all setting changes and auto-save (but only after initial setup)
    // IMPORTANT: Don't save during initial load to prevent overwriting saved settings with defaults
    let settingsInitialized = false;
    let initialLoadComplete = false;
    
    // Mark initial load as complete after a delay (to allow controls to initialize and settings to stabilize)
    setTimeout(() => {
        initialLoadComplete = true;
        console.log('✅ Initial load complete, auto-save enabled');
    }, 600); // Increased delay to ensure all initialization is done
    
    setTimeout(() => {
        settingsInitialized = true;
        SETTINGS_KEYS.forEach(key => {
            observer.on(`${key}:set`, (value) => {
                // Only save if:
                // 1. Settings system is initialized
                // 2. Initial load is complete (prevents saving defaults during load)
                // 3. This is not the initial load of saved settings
                if (settingsInitialized && initialLoadComplete) {
                    // Check if this is a user-initiated change (not from loading saved settings)
                    const isUserChange = !savedSettings || savedSettings[key] === undefined || Math.abs(savedSettings[key] - value) > 0.001;
                    if (isUserChange) {
                        console.log(`📝 User changed setting: ${key} = ${value}, will save...`);
                        debouncedSave();
                    } else {
                        console.log(`⏸️ Setting ${key} = ${value} matches saved value, skipping save`);
                    }
                } else {
                    console.log(`⏸️ Setting changed during initial load: ${key} = ${value}, skipping save`);
                }
            });
        });
    }, 200);
}
