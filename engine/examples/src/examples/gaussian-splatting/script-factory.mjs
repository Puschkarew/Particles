/**
 * Script Factory for Gaussian Splatting Reveal Example
 * Creates and configures reveal effect scripts
 */

import * as pc from 'playcanvas';

// Minimum radius so splats stay visible even when the camera is very far away
const MIN_END_RADIUS = 5000;
const MIN_POINT_CLOUD_SCALE = 1.2;
const MIN_POINT_CLOUD_DENSITY = 1.0;
const MIN_POINT_CLOUD_OPACITY = 0.9;

/**
 * Helper function to apply observer settings to radial script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The radial reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToRadialScript(observer, script, force = false) {
    if (!script) return;
    
    // Apply settings from observer - force mode applies even if value is 0
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const acceleration = observer.get('acceleration');
    if (force || (acceleration !== undefined && acceleration !== null)) {
        script.acceleration = acceleration !== undefined && acceleration !== null ? acceleration : script.acceleration;
    }
    
    const delay = observer.get('delay');
    if (force || (delay !== undefined && delay !== null)) {
        script.delay = delay !== undefined && delay !== null ? delay : script.delay;
    }
    
    const oscillationIntensity = observer.get('oscillationIntensity');
    if (force || (oscillationIntensity !== undefined && oscillationIntensity !== null)) {
        script.oscillationIntensity = oscillationIntensity !== undefined && oscillationIntensity !== null ? oscillationIntensity : script.oscillationIntensity;
    }
    
    const endRadius = observer.get('endRadius');
    if (force || (endRadius !== undefined && endRadius !== null)) {
        const targetEndRadius = endRadius !== undefined && endRadius !== null ? endRadius : script.endRadius;
        script.endRadius = Math.max(targetEndRadius, MIN_END_RADIUS);
        observer.set('endRadius', script.endRadius); // keep observer in sync with enforced minimum
    } else {
        // enforce minimum even when observer has no value
        script.endRadius = Math.max(script.endRadius, MIN_END_RADIUS);
        observer.set('endRadius', script.endRadius);
    }
    
    const revealStartRadius = observer.get('revealStartRadius');
    if (force || (revealStartRadius !== undefined && revealStartRadius !== null)) {
        script.revealStartRadius = revealStartRadius !== undefined && revealStartRadius !== null ? revealStartRadius : script.revealStartRadius;
    }
    
    const pointCloudScale = observer.get('pointCloudScale');
    if (force || (pointCloudScale !== undefined && pointCloudScale !== null)) {
        const targetScale = pointCloudScale !== undefined && pointCloudScale !== null ? pointCloudScale : script.pointCloudScale;
        script.pointCloudScale = Math.max(targetScale, MIN_POINT_CLOUD_SCALE);
        observer.set('pointCloudScale', script.pointCloudScale);
    } else {
        script.pointCloudScale = Math.max(script.pointCloudScale, MIN_POINT_CLOUD_SCALE);
        observer.set('pointCloudScale', script.pointCloudScale);
    }
    
    const pointCloudDensity = observer.get('pointCloudDensity');
    if (force || (pointCloudDensity !== undefined && pointCloudDensity !== null)) {
        const targetDensity = pointCloudDensity !== undefined && pointCloudDensity !== null ? pointCloudDensity : script.pointCloudDensity;
        script.pointCloudDensity = Math.max(Math.min(targetDensity, 1.0), MIN_POINT_CLOUD_DENSITY);
        observer.set('pointCloudDensity', script.pointCloudDensity);
    } else {
        script.pointCloudDensity = Math.max(Math.min(script.pointCloudDensity, 1.0), MIN_POINT_CLOUD_DENSITY);
        observer.set('pointCloudDensity', script.pointCloudDensity);
    }
    
    const pointCloudOpacity = observer.get('pointCloudOpacity');
    if (force || (pointCloudOpacity !== undefined && pointCloudOpacity !== null)) {
        const targetOpacity = pointCloudOpacity !== undefined && pointCloudOpacity !== null ? pointCloudOpacity : script.pointCloudOpacity;
        script.pointCloudOpacity = Math.max(targetOpacity, MIN_POINT_CLOUD_OPACITY);
        observer.set('pointCloudOpacity', script.pointCloudOpacity);
    } else {
        script.pointCloudOpacity = Math.max(script.pointCloudOpacity, MIN_POINT_CLOUD_OPACITY);
        observer.set('pointCloudOpacity', script.pointCloudOpacity);
    }
    
    const dotWaveThickness = observer.get('dotWaveThickness');
    if (force || (dotWaveThickness !== undefined && dotWaveThickness !== null)) {
        script.dotWaveThickness = dotWaveThickness !== undefined && dotWaveThickness !== null ? dotWaveThickness : script.dotWaveThickness;
    }
    
    const oceanWaveThickness = observer.get('oceanWaveThickness');
    if (force || (oceanWaveThickness !== undefined && oceanWaveThickness !== null)) {
        script.oceanWaveThickness = oceanWaveThickness !== undefined && oceanWaveThickness !== null ? oceanWaveThickness : script.oceanWaveThickness;
    }
    
    const oceanWaveInterval = observer.get('oceanWaveInterval');
    if (force || (oceanWaveInterval !== undefined && oceanWaveInterval !== null)) {
        script.oceanWaveInterval = oceanWaveInterval !== undefined && oceanWaveInterval !== null ? oceanWaveInterval : script.oceanWaveInterval;
    }
    
    const oceanWaveSpeedMultiplier = observer.get('oceanWaveSpeedMultiplier');
    if (force || (oceanWaveSpeedMultiplier !== undefined && oceanWaveSpeedMultiplier !== null)) {
        script.oceanWaveSpeedMultiplier = oceanWaveSpeedMultiplier !== undefined && oceanWaveSpeedMultiplier !== null ? oceanWaveSpeedMultiplier : script.oceanWaveSpeedMultiplier;
    }
    
    const oceanWaveLiftScale = observer.get('oceanWaveLiftScale');
    if (force || (oceanWaveLiftScale !== undefined && oceanWaveLiftScale !== null)) {
        script.oceanWaveLiftScale = oceanWaveLiftScale !== undefined && oceanWaveLiftScale !== null ? oceanWaveLiftScale : script.oceanWaveLiftScale;
    }
    
    const oceanWaveBrightness = observer.get('oceanWaveBrightness');
    if (force || (oceanWaveBrightness !== undefined && oceanWaveBrightness !== null)) {
        script.oceanWaveBrightness = oceanWaveBrightness !== undefined && oceanWaveBrightness !== null ? oceanWaveBrightness : script.oceanWaveBrightness;
    }
    
    const waveSpeed = observer.get('waveSpeed');
    if (force || (waveSpeed !== undefined && waveSpeed !== null)) {
        script.waveSpeed = waveSpeed !== undefined && waveSpeed !== null ? waveSpeed : script.waveSpeed;
    }
    
    const waveAmplitude = observer.get('waveAmplitude');
    if (force || (waveAmplitude !== undefined && waveAmplitude !== null)) {
        script.waveAmplitude = waveAmplitude !== undefined && waveAmplitude !== null ? waveAmplitude / 10 : script.waveAmplitude; // Convert from 0-1 to 0-0.1
    }
    
    const distanceDarkening = observer.get('distanceDarkening');
    if (force || (distanceDarkening !== undefined && distanceDarkening !== null)) {
        script.distanceDarkening = distanceDarkening !== undefined && distanceDarkening !== null ? distanceDarkening : script.distanceDarkening;
    }
    
    const baseBrightness = observer.get('baseBrightness');
    if (force || (baseBrightness !== undefined && baseBrightness !== null)) {
        script.baseBrightness = baseBrightness !== undefined && baseBrightness !== null ? baseBrightness : script.baseBrightness;
    }
    
    const floatMotionSpeed = observer.get('floatMotionSpeed');
    if (force || (floatMotionSpeed !== undefined && floatMotionSpeed !== null)) {
        script.floatMotionSpeed = floatMotionSpeed !== undefined && floatMotionSpeed !== null ? floatMotionSpeed : script.floatMotionSpeed;
    }
    
    const dispersiveMotionSpeed = observer.get('dispersiveMotionSpeed');
    if (force || (dispersiveMotionSpeed !== undefined && dispersiveMotionSpeed !== null)) {
        script.dispersiveMotionSpeed = dispersiveMotionSpeed !== undefined && dispersiveMotionSpeed !== null ? dispersiveMotionSpeed : script.dispersiveMotionSpeed;
    }
    
    const flagMotionSpeed = observer.get('flagMotionSpeed');
    if (force || (flagMotionSpeed !== undefined && flagMotionSpeed !== null)) {
        script.flagMotionSpeed = flagMotionSpeed !== undefined && flagMotionSpeed !== null ? flagMotionSpeed : script.flagMotionSpeed;
    }
    
    const waveMotionSpeed = observer.get('waveMotionSpeed');
    if (force || (waveMotionSpeed !== undefined && waveMotionSpeed !== null)) {
        script.waveMotionSpeed = waveMotionSpeed !== undefined && waveMotionSpeed !== null ? waveMotionSpeed : script.waveMotionSpeed;
    }
    
    const pointMotionSpeed = observer.get('pointMotionSpeed');
    if (force || (pointMotionSpeed !== undefined && pointMotionSpeed !== null)) {
        script.pointMotionSpeed = pointMotionSpeed !== undefined && pointMotionSpeed !== null ? pointMotionSpeed : script.pointMotionSpeed;
    }
    
    // Load Full Scene animation settings
    const loadFullSceneWaveThickness = observer.get('loadFullSceneWaveThickness');
    if (force || (loadFullSceneWaveThickness !== undefined && loadFullSceneWaveThickness !== null)) {
        script.loadFullSceneWaveThickness = loadFullSceneWaveThickness !== undefined && loadFullSceneWaveThickness !== null ? loadFullSceneWaveThickness : script.loadFullSceneWaveThickness;
    }
    
    const loadFullSceneMotionFadeRange = observer.get('loadFullSceneMotionFadeRange');
    if (force || (loadFullSceneMotionFadeRange !== undefined && loadFullSceneMotionFadeRange !== null)) {
        script.loadFullSceneMotionFadeRange = loadFullSceneMotionFadeRange !== undefined && loadFullSceneMotionFadeRange !== null ? loadFullSceneMotionFadeRange : script.loadFullSceneMotionFadeRange;
    }
    
    // Hide Scene animation settings
    const hideSceneMode = observer.get('hideSceneMode');
    if (force || (hideSceneMode !== undefined && hideSceneMode !== null)) {
        script.hideSceneMode = hideSceneMode !== undefined && hideSceneMode !== null ? hideSceneMode : script.hideSceneMode;
    }
    
    const hideSceneLayerThickness = observer.get('hideSceneLayerThickness');
    if (force || (hideSceneLayerThickness !== undefined && hideSceneLayerThickness !== null)) {
        script.hideSceneLayerThickness = hideSceneLayerThickness !== undefined && hideSceneLayerThickness !== null ? hideSceneLayerThickness : script.hideSceneLayerThickness;
    }
    
    // Set Y range based on endRadius (approximate scene bounds)
    const hideEndRadius = observer.get('endRadius') || script.endRadius || 25;
    script.hideSceneMinY = -hideEndRadius;
    script.hideSceneMaxY = hideEndRadius;
    
    // Color settings
    const dotTintHex = observer.get('dotTintHex');
    if (dotTintHex) {
        const dotTintMatch = dotTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (dotTintMatch) {
            script.dotTint.set(
                parseInt(dotTintMatch[1], 16) / 255,
                parseInt(dotTintMatch[2], 16) / 255,
                parseInt(dotTintMatch[3], 16) / 255
            );
        }
    }
}

/**
 * Helper to get or create box shader effect on an entity
 * @param {pc.Entity} entity - The entity
 * @param {any} GsplatBoxShaderEffect - The box shader effect class
 * @returns {any|null} The box shader effect instance or null
 */
export function getOrCreateBoxEffect(entity, GsplatBoxShaderEffect) {
    if (!entity) return null;
    if (!entity.script) {
        entity.addComponent('script');
    }
    let effect = entity.script.get(GsplatBoxShaderEffect.scriptName);
    if (!effect) {
        effect = entity.script.create(GsplatBoxShaderEffect);
    }
    return effect;
}

/**
 * Create radial reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealRadial - The radial reveal script class
 * @param {boolean} reverseMode - Whether to use reverse mode
 * @param {number} reverseSpeedValue - Reverse speed value
 * @returns {any|null} The created script instance or null
 */
export function createRadialScript(observer, entity, GsplatRevealRadial, reverseMode = false, reverseSpeedValue = 5.0) {
    if (!entity) {
        console.error('createRadialScript: entity is null or undefined');
        return null;
    }
    if (!entity.script) {
        console.error('createRadialScript: entity missing script component', entity.name);
        return null;
    }
    if (!entity.gsplat) {
        console.error('createRadialScript: entity missing gsplat component', entity.name);
        return null;
    }
    if (!GsplatRevealRadial) {
        console.error('createRadialScript: GsplatRevealRadial is not available');
        return null;
    }

    try {
        // Destroy any existing reveal script first
        entity.script?.destroy(GsplatRevealRadial.scriptName);
        
        const script = entity.script.create(GsplatRevealRadial);
        if (!script) {
            console.error('createRadialScript: failed to create script instance');
            return null;
        }

        try {
            script.center.set(0, 0, 0);
            // Set default values first (will be overridden by applySettingsToRadialScript if settings exist)
            script.speed = 5;
            script.acceleration = 0;
            script.delay = 3;
            script.dotTint.set(0, 1, 1); // Cyan
            script.waveTint.set(1, 0.5, 0); // Orange
            script.oscillationIntensity = 0.2;
            script.endRadius = 25;
            // Новые параметры для эффекта опускания
            script.descentHeight = 0.5; // Высота, с которой начинают падать точки
            script.descentDuration = 2.5; // Расстояние, на котором происходит опускание
            // Reverse mode parameters
            script.reverseMode = reverseMode;
            script.reverseSpeed = reverseMode ? reverseSpeedValue : 1.0;
            // Apply ALL settings from observer (will override defaults if they exist)
            // This is the key: applySettingsToRadialScript reads from observer and applies to script
            // Use force=true to ensure settings are applied even if they are 0 or falsy
            applySettingsToRadialScript(observer, script, true);
            
            // Double-check critical settings after application
            const finalSpeed = observer.get('speed');
            if (finalSpeed !== undefined && finalSpeed !== null && Math.abs(script.speed - finalSpeed) > 0.001) {
                console.warn(`Speed mismatch in createRadialScript: script has ${script.speed}, observer has ${finalSpeed}, fixing...`);
                script.speed = finalSpeed;
            }
            
            // Ensure script is enabled to apply shaders
            script.enabled = true;
        } catch (error) {
            console.error('createRadialScript: error setting script properties:', error);
            // Try to destroy the script if property setting failed
            try {
                entity.script.destroy(GsplatRevealRadial.scriptName);
            } catch (destroyError) {
                console.error('createRadialScript: error destroying failed script:', destroyError);
            }
            return null;
        }

        return script;
    } catch (error) {
        console.error('createRadialScript: unexpected error:', error);
        return null;
    }
}

/**
 * Helper function to apply observer settings to rain script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The rain reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToRainScript(observer, script, force = false) {
    if (!script) return;
    
    // Apply settings from observer - force mode applies even if value is 0
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const acceleration = observer.get('acceleration');
    if (force || (acceleration !== undefined && acceleration !== null)) {
        script.acceleration = acceleration !== undefined && acceleration !== null ? acceleration : script.acceleration;
    }
    
    const rainDistance = observer.get('rainDistance');
    if (force || (rainDistance !== undefined && rainDistance !== null)) {
        script.distance = rainDistance !== undefined && rainDistance !== null ? rainDistance : script.distance;
    }
    
    const rainFlightTime = observer.get('rainFlightTime');
    if (force || (rainFlightTime !== undefined && rainFlightTime !== null)) {
        script.flightTime = rainFlightTime !== undefined && rainFlightTime !== null ? rainFlightTime : script.flightTime;
    }
    
    const rainSize = observer.get('rainSize');
    if (force || (rainSize !== undefined && rainSize !== null)) {
        script.rainSize = rainSize !== undefined && rainSize !== null ? rainSize : script.rainSize;
    }
    
    const rainRotation = observer.get('rainRotation');
    if (force || (rainRotation !== undefined && rainRotation !== null)) {
        script.rotation = rainRotation !== undefined && rainRotation !== null ? rainRotation : script.rotation;
    }
    
    // Color settings
    const rainFallTintHex = observer.get('rainFallTintHex');
    if (rainFallTintHex) {
        const fallTintMatch = rainFallTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (fallTintMatch) {
            script.fallTint.set(
                parseInt(fallTintMatch[1], 16) / 255,
                parseInt(fallTintMatch[2], 16) / 255,
                parseInt(fallTintMatch[3], 16) / 255
            );
        }
    }
    
    const rainFallTintIntensity = observer.get('rainFallTintIntensity');
    if (force || (rainFallTintIntensity !== undefined && rainFallTintIntensity !== null)) {
        script.fallTintIntensity = rainFallTintIntensity !== undefined && rainFallTintIntensity !== null ? rainFallTintIntensity : script.fallTintIntensity;
    }
    
    const rainHitTintHex = observer.get('rainHitTintHex');
    if (rainHitTintHex) {
        const hitTintMatch = rainHitTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (hitTintMatch) {
            script.hitTint.set(
                parseInt(hitTintMatch[1], 16) / 255,
                parseInt(hitTintMatch[2], 16) / 255,
                parseInt(hitTintMatch[3], 16) / 255
            );
        }
    }
    
    const rainHitDuration = observer.get('rainHitDuration');
    if (force || (rainHitDuration !== undefined && rainHitDuration !== null)) {
        script.hitDuration = rainHitDuration !== undefined && rainHitDuration !== null ? rainHitDuration : script.hitDuration;
    }
}

/**
 * Create rain reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealRain - The rain reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createRainScript(observer, entity, GsplatRevealRain) {
    const script = entity.script?.create(GsplatRevealRain);
    if (script) {
        script.center.set(0, 0, 0);
        // Set default values first (will be overridden by applySettingsToRainScript if settings exist)
        script.distance = 30;
        script.speed = 3;
        script.acceleration = 0;
        script.flightTime = 2;
        script.rainSize = 0.015;
        script.rotation = 0.9; // 90% of full circle rotation during fall
        script.fallTint.set(0, 1, 1); // Cyan tint during fall
        script.fallTintIntensity = 0.2;
        script.hitTint.set(2, 0, 0); // Bright red flash on landing
        script.hitDuration = 0.5;
        script.endRadius = 25;
        // Apply ALL settings from observer (will override defaults if they exist)
        // Use force=true to ensure settings are applied even if they are 0 or falsy
        applySettingsToRainScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to grid script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The grid reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToGridScript(observer, script, force = false) {
    if (!script) return;
    
    const gridBlockCount = observer.get('gridBlockCount');
    if (force || (gridBlockCount !== undefined && gridBlockCount !== null)) {
        script.blockCount = gridBlockCount !== undefined && gridBlockCount !== null ? gridBlockCount : script.blockCount;
    }
    
    const gridBlockSize = observer.get('gridBlockSize');
    if (force || (gridBlockSize !== undefined && gridBlockSize !== null)) {
        script.blockSize = gridBlockSize !== undefined && gridBlockSize !== null ? gridBlockSize : script.blockSize;
    }
    
    const gridDelay = observer.get('gridDelay');
    if (force || (gridDelay !== undefined && gridDelay !== null)) {
        script.delay = gridDelay !== undefined && gridDelay !== null ? gridDelay : script.delay;
    }
    
    const gridDuration = observer.get('gridDuration');
    if (force || (gridDuration !== undefined && gridDuration !== null)) {
        script.duration = gridDuration !== undefined && gridDuration !== null ? gridDuration : script.duration;
    }
    
    const gridDotSize = observer.get('gridDotSize');
    if (force || (gridDotSize !== undefined && gridDotSize !== null)) {
        script.dotSize = gridDotSize !== undefined && gridDotSize !== null ? gridDotSize : script.dotSize;
    }
    
    const gridMoveTintHex = observer.get('gridMoveTintHex');
    if (gridMoveTintHex) {
        const moveTintMatch = gridMoveTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (moveTintMatch) {
            script.moveTint.set(
                parseInt(moveTintMatch[1], 16) / 255,
                parseInt(moveTintMatch[2], 16) / 255,
                parseInt(moveTintMatch[3], 16) / 255
            );
        }
    }
    
    const gridMoveTintIntensity = observer.get('gridMoveTintIntensity');
    if (force || (gridMoveTintIntensity !== undefined && gridMoveTintIntensity !== null)) {
        script.moveTintIntensity = gridMoveTintIntensity !== undefined && gridMoveTintIntensity !== null ? gridMoveTintIntensity : script.moveTintIntensity;
    }
    
    const gridLandTintHex = observer.get('gridLandTintHex');
    if (gridLandTintHex) {
        const landTintMatch = gridLandTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (landTintMatch) {
            script.landTint.set(
                parseInt(landTintMatch[1], 16) / 255,
                parseInt(landTintMatch[2], 16) / 255,
                parseInt(landTintMatch[3], 16) / 255
            );
        }
    }
    
    const gridLandDuration = observer.get('gridLandDuration');
    if (force || (gridLandDuration !== undefined && gridLandDuration !== null)) {
        script.landDuration = gridLandDuration !== undefined && gridLandDuration !== null ? gridLandDuration : script.landDuration;
    }
}

/**
 * Create grid eruption reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealGridEruption - The grid eruption reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createGridScript(observer, entity, GsplatRevealGridEruption) {
    const script = entity.script?.create(GsplatRevealGridEruption);
    if (script) {
        script.center.set(0, 0, 0);
        script.blockCount = 10;
        script.blockSize = 2;
        script.delay = 0.2;
        script.duration = 1.0;
        script.dotSize = 0.01;
        script.moveTint.set(1, 0, 1); // Magenta during movement
        script.moveTintIntensity = 0.2; // 20% blend with original color
        script.landTint.set(2, 2, 0); // Yellow flash on landing
        script.landDuration = 0.6;
        script.endRadius = 25;
        applySettingsToGridScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Create instant reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealInstant - The instant reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createInstantScript(observer, entity, GsplatRevealInstant) {
    const script = entity.script?.create(GsplatRevealInstant);
    if (script) {
        script.endRadius = 5000;
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to fade script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The fade reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToFadeScript(observer, script, force = false) {
    if (!script) return;
    
    const fadeDuration = observer.get('fadeDuration');
    if (force || (fadeDuration !== undefined && fadeDuration !== null)) {
        script.duration = fadeDuration !== undefined && fadeDuration !== null ? fadeDuration : script.duration;
    }
}

/**
 * Create fade reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealFade - The fade reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createFadeScript(observer, entity, GsplatRevealFade) {
    const script = entity.script?.create(GsplatRevealFade);
    if (script) {
        script.duration = 2.0;
        script.endRadius = 5000;
        applySettingsToFadeScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to spread script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The spread reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToSpreadScript(observer, script, force = false) {
    if (!script) return;
    
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const acceleration = observer.get('acceleration');
    if (force || (acceleration !== undefined && acceleration !== null)) {
        script.acceleration = acceleration !== undefined && acceleration !== null ? acceleration : script.acceleration;
    }
    
    const spreadAngle = observer.get('spreadAngle');
    if (force || (spreadAngle !== undefined && spreadAngle !== null)) {
        script.spreadAngle = spreadAngle !== undefined && spreadAngle !== null ? spreadAngle : script.spreadAngle;
    }
    
    const spreadTintHex = observer.get('spreadTintHex');
    if (spreadTintHex) {
        const spreadTintMatch = spreadTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (spreadTintMatch) {
            script.spreadTint.set(
                parseInt(spreadTintMatch[1], 16) / 255,
                parseInt(spreadTintMatch[2], 16) / 255,
                parseInt(spreadTintMatch[3], 16) / 255
            );
        }
    }
    
    const spreadTintIntensity = observer.get('spreadTintIntensity');
    if (force || (spreadTintIntensity !== undefined && spreadTintIntensity !== null)) {
        script.spreadTintIntensity = spreadTintIntensity !== undefined && spreadTintIntensity !== null ? spreadTintIntensity : script.spreadTintIntensity;
    }
}

/**
 * Create spread reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealSpread - The spread reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createSpreadScript(observer, entity, GsplatRevealSpread) {
    const script = entity.script?.create(GsplatRevealSpread);
    if (script) {
        script.center.set(0, 0, 0);
        script.speed = 2.0;
        script.acceleration = 0;
        script.spreadAngle = 1.0;
        script.spreadTint.set(1, 0.5, 0);
        script.spreadTintIntensity = 0.3;
        script.endRadius = 5000;
        applySettingsToSpreadScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to unroll script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The unroll reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToUnrollScript(observer, script, force = false) {
    if (!script) return;
    
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const unrollAngle = observer.get('unrollAngle');
    if (force || (unrollAngle !== undefined && unrollAngle !== null)) {
        script.unrollAngle = unrollAngle !== undefined && unrollAngle !== null ? unrollAngle : script.unrollAngle;
    }
    
    const unrollTintHex = observer.get('unrollTintHex');
    if (unrollTintHex) {
        const unrollTintMatch = unrollTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (unrollTintMatch) {
            script.unrollTint.set(
                parseInt(unrollTintMatch[1], 16) / 255,
                parseInt(unrollTintMatch[2], 16) / 255,
                parseInt(unrollTintMatch[3], 16) / 255
            );
        }
    }
    
    const unrollTintIntensity = observer.get('unrollTintIntensity');
    if (force || (unrollTintIntensity !== undefined && unrollTintIntensity !== null)) {
        script.unrollTintIntensity = unrollTintIntensity !== undefined && unrollTintIntensity !== null ? unrollTintIntensity : script.unrollTintIntensity;
    }
}

/**
 * Create unroll reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealUnroll - The unroll reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createUnrollScript(observer, entity, GsplatRevealUnroll) {
    const script = entity.script?.create(GsplatRevealUnroll);
    if (script) {
        script.center.set(0, 0, 0);
        script.direction.set(1, 0, 0);
        script.speed = 2.0;
        script.unrollAngle = 1.57; // 90 degrees
        script.unrollTint.set(0.5, 0.8, 1.0);
        script.unrollTintIntensity = 0.2;
        script.endRadius = 5000;
        applySettingsToUnrollScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to twister script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The twister reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToTwisterScript(observer, script, force = false) {
    if (!script) return;
    
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const twistIntensity = observer.get('twistIntensity');
    if (force || (twistIntensity !== undefined && twistIntensity !== null)) {
        script.twistIntensity = twistIntensity !== undefined && twistIntensity !== null ? twistIntensity : script.twistIntensity;
    }
    
    const rotationSpeed = observer.get('rotationSpeed');
    if (force || (rotationSpeed !== undefined && rotationSpeed !== null)) {
        script.rotationSpeed = rotationSpeed !== undefined && rotationSpeed !== null ? rotationSpeed : script.rotationSpeed;
    }
    
    const twistTintHex = observer.get('twistTintHex');
    if (twistTintHex) {
        const twistTintMatch = twistTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (twistTintMatch) {
            script.twistTint.set(
                parseInt(twistTintMatch[1], 16) / 255,
                parseInt(twistTintMatch[2], 16) / 255,
                parseInt(twistTintMatch[3], 16) / 255
            );
        }
    }
    
    const twistTintIntensity = observer.get('twistTintIntensity');
    if (force || (twistTintIntensity !== undefined && twistTintIntensity !== null)) {
        script.twistTintIntensity = twistTintIntensity !== undefined && twistTintIntensity !== null ? twistTintIntensity : script.twistTintIntensity;
    }
}

/**
 * Create twister reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealTwister - The twister reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createTwisterScript(observer, entity, GsplatRevealTwister) {
    const script = entity.script?.create(GsplatRevealTwister);
    if (script) {
        script.center.set(0, 0, 0);
        script.speed = 2.0;
        script.twistIntensity = 1.0;
        script.rotationSpeed = 0.5;
        script.twistTint.set(1, 0, 1);
        script.twistTintIntensity = 0.3;
        script.endRadius = 5000;
        applySettingsToTwisterScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Helper function to apply observer settings to magic script
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {any} script - The magic reveal script instance
 * @param {boolean} force - Force apply even if value is 0 or falsy
 */
export function applySettingsToMagicScript(observer, script, force = false) {
    if (!script) return;
    
    const speed = observer.get('speed');
    if (force || (speed !== undefined && speed !== null)) {
        script.speed = speed !== undefined && speed !== null ? speed : script.speed;
    }
    
    const distortionAmount = observer.get('distortionAmount');
    if (force || (distortionAmount !== undefined && distortionAmount !== null)) {
        script.distortionAmount = distortionAmount !== undefined && distortionAmount !== null ? distortionAmount : script.distortionAmount;
    }
    
    const pulseSpeed = observer.get('pulseSpeed');
    if (force || (pulseSpeed !== undefined && pulseSpeed !== null)) {
        script.pulseSpeed = pulseSpeed !== undefined && pulseSpeed !== null ? pulseSpeed : script.pulseSpeed;
    }
    
    const magicIntensity = observer.get('magicIntensity');
    if (force || (magicIntensity !== undefined && magicIntensity !== null)) {
        script.magicIntensity = magicIntensity !== undefined && magicIntensity !== null ? magicIntensity : script.magicIntensity;
    }
    
    const magicTintHex = observer.get('magicTintHex');
    if (magicTintHex) {
        const magicTintMatch = magicTintHex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        if (magicTintMatch) {
            script.magicTint.set(
                parseInt(magicTintMatch[1], 16) / 255,
                parseInt(magicTintMatch[2], 16) / 255,
                parseInt(magicTintMatch[3], 16) / 255
            );
        }
    }
    
    const magicTintIntensity = observer.get('magicTintIntensity');
    if (force || (magicTintIntensity !== undefined && magicTintIntensity !== null)) {
        script.magicTintIntensity = magicTintIntensity !== undefined && magicTintIntensity !== null ? magicTintIntensity : script.magicTintIntensity;
    }
}

/**
 * Create magic reveal script with configured attributes
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {pc.Entity} entity - The entity to attach script to
 * @param {any} GsplatRevealMagic - The magic reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createMagicScript(observer, entity, GsplatRevealMagic) {
    const script = entity.script?.create(GsplatRevealMagic);
    if (script) {
        script.center.set(0, 0, 0);
        script.speed = 2.0;
        script.distortionAmount = 0.5;
        script.pulseSpeed = 2.0;
        script.magicIntensity = 1.0;
        script.magicTint.set(0.5, 0.3, 1.0);
        script.magicTintIntensity = 0.4;
        script.endRadius = 5000;
        applySettingsToMagicScript(observer, script, true);
        script.enabled = true;
    }
    return script;
}

/**
 * Create and start an effect based on its name
 * @param {import('@playcanvas/observer').Observer} observer - The observer instance
 * @param {string} effectName - Name of the effect to create
 * @param {pc.Entity} entity - Entity to apply effect to
 * @param {any} GsplatRevealRadial - The radial reveal script class
 * @param {any} GsplatRevealRain - The rain reveal script class
 * @param {any} GsplatRevealGridEruption - The grid eruption reveal script class
 * @param {any} GsplatRevealInstant - The instant reveal script class
 * @param {any} GsplatRevealFade - The fade reveal script class
 * @param {any} GsplatRevealSpread - The spread reveal script class
 * @param {any} GsplatRevealUnroll - The unroll reveal script class
 * @param {any} GsplatRevealTwister - The twister reveal script class
 * @param {any} GsplatRevealMagic - The magic reveal script class
 * @returns {any|null} The created script instance or null
 */
export function createEffect(observer, effectName, entity, GsplatRevealRadial, GsplatRevealRain, GsplatRevealGridEruption, GsplatRevealInstant, GsplatRevealFade, GsplatRevealSpread, GsplatRevealUnroll, GsplatRevealTwister, GsplatRevealMagic) {
    // Destroy any existing reveal scripts
    entity.script?.destroy(GsplatRevealRadial?.scriptName);
    entity.script?.destroy(GsplatRevealRain?.scriptName);
    entity.script?.destroy(GsplatRevealGridEruption?.scriptName);
    entity.script?.destroy(GsplatRevealInstant?.scriptName);
    entity.script?.destroy(GsplatRevealFade?.scriptName);
    entity.script?.destroy(GsplatRevealSpread?.scriptName);
    entity.script?.destroy(GsplatRevealUnroll?.scriptName);
    entity.script?.destroy(GsplatRevealTwister?.scriptName);
    entity.script?.destroy(GsplatRevealMagic?.scriptName);

    // Create the selected effect (fresh instance, starts from beginning)
    let createdScript = null;
    if (effectName === 'radial') {
        createdScript = createRadialScript(observer, entity, GsplatRevealRadial, false);
    } else if (effectName === 'rain') {
        createdScript = createRainScript(observer, entity, GsplatRevealRain);
    } else if (effectName === 'grid') {
        createdScript = createGridScript(observer, entity, GsplatRevealGridEruption);
    } else if (effectName === 'instant') {
        createdScript = createInstantScript(observer, entity, GsplatRevealInstant);
    } else if (effectName === 'fade') {
        createdScript = createFadeScript(observer, entity, GsplatRevealFade);
    } else if (effectName === 'spread') {
        createdScript = createSpreadScript(observer, entity, GsplatRevealSpread);
    } else if (effectName === 'unroll') {
        createdScript = createUnrollScript(observer, entity, GsplatRevealUnroll);
    } else if (effectName === 'twister') {
        createdScript = createTwisterScript(observer, entity, GsplatRevealTwister);
    } else if (effectName === 'magic') {
        createdScript = createMagicScript(observer, entity, GsplatRevealMagic);
    }
    return createdScript;
}
