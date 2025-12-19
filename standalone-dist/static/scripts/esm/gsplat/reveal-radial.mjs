import { Vec3, Color } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const MAX_REVEAL_TIME = Number.POSITIVE_INFINITY; // no upper bound; reveal wave keeps propagating

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform float uFloatTime;
uniform vec3 uCenter;
uniform float uSpeed;
uniform float uAcceleration;
uniform float uDelay;
uniform vec3 uDotTint;
uniform vec3 uWaveTint;
uniform float uOscillationIntensity;
uniform float uEndRadius;
uniform float uPointCloudScale;
uniform float uPointCloudOpacity;
uniform float uPointCloudDensity;
uniform float uPointMotionSpeed;
uniform float uFloatMotionSpeed;
uniform float uDispersiveMotionSpeed;
uniform float uDotWaveThickness;
uniform float uOceanWaveThickness;
uniform float uOceanWaveInterval;
uniform float uOceanWaveSpeedMultiplier;
uniform float uOceanWaveLiftScale;
uniform float uOceanWaveBrightness;
uniform float uRevealStartRadius;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform vec3 uCameraPosition;
uniform float uDistanceDarkening;
uniform float uBaseBrightness;
uniform float uMaskRevealPos;
uniform float uMaskRevealStartRadius;
uniform float uMaskFeather;
uniform float uDescentHeight;
uniform float uDescentDuration;
uniform float uReverseMode;
uniform float uReverseSpeed;
uniform float uLoadFullSceneProgress;
uniform float uLoadFullSceneWaveThickness;
uniform float uLoadFullSceneMotionFadeRange;
uniform float uHideSceneProgress;
uniform float uHideSceneMode;
uniform float uHideSceneLayerThickness;
uniform float uHideSceneMinY;
uniform float uHideSceneMaxY;

// Shared globals (initialized once per vertex)
float g_dist;
float g_dotWavePosRaw;
float g_dotWavePos;
vec3 g_originalCenter; // Store original center for stable hash
float g_oceanWaveIntensity;
float g_maskEnabled;
float g_maskInnerEdge;
float g_maskOuterEdge;

float computeOceanWaveIntensity(float dist) {
    if (uOceanWaveInterval <= 0.0001) {
        return 0.0;
    }

    float revealDistance = uRevealStartRadius + uEndRadius;
    float oceanWaveStart = 0.0;
    if (uAcceleration > 0.0001) {
        float a = 0.5 * uAcceleration;
        float b = uSpeed;
        float c = -revealDistance;
        float disc = max(0.0, b * b - 4.0 * a * c);
        oceanWaveStart = (-b + sqrt(disc)) / (2.0 * a);
    } else if (uSpeed > 0.0001) {
        oceanWaveStart = revealDistance / max(0.0001, uSpeed);
    } else {
        return 0.0;
    }

    oceanWaveStart += uDelay;
    float oceanWaveElapsed = uTime - oceanWaveStart;
    if (oceanWaveElapsed <= 0.0) {
        return 0.0;
    }

    // Fade-in effect for smooth start: apply smoothstep over first 0.4 seconds
    float fadeInDuration = 0.4;
    float globalFadeInFactor = 1.0;
    if (oceanWaveElapsed < fadeInDuration) {
        globalFadeInFactor = smoothstep(0.0, fadeInDuration, oceanWaveElapsed);
    }

    // Calculate how many waves should be active
    // Each wave starts at: oceanWaveStart + waveIndex * uOceanWaveInterval
    float speedMultiplier = max(uOceanWaveSpeedMultiplier, 0.01);
    float oceanWaveSpeed = max(uSpeed * speedMultiplier, 0.0001);
    float totalIntensity = 0.0;
    
    // Maximum number of waves to check (limit to prevent performance issues)
    // Calculate based on how far the fastest wave could have traveled
    float maxWaveDistance = oceanWaveSpeed * oceanWaveElapsed;
    int maxWaveCount = int(ceil(maxWaveDistance / (oceanWaveSpeed * uOceanWaveInterval))) + 1;
    if (maxWaveCount > 20) {
        maxWaveCount = 20; // Safety limit
    }
    
    for (int waveIndex = 0; waveIndex < maxWaveCount; waveIndex++) {
        float waveStartTime = float(waveIndex) * uOceanWaveInterval;
        float waveElapsed = oceanWaveElapsed - waveStartTime;
        
        // Skip if this wave hasn't started yet
        if (waveElapsed <= 0.0) {
            continue;
        }
        
        // Fade-in for each individual wave
        float waveFadeInFactor = 1.0;
        if (waveElapsed < fadeInDuration) {
            waveFadeInFactor = smoothstep(0.0, fadeInDuration, waveElapsed);
        }
        
        // Smooth thickness growth: start from 0 and grow to set value over 2 seconds
        float thicknessGrowthDuration = 2.0;
        float thicknessFactor = 1.0;
        if (waveElapsed < thicknessGrowthDuration) {
            thicknessFactor = smoothstep(0.0, thicknessGrowthDuration, waveElapsed);
        }
        
        // Ocean wave starts from revealStartRadius (same as first wave) and moves outward
        float oceanWavePos = uRevealStartRadius + oceanWaveSpeed * waveElapsed;
        float distToOcean = abs(dist - oceanWavePos);
        float oceanThickness = max(0.003, uOceanWaveThickness * thicknessFactor);
        // Gaussian distribution: exp(-(x^2) / (2 * sigma^2))
        // Use oceanThickness as sigma (standard deviation)
        float sigma = oceanThickness;
        float waveIntensity = exp(-(distToOcean * distToOcean) / (2.0 * sigma * sigma));
        
        // Apply fade-in factors
        waveIntensity *= waveFadeInFactor * globalFadeInFactor;
        
        totalIntensity += waveIntensity;
    }
    
    // Clamp to prevent over-brightening
    return min(totalIntensity, 1.0);
}

float getMaskVisibility() {
    if (g_maskEnabled < 0.5) {
        return 1.0;
    }

    if (g_dist <= g_maskInnerEdge) {
        return 0.0;
    }

    if (g_dist >= g_maskOuterEdge) {
        return 1.0;
    }

    return smoothstep(g_maskInnerEdge, g_maskOuterEdge, g_dist);
}

float getHideSceneVisibility(vec3 center) {
    if (uHideSceneProgress <= 0.001) {
        return 1.0; // No hiding
    }
    
    float hideProgress = clamp(uHideSceneProgress, 0.0, 1.0);
    float layerThickness = max(0.01, uHideSceneLayerThickness);
    
    float layerValue = 0.0;
    
    // Mode 0: по высоте снизу вверх (низкие точки скрываются первыми)
    if (uHideSceneMode < 0.5) {
        float yRange = uHideSceneMaxY - uHideSceneMinY;
        if (yRange > 0.001) {
            float normalizedY = (center.y - uHideSceneMinY) / yRange;
            layerValue = normalizedY; // 0.0 = низ, 1.0 = верх
        }
    }
    // Mode 1: по высоте сверху вниз (высокие точки скрываются первыми)
    else if (uHideSceneMode < 1.5) {
        float yRange = uHideSceneMaxY - uHideSceneMinY;
        if (yRange > 0.001) {
            float normalizedY = (center.y - uHideSceneMinY) / yRange;
            layerValue = 1.0 - normalizedY; // 1.0 = низ, 0.0 = верх
        }
    }
    // Mode 2: по расстоянию от камеры (дальние точки скрываются первыми)
    else {
        float distToCamera = length(center - uCameraPosition);
        float maxDist = uEndRadius * 2.0;
        if (maxDist > 0.001) {
            layerValue = clamp(distToCamera / maxDist, 0.0, 1.0);
        }
    }
    
    // Когда hideProgress = 0.0: все видимо (visibility = 1.0 для всех)
    // Когда hideProgress = 1.0: все скрыто (visibility = 0.0 для всех)
    // Точки с меньшим layerValue скрываются первыми. Порог: если hideProgress < layerValue — точка видна, иначе скрывается
    float visibility = 1.0 - smoothstep(layerValue - layerThickness, layerValue + layerThickness, hideProgress);
    
    // Гарантия полной видимости в самом начале
    if (hideProgress < 0.001) {
        return 1.0;
    }
    
    return visibility;
}

void initShared(vec3 center) {
    g_originalCenter = center; // Store before any modifications
    g_dist = length(center - uCenter);
    
    // Reverse mode: wave moves from endRadius to center (hiding effect)
    if (uReverseMode > 0.5) {
        // Reverse mode: calculate position from endRadius moving inward
        float reverseTime = max(0.0, uTime - uDelay);
        float reverseSpeed = max(0.0001, uReverseSpeed);
        float reverseDistance = reverseSpeed * reverseTime;
        // Start from endRadius and move inward to revealStartRadius
        // This matches the normal reveal distance
        float maxRevealDistance = uEndRadius - uRevealStartRadius;
        g_dotWavePosRaw = max(uRevealStartRadius, uEndRadius - reverseDistance);
        g_dotWavePos = g_dotWavePosRaw;
    } else {
        // Normal mode: wave moves from center outward (revealing effect)
        float dotWaveTime = max(0.0, uTime - uDelay);
        g_dotWavePosRaw = uSpeed * dotWaveTime + 0.5 * uAcceleration * dotWaveTime * dotWaveTime;
        g_dotWavePos = max(0.0, g_dotWavePosRaw - uRevealStartRadius);
    }
    g_oceanWaveIntensity = computeOceanWaveIntensity(g_dist);

    if (uMaskRevealPos > 0.001) {
        g_maskEnabled = 1.0;
        float maskWave = max(0.0, uMaskRevealPos - uMaskRevealStartRadius);
        float feather = max(0.01, uMaskFeather);
        g_maskOuterEdge = maskWave;
        g_maskInnerEdge = maskWave - feather;
    } else {
        g_maskEnabled = 0.0;
        g_maskOuterEdge = -1.0;
        g_maskInnerEdge = -1.0;
    }
}

// Hash function for per-splat randomization
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

vec3 hashVec3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(vec3(
        p.x * p.y * p.z,
        p.x + p.y * p.z,
        p.x * p.y + p.z
    ));
}

vec3 pcNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    vec3 n000 = hashVec3(i + vec3(0.0, 0.0, 0.0));
    vec3 n100 = hashVec3(i + vec3(1.0, 0.0, 0.0));
    vec3 n010 = hashVec3(i + vec3(0.0, 1.0, 0.0));
    vec3 n110 = hashVec3(i + vec3(1.0, 1.0, 0.0));
    vec3 n001 = hashVec3(i + vec3(0.0, 0.0, 1.0));
    vec3 n101 = hashVec3(i + vec3(1.0, 0.0, 1.0));
    vec3 n011 = hashVec3(i + vec3(0.0, 1.0, 1.0));
    vec3 n111 = hashVec3(i + vec3(1.0, 1.0, 1.0));

    vec3 x0 = mix(n000, n100, f.x);
    vec3 x1 = mix(n010, n110, f.x);
    vec3 x2 = mix(n001, n101, f.x);
    vec3 x3 = mix(n011, n111, f.x);

    vec3 y0 = mix(x0, x1, f.y);
    vec3 y1 = mix(x2, x3, f.y);

    return mix(y0, y1, f.z);
}

void modifyCenter(inout vec3 center) {
    // Store original center for stable hash calculations
    vec3 originalCenter = center;
    initShared(originalCenter);
    
    float globalT = clamp(uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    // Когда globalT = 0.0: все точки в виде точек (localT = 0.0)
    // Когда globalT = 1.0: все точки в полной сцене (localT = 1.0)
    // Переход радиальный: ближние точки переходят первыми
    float maxDistance = uEndRadius;
    float waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    float waveThickness = 0.8; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    // Если волна еще не началась (waveRadius = 0), все точки должны быть в виде точек
    float localT;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        float signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    float localMotionStrength = 1.0 - localT; // 1.0 = full motion, 0.0 = no motion
    
    // Early exit optimization
    if (g_dist > uEndRadius) return;
    
    // Use original center for stable hash (prevents flickering)
    float phase = hash(originalCenter) * 6.28318;
    float phaseX = hash(originalCenter + vec3(1.0, 0.0, 0.0)) * 6.28318;
    float phaseZ = hash(originalCenter + vec3(0.0, 0.0, 1.0)) * 6.28318;
    
    // Smooth fade for motion effects - плавное затухание вместо резкого отключения
    float motionFade = smoothstep(0.0, uLoadFullSceneMotionFadeRange, localMotionStrength); // Плавное затухание
    
    // Gentle floating motion - interpolate out
    if (uFloatMotionSpeed > 0.001 && motionFade > 0.001) {
        float floatSpeed = uFloatMotionSpeed * 0.8;
        center.x += sin(uFloatTime * floatSpeed + phaseX) * 0.008 * motionFade;
        center.y += sin(uFloatTime * floatSpeed * 1.1 + phase) * 0.01 * motionFade;
        center.z += cos(uFloatTime * floatSpeed * 0.9 + phaseZ) * 0.008 * motionFade;
    }
    
    // Flag-like wave motion flowing in a global direction
    vec3 windDir = normalize(vec3(0.45, 0.05, 1.0));
    vec3 windTangent = normalize(cross(vec3(0.0, 1.0, 0.0), windDir));
    vec3 windUp = vec3(0.0, 1.0, 0.0);
    
    float alongWind = dot(originalCenter, windDir);
    float acrossWind = dot(originalCenter, windTangent);
    
    // Flag-like wave motion - interpolate out
    if (uWaveSpeed > 0.001 && uWaveAmplitude > 0.001 && g_dotWavePos > 0.001 && motionFade > 0.001) {
        vec3 noiseInput = originalCenter * 2.0 + vec3(uFloatTime * uWaveSpeed * 0.5);
        vec3 noiseSample = pcNoise(noiseInput);
        vec3 centeredNoise = (noiseSample - 0.5) * 2.0;
        
        center += centeredNoise * uWaveAmplitude * motionFade;
        
        float waveFreq = 1.5 + uFloatMotionSpeed * 0.2;
        float syncPhase = alongWind * waveFreq + acrossWind * (waveFreq * 0.7) - uFloatTime * uWaveSpeed;
        float crossPhase = acrossWind * (waveFreq * 0.65) - uFloatTime * (uWaveSpeed * 0.4);
        
        center += windTangent * sin(syncPhase) * uWaveAmplitude * 0.3 * motionFade;
        center += windDir * cos(syncPhase * 0.6 + crossPhase) * uWaveAmplitude * 0.2 * motionFade;
    }

    // Noise-driven dispersive wave - interpolate out
    if (uDispersiveMotionSpeed > 0.001 && motionFade > 0.001) {
        float radialPlane = length((originalCenter - uCenter).xz);
        float waveFront = max(g_dotWavePos, 0.0001);
        float border = abs(waveFront - radialPlane - 0.5);
        float disperseAmount = 1.0 - smoothstep(waveFront - 0.5, waveFront + 0.5, radialPlane + 0.5);
        disperseAmount = max(disperseAmount, 0.8);
        vec3 noiseInput = (originalCenter - uCenter) * 2.0 + vec3(uFloatTime * 0.5);
        vec3 noiseSample = pcNoise(noiseInput);
        vec3 centeredNoise = (noiseSample - 0.5) * 2.0;
        center += centeredNoise * 0.04 * disperseAmount * motionFade;
    }

    // Ocean wave: gentle lift pulse - interpolate out
    if (uOceanWaveLiftScale > 0.001 && g_oceanWaveIntensity > 0.0 && motionFade > 0.001) {
        float liftPulse = sin(g_oceanWaveIntensity * 1.5707963);
        center.y += liftPulse * uOceanWaveLiftScale * 1.0 * motionFade;
    }

    // Descent effect: interpolate out
    if (uDescentHeight > 0.001 && g_dotWavePos > 0.001 && motionFade > 0.001) {
        if (g_dist <= g_dotWavePos) {
            float distFromWaveFront = g_dotWavePos - g_dist;
            if (distFromWaveFront <= uDescentDuration) {
                float descentProgress = distFromWaveFront / max(uDescentDuration, 0.001);
                float easedProgress = 1.0 - (1.0 - descentProgress) * (1.0 - descentProgress);
                center.y += uDescentHeight * (1.0 - easedProgress) * motionFade;
            }
        }
    }
}

void modifyCovariance(vec3 originalCenter, vec3 modifiedCenter, inout vec3 covA, inout vec3 covB) {
    // Hide scene animation - скрытие по слоям
    float hideVisibility = getHideSceneVisibility(modifiedCenter);
    if (hideVisibility <= 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Save original covariance BEFORE any modifications
    vec3 origCovA = covA;
    vec3 origCovB = covB;
    
    float globalT = clamp(uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    // Когда globalT = 0.0: все точки в виде точек (localT = 0.0)
    // Когда globalT = 1.0: все точки в полной сцене (localT = 1.0)
    // Переход радиальный: ближние точки переходят первыми
    float maxDistance = uEndRadius;
    float waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    float waveThickness = uLoadFullSceneWaveThickness; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    float localT;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        float signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    float localEffectStrength = 1.0 - localT; // 1.0 = full effects, 0.0 = no effects
    // Smooth fade for reveal effects - плавное затухание вместо резкого отключения
    float revealFade = smoothstep(0.0, uLoadFullSceneMotionFadeRange, localEffectStrength); // Плавное затухание
    
    // Early exit for distant splats - hide them (only if effects active)
    if (g_dist > uEndRadius && revealFade > 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Reverse mode: hide points that are beyond the wave (wave moves inward)
    if (uReverseMode > 0.5 && revealFade > 0.001) {
        if (g_dist > g_dotWavePos + 0.05) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        }
    } else if (revealFade > 0.001) {
        // Normal mode: initially hide everything - reveal starts from center
        if (g_dotWavePos <= 0.001) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        }
    }
    
    float maskFade = getMaskVisibility();
    if (maskFade <= 0.0001 && revealFade > 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }

    // Determine scale and phase (only if effects active)
    float scale;
    
    if (revealFade > 0.001) {
        if (uReverseMode > 0.5) {
            if (g_dist <= g_dotWavePos - 0.05) {
                scale = 1.0;
            } else if (g_dist <= g_dotWavePos + 0.05) {
                float distToWave = abs(g_dist - g_dotWavePos);
                scale = (distToWave < 0.025)
                    ? mix(0.1, 0.2, 1.0 - distToWave * 40.0)
                    : mix(1.0, 0.1, smoothstep(g_dotWavePos - 0.05, g_dotWavePos + 0.05, g_dist));
            } else {
                gsplatMakeRound(covA, covB, 0.0);
                return;
            }
        } else if (g_dist > g_dotWavePos + 0.05) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        } else if (g_dist > g_dotWavePos - 0.05) {
            float distToWave = abs(g_dist - g_dotWavePos);
            scale = (distToWave < 0.025)
                ? mix(0.1, 0.2, 1.0 - distToWave * 40.0)
                : mix(0.0, 0.1, smoothstep(g_dotWavePos + 0.05, g_dotWavePos - 0.05, g_dist));
        } else {
            scale = 0.1;
        }
    } else {
        // Effects disabled - show all points at full scale
        scale = 1.0;
    }
    
    // Apply scale to covariance with smooth interpolation to original
    float originalSize = gsplatExtractSize(origCovA, origCovB);
    
    if (scale >= 1.0) {
        // Fully revealed: transition from point cloud to full scene
        float pointCloudSize = originalSize * uPointCloudScale;
        float minSize = max(0.005 * uPointCloudScale, originalSize * 0.1 * uPointCloudScale);
        pointCloudSize = max(pointCloudSize, minSize);
        
        // Smooth interpolation from point cloud to original (используем localT для радиальной волны)
        float finalSize = mix(pointCloudSize, originalSize, localT);
        
        // Interpolate shape: from round dots to original shape
        vec3 dotCovA, dotCovB;
        gsplatMakeRound(dotCovA, dotCovB, finalSize);
        
        covA = mix(dotCovA, origCovA, localT);
        covB = mix(dotCovB, origCovB, localT);
    } else {
        // Dot phase: interpolate to original (используем localT для радиальной волны)
        float scaledOriginal = originalSize * uPointCloudScale;
        float dotSize = min(scale * 0.08 * uPointCloudScale, max(scaledOriginal, originalSize * 0.1 * uPointCloudScale));
        float minSize = 0.001 * uPointCloudScale;
        dotSize = max(dotSize, minSize);
        
        // Interpolate dot phase to original
        vec3 dotCovA, dotCovB;
        gsplatMakeRound(dotCovA, dotCovB, dotSize);
        
        covA = mix(dotCovA, origCovA, localT);
        covB = mix(dotCovB, origCovB, localT);
    }
}

void modifyColor(vec3 center, inout vec4 color) {
    // Hide scene animation - скрытие по слоям
    float hideVisibility = getHideSceneVisibility(center);
    if (hideVisibility <= 0.001) {
        color.a = 0.0;
        return;
    }
    
    float globalT = clamp(uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    // Когда globalT = 0.0: все точки в виде точек (localT = 0.0)
    // Когда globalT = 1.0: все точки в полной сцене (localT = 1.0)
    // Переход радиальный: ближние точки переходят первыми
    float maxDistance = uEndRadius;
    float waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    float waveThickness = uLoadFullSceneWaveThickness; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    float localT;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        float signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    float localEffectStrength = 1.0 - localT; // 1.0 = full effects, 0.0 = no effects
    // Smooth fade for reveal effects - плавное затухание вместо резкого отключения
    float revealFade = smoothstep(0.0, uLoadFullSceneMotionFadeRange, localEffectStrength); // Плавное затухание
    
    // Use shared globals
    if (g_dist > uEndRadius && revealFade > 0.001) return;
    
    // Reverse mode: hide points beyond wave (only if effects active)
    if (uReverseMode > 0.5 && revealFade > 0.001) {
        if (g_dist > g_dotWavePos + 0.05) {
            color.a = 0.0;
            return;
        }
    } else if (revealFade > 0.001) {
        // Normal mode: initially hide everything - reveal starts from center
        if (g_dotWavePos <= 0.001) {
            color.a = 0.0;
            return;
        }
    }
    
    float maskFade = getMaskVisibility();
    // Вместо резкого скрытия — плавно домножаем альфу на маску
    color.a *= mix(1.0, maskFade, revealFade);

    // Random sampling for point cloud density - only if effects active
    if (revealFade > 0.001) {
        float splatHash = hash(g_originalCenter);
        // Плавно убираем прореживание: при revealFade=0 → threshold=1 (не режем), при revealFade=1 → threshold=uPointCloudDensity
        float densityThreshold = mix(1.0, uPointCloudDensity, revealFade);
        if (splatHash > densityThreshold) {
            // Плавное затухание вместо полного скрытия
            color.a *= (1.0 - revealFade);
        }
    }
    
    // Interpolate opacity from point cloud opacity to full opacity (1.0) - используем localT для радиальной волны
    float finalOpacity = mix(uPointCloudOpacity, 1.0, localT);
    color.a *= finalOpacity;
    
    // Distance-based darkening: only apply if effects active (with smooth fade)
    if (uDistanceDarkening > 0.001 && revealFade > 0.001) {
        float distToCamera = length(center - uCameraPosition);
        float maxDist = uEndRadius * 2.0;
        float normalizedDist = clamp(distToCamera / maxDist, 0.0, 1.0);
        float darkeningFactor = 1.0 - (normalizedDist * uDistanceDarkening);
        color.rgb *= darkeningFactor;
    }
    
    // Apply tint effects with smooth fade interpolation
    if (revealFade > 0.001) {
        float radialPlane = length((g_originalCenter - uCenter).xz);
        float waveFront = max(g_dotWavePos, 0.0001);
        float waveBorder = abs(waveFront - radialPlane - 0.5);
        float disperseAmount = 1.0 - smoothstep(waveFront - 0.5, waveFront + 0.5, radialPlane + 0.5);
        disperseAmount = max(disperseAmount, 0.8);
        color.rgb += uDotTint * exp(-20.0 * waveBorder) * disperseAmount * 0.35 * revealFade;

        // Dot wave tint (active in dot phase)
        if (g_dist <= g_dotWavePos) {
            float distToDot = abs(g_dist - g_dotWavePos);
            float dotIntensity = smoothstep(max(0.01, uDotWaveThickness), 0.0, distToDot);
            color.rgb += uDotTint * dotIntensity * revealFade;
        }
    }

    // Apply base brightness with smooth fade
    color.rgb *= mix(1.0, uBaseBrightness, revealFade);
    
    color.a *= maskFade;
    
    // Ocean wave effects only if effects active (with smooth fade)
    if (g_oceanWaveIntensity > 0.0 && revealFade > 0.001) {
        float brightnessRestore = (1.0 / max(0.001, uBaseBrightness)) * max(0.001, uOceanWaveBrightness);
        color.rgb *= mix(1.0, brightnessRestore, g_oceanWaveIntensity);
    }
    
    // Apply hide scene visibility
    color.a *= hideVisibility;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uFloatTime: f32;
uniform uCenter: vec3f;
uniform uSpeed: f32;
uniform uAcceleration: f32;
uniform uDelay: f32;
uniform uDotTint: vec3f;
uniform uWaveTint: vec3f;
uniform uOscillationIntensity: f32;
uniform uEndRadius: f32;
uniform uPointCloudScale: f32;
uniform uPointCloudOpacity: f32;
uniform uPointCloudDensity: f32;
uniform uPointMotionSpeed: f32;
uniform uFloatMotionSpeed: f32;
uniform uDispersiveMotionSpeed: f32;
uniform uDotWaveThickness: f32;
uniform uOceanWaveThickness: f32;
uniform uOceanWaveInterval: f32;
uniform uOceanWaveSpeedMultiplier: f32;
uniform uOceanWaveLiftScale: f32;
uniform uOceanWaveBrightness: f32;
uniform uRevealStartRadius: f32;
uniform uWaveSpeed: f32;
uniform uWaveAmplitude: f32;
uniform uCameraPosition: vec3f;
uniform uDistanceDarkening: f32;
uniform uBaseBrightness: f32;
uniform uMaskRevealPos: f32;
uniform uMaskRevealStartRadius: f32;
uniform uMaskFeather: f32;
uniform uDescentHeight: f32;
uniform uDescentDuration: f32;
uniform uReverseMode: f32;
uniform uReverseSpeed: f32;
uniform uLoadFullSceneProgress: f32;
uniform uLoadFullSceneWaveThickness: f32;
uniform uLoadFullSceneMotionFadeRange: f32;
uniform uHideSceneProgress: f32;
uniform uHideSceneMode: f32;
uniform uHideSceneLayerThickness: f32;
uniform uHideSceneMinY: f32;
uniform uHideSceneMaxY: f32;

// Shared globals (initialized once per vertex)
var<private> g_dist: f32;
var<private> g_dotWavePosRaw: f32;
var<private> g_dotWavePos: f32;
var<private> g_originalCenter: vec3f; // Store original center for stable hash
var<private> g_oceanWaveIntensity: f32;
var<private> g_maskEnabled: f32;
var<private> g_maskInnerEdge: f32;
var<private> g_maskOuterEdge: f32;

fn computeOceanWaveIntensity(dist: f32) -> f32 {
    if (uniform.uOceanWaveInterval <= 0.0001) {
        return 0.0;
    }

    let revealDistance = uniform.uRevealStartRadius + uniform.uEndRadius;
    var oceanWaveStart: f32 = 0.0;
    if (uniform.uAcceleration > 0.0001) {
        let a = 0.5 * uniform.uAcceleration;
        let b = uniform.uSpeed;
        let c = -revealDistance;
        let disc = max(0.0, b * b - 4.0 * a * c);
        oceanWaveStart = (-b + sqrt(disc)) / (2.0 * a);
    } else if (uniform.uSpeed > 0.0001) {
        oceanWaveStart = revealDistance / max(0.0001, uniform.uSpeed);
    } else {
        return 0.0;
    }

    oceanWaveStart += uniform.uDelay;
    let oceanWaveElapsed = uniform.uTime - oceanWaveStart;
    if (oceanWaveElapsed <= 0.0) {
        return 0.0;
    }

    // Fade-in effect for smooth start: apply smoothstep over first 0.4 seconds
    let fadeInDuration: f32 = 0.4;
    var globalFadeInFactor: f32 = 1.0;
    if (oceanWaveElapsed < fadeInDuration) {
        globalFadeInFactor = smoothstep(0.0, fadeInDuration, oceanWaveElapsed);
    }

    // Calculate how many waves should be active
    let speedMultiplier = max(uniform.uOceanWaveSpeedMultiplier, 0.01);
    let oceanWaveSpeed = max(uniform.uSpeed * speedMultiplier, 0.0001);
    var totalIntensity: f32 = 0.0;
    
    // Maximum number of waves to check (limit to prevent performance issues)
    let maxWaveDistance = oceanWaveSpeed * oceanWaveElapsed;
    var maxWaveCount = i32(ceil(maxWaveDistance / (oceanWaveSpeed * uniform.uOceanWaveInterval))) + 1;
    if (maxWaveCount > 20) {
        maxWaveCount = 20; // Safety limit
    }
    
    var waveIndex: i32 = 0;
    loop {
        if (waveIndex >= maxWaveCount) {
            break;
        }
        
        let waveStartTime = f32(waveIndex) * uniform.uOceanWaveInterval;
        let waveElapsed = oceanWaveElapsed - waveStartTime;
        
        // Skip if this wave hasn't started yet
        if (waveElapsed > 0.0) {
            // Fade-in for each individual wave
            var waveFadeInFactor: f32 = 1.0;
            if (waveElapsed < fadeInDuration) {
                waveFadeInFactor = smoothstep(0.0, fadeInDuration, waveElapsed);
            }
            
            // Smooth thickness growth: start from 0 and grow to set value over 2 seconds
            let thicknessGrowthDuration: f32 = 2.0;
            var thicknessFactor: f32 = 1.0;
            if (waveElapsed < thicknessGrowthDuration) {
                thicknessFactor = smoothstep(0.0, thicknessGrowthDuration, waveElapsed);
            }
            
            // Ocean wave starts from revealStartRadius (same as first wave) and moves outward
            let oceanWavePos = uniform.uRevealStartRadius + oceanWaveSpeed * waveElapsed;
            let distToOcean = abs(dist - oceanWavePos);
            let oceanThickness = max(0.003, uniform.uOceanWaveThickness * thicknessFactor);
            // Gaussian distribution: exp(-(x^2) / (2 * sigma^2))
            // Use oceanThickness as sigma (standard deviation)
            let sigma = oceanThickness;
            var waveIntensity = exp(-(distToOcean * distToOcean) / (2.0 * sigma * sigma));
            
            // Apply fade-in factors
            waveIntensity *= waveFadeInFactor * globalFadeInFactor;
            
            totalIntensity += waveIntensity;
        }
        
        waveIndex += 1;
    }
    
    // Clamp to prevent over-brightening
    return min(totalIntensity, 1.0);
}

fn maskVisibility() -> f32 {
    if (g_maskEnabled < 0.5) {
        return 1.0;
    }
    if (g_dist <= g_maskInnerEdge) {
        return 0.0;
    }
    if (g_dist >= g_maskOuterEdge) {
        return 1.0;
    }
    return smoothstep(g_maskInnerEdge, g_maskOuterEdge, g_dist);
}

fn hideSceneVisibility(center: vec3f) -> f32 {
    if (uniform.uHideSceneProgress <= 0.001) {
        return 1.0; // No hiding
    }
    
    let hideProgress = clamp(uniform.uHideSceneProgress, 0.0, 1.0);
    let layerThickness = max(0.01, uniform.uHideSceneLayerThickness);
    
    var layerValue: f32 = 0.0;
    
    // Mode 0: по высоте снизу вверх (низкие точки скрываются первыми)
    if (uniform.uHideSceneMode < 0.5) {
        let yRange = uniform.uHideSceneMaxY - uniform.uHideSceneMinY;
        if (yRange > 0.001) {
            let normalizedY = (center.y - uniform.uHideSceneMinY) / yRange;
            layerValue = normalizedY; // 0.0 = низ, 1.0 = верх
        }
    }
    // Mode 1: по высоте сверху вниз (высокие точки скрываются первыми)
    else if (uniform.uHideSceneMode < 1.5) {
        let yRange = uniform.uHideSceneMaxY - uniform.uHideSceneMinY;
        if (yRange > 0.001) {
            let normalizedY = (center.y - uniform.uHideSceneMinY) / yRange;
            layerValue = 1.0 - normalizedY; // 1.0 = низ, 0.0 = верх
        }
    }
    // Mode 2: по расстоянию от камеры (дальние точки скрываются первыми)
    else {
        let distToCamera = length(center - uniform.uCameraPosition);
        let maxDist = uniform.uEndRadius * 2.0;
        if (maxDist > 0.001) {
            layerValue = clamp(distToCamera / maxDist, 0.0, 1.0);
        }
    }
    
    // Когда hideProgress = 0.0: все видимо (visibility = 1.0 для всех)
    // Когда hideProgress = 1.0: все скрыто (visibility = 0.0 для всех)
    // Точки с меньшим layerValue скрываются первыми. Порог: если hideProgress < layerValue — точка видна, иначе скрывается
    let visibility = 1.0 - smoothstep(layerValue - layerThickness, layerValue + layerThickness, hideProgress);
    
    // Гарантия полной видимости в самом начале
    if (hideProgress < 0.001) {
        return 1.0;
    }
    
    return visibility;
}

fn initShared(center: vec3f) {
    g_originalCenter = center; // Store before any modifications
    g_dist = length(center - uniform.uCenter);
    
    // Reverse mode: wave moves from endRadius to center (hiding effect)
    if (uniform.uReverseMode > 0.5) {
        // Reverse mode: calculate position from endRadius moving inward
        let reverseTime = max(0.0, uniform.uTime - uniform.uDelay);
        let reverseSpeed = max(0.0001, uniform.uReverseSpeed);
        let reverseDistance = reverseSpeed * reverseTime;
        // Start from endRadius and move inward to revealStartRadius
        // This matches the normal reveal distance
        let maxRevealDistance = uniform.uEndRadius - uniform.uRevealStartRadius;
        g_dotWavePosRaw = max(uniform.uRevealStartRadius, uniform.uEndRadius - reverseDistance);
        g_dotWavePos = g_dotWavePosRaw;
    } else {
        // Normal mode: wave moves from center outward (revealing effect)
        let dotWaveTime = max(0.0, uniform.uTime - uniform.uDelay);
        g_dotWavePosRaw = uniform.uSpeed * dotWaveTime + 0.5 * uniform.uAcceleration * dotWaveTime * dotWaveTime;
        g_dotWavePos = max(0.0, g_dotWavePosRaw - uniform.uRevealStartRadius);
    }
    g_oceanWaveIntensity = computeOceanWaveIntensity(g_dist);

    if (uniform.uMaskRevealPos > 0.001) {
        g_maskEnabled = 1.0;
        let maskWave = max(0.0, uniform.uMaskRevealPos - uniform.uMaskRevealStartRadius);
        let feather = max(0.01, uniform.uMaskFeather);
        g_maskOuterEdge = maskWave;
        g_maskInnerEdge = maskWave - feather;
    } else {
        g_maskEnabled = 0.0;
        g_maskOuterEdge = -1.0;
        g_maskInnerEdge = -1.0;
    }
}

// Hash function for per-splat randomization
fn hash(p: vec3f) -> f32 {
    return fract(sin(dot(p, vec3f(127.1, 311.7, 74.7))) * 43758.5453);
}

fn hashVec3(p: vec3f) -> vec3f {
    var q = fract(p * 0.3183099 + vec3f(0.1));
    q *= 17.0;
    return fract(vec3f(
        q.x * q.y * q.z,
        q.x + q.y * q.z,
        q.x * q.y + q.z
    ));
}

fn pcNoise(p: vec3f) -> vec3f {
    let i = floor(p);
    var f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    let n000 = hashVec3(i + vec3f(0.0, 0.0, 0.0));
    let n100 = hashVec3(i + vec3f(1.0, 0.0, 0.0));
    let n010 = hashVec3(i + vec3f(0.0, 1.0, 0.0));
    let n110 = hashVec3(i + vec3f(1.0, 1.0, 0.0));
    let n001 = hashVec3(i + vec3f(0.0, 0.0, 1.0));
    let n101 = hashVec3(i + vec3f(1.0, 0.0, 1.0));
    let n011 = hashVec3(i + vec3f(0.0, 1.0, 1.0));
    let n111 = hashVec3(i + vec3f(1.0, 1.0, 1.0));

    let x0 = mix(n000, n100, f.x);
    let x1 = mix(n010, n110, f.x);
    let x2 = mix(n001, n101, f.x);
    let x3 = mix(n011, n111, f.x);

    let y0 = mix(x0, x1, f.y);
    let y1 = mix(x2, x3, f.y);

    return mix(y0, y1, f.z);
}

fn modifyCenter(center: ptr<function, vec3f>) {
    // Store original center before modifications
    let originalCenter = *center;
    initShared(originalCenter);
    
    let globalT = clamp(uniform.uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    // Когда globalT = 0.0: все точки в виде точек (localT = 0.0)
    // Когда globalT = 1.0: все точки в полной сцене (localT = 1.0)
    // Переход радиальный: ближние точки переходят первыми
    let maxDistance = uniform.uEndRadius;
    let waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    let waveThickness: f32 = uniform.uLoadFullSceneWaveThickness; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    var localT: f32;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        let signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    let localMotionStrength = 1.0 - localT; // 1.0 = full motion, 0.0 = no motion
    
    // Early exit optimization
    if (g_dist > uniform.uEndRadius) {
        return;
    }
    
    // Use original center for stable hash (prevents flickering)
    let phase = hash(g_originalCenter) * 6.28318;
    let phaseX = hash(g_originalCenter + vec3f(1.0, 0.0, 0.0)) * 6.28318;
    let phaseZ = hash(g_originalCenter + vec3f(0.0, 0.0, 1.0)) * 6.28318;
    
    // Smooth fade for motion effects - плавное затухание вместо резкого отключения
    let motionFade = smoothstep(0.0, uniform.uLoadFullSceneMotionFadeRange, localMotionStrength); // Плавное затухание
    
    // Gentle floating motion - interpolate out
    if (uniform.uFloatMotionSpeed > 0.001 && motionFade > 0.001) {
        let floatSpeed: f32 = uniform.uFloatMotionSpeed * 0.8;
        (*center).x += sin(uniform.uFloatTime * floatSpeed + phaseX) * 0.008 * motionFade;
        (*center).y += sin(uniform.uFloatTime * floatSpeed * 1.1 + phase) * 0.01 * motionFade;
        (*center).z += cos(uniform.uFloatTime * floatSpeed * 0.9 + phaseZ) * 0.008 * motionFade;
    }
    
    // Flowing wave motion across the splat cloud
    var radialDir = normalize(originalCenter - uniform.uCenter);
    if (length(radialDir) < 0.0001) {
        radialDir = vec3f(0.0, 1.0, 0.0);
    }
    let worldUp = vec3f(0.0, 1.0, 0.0);
    var tangentDir = normalize(cross(radialDir, worldUp));
    if (length(tangentDir) < 0.0001) {
        tangentDir = normalize(cross(radialDir, vec3f(1.0, 0.0, 0.0)));
    }
    let bitangentDir = normalize(cross(radialDir, tangentDir));
    
    // Flag-like wave motion - interpolate out
    if (uniform.uWaveSpeed > 0.001 && uniform.uWaveAmplitude > 0.001 && g_dotWavePos > 0.001 && motionFade > 0.001) {
        let noiseInput = originalCenter * 2.0 + vec3f(uniform.uFloatTime * uniform.uWaveSpeed * 0.5, uniform.uFloatTime * uniform.uWaveSpeed * 0.5, uniform.uFloatTime * uniform.uWaveSpeed * 0.5);
        let noiseSample = pcNoise(noiseInput);
        let centeredNoise = (noiseSample - vec3f(0.5, 0.5, 0.5)) * 2.0;
        
        (*center) += centeredNoise * uniform.uWaveAmplitude * motionFade;
        
        let waveFreq: f32 = 1.5 + uniform.uFloatMotionSpeed * 0.2;
        let alongRadial = dot(originalCenter - uniform.uCenter, radialDir);
        let alongTangent = dot(originalCenter - uniform.uCenter, tangentDir);
        
        let syncPhase = alongRadial * waveFreq + alongTangent * (waveFreq * 0.7) - uniform.uFloatTime * uniform.uWaveSpeed;
        let crossPhase = alongTangent * (waveFreq * 0.65) - uniform.uFloatTime * (uniform.uWaveSpeed * 0.4);
        
        (*center) += tangentDir * sin(syncPhase) * uniform.uWaveAmplitude * 0.3 * motionFade;
        (*center) += radialDir * cos(syncPhase * 0.6 + crossPhase) * uniform.uWaveAmplitude * 0.2 * motionFade;
    }

    // Noise-driven dispersive wave - interpolate out
    if (uniform.uDispersiveMotionSpeed > 0.001 && motionFade > 0.001) {
        let radialPlane = length((originalCenter - uniform.uCenter).xz);
        let waveFront = max(g_dotWavePos, 0.0001);
        let border = abs(waveFront - radialPlane - 0.5);
        var disperseAmount = 1.0 - smoothstep(waveFront - 0.5, waveFront + 0.5, radialPlane + 0.5);
        disperseAmount = max(disperseAmount, 0.8);
        let noiseInput = (originalCenter - uniform.uCenter) * 2.0 + vec3f(uniform.uFloatTime * 0.5, uniform.uFloatTime * 0.5, uniform.uFloatTime * 0.5);
        let noiseSample = pcNoise(noiseInput);
        let centeredNoise = (noiseSample - vec3f(0.5, 0.5, 0.5)) * 2.0;
        (*center) += centeredNoise * disperseAmount * 0.04 * motionFade;
    }

    // Ocean wave: gentle lift pulse - interpolate out
    if (uniform.uOceanWaveLiftScale > 0.001 && g_oceanWaveIntensity > 0.0 && motionFade > 0.001) {
        let liftPulse = sin(g_oceanWaveIntensity * 1.5707963);
        (*center).y += liftPulse * uniform.uOceanWaveLiftScale * 1.0 * motionFade;
    }

    // Descent effect: interpolate out
    if (uniform.uDescentHeight > 0.001 && g_dotWavePos > 0.001 && motionFade > 0.001) {
        if (g_dist <= g_dotWavePos) {
            let distFromWaveFront = g_dotWavePos - g_dist;
            if (distFromWaveFront <= uniform.uDescentDuration) {
                let descentProgress = distFromWaveFront / max(uniform.uDescentDuration, 0.001);
                let easedProgress = 1.0 - (1.0 - descentProgress) * (1.0 - descentProgress);
                (*center).y += uniform.uDescentHeight * (1.0 - easedProgress) * motionFade;
            }
        }
    }
}

fn modifyCovariance(originalCenter: vec3f, modifiedCenter: vec3f, covA: ptr<function, vec3f>, covB: ptr<function, vec3f>) {
    // Hide scene animation - скрытие по слоям
    let hideVisibility = hideSceneVisibility(modifiedCenter);
    if (hideVisibility <= 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Save original covariance BEFORE any modifications
    let origCovA = *covA;
    let origCovB = *covB;
    
    let globalT = clamp(uniform.uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    let maxDistance = uniform.uEndRadius;
    let waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    let waveThickness: f32 = uniform.uLoadFullSceneWaveThickness; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    var localT: f32;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        let signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    let localEffectStrength = 1.0 - localT; // 1.0 = full effects, 0.0 = no effects
    // Smooth fade for reveal effects - плавное затухание вместо резкого отключения
    let revealFade = smoothstep(0.0, uniform.uLoadFullSceneMotionFadeRange, localEffectStrength); // Плавное затухание
    
    // Early exit for distant splats - hide them (only if effects active)
    if (g_dist > uniform.uEndRadius && revealFade > 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Reverse mode: hide points that are beyond the wave (wave moves inward)
    if (uniform.uReverseMode > 0.5 && revealFade > 0.001) {
        if (g_dist > g_dotWavePos + 0.05) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        }
    } else if (revealFade > 0.001) {
        // Normal mode: initially hide everything - reveal starts from center
        if (g_dotWavePos <= 0.001) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        }
    }
    
    let maskFade = maskVisibility();
    if (maskFade <= 0.0001 && revealFade > 0.001) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }

    // Determine scale and phase (only if effects active)
    var scale: f32;
    
    if (revealFade > 0.001) {
        if (uniform.uReverseMode > 0.5) {
            if (g_dist <= g_dotWavePos - 0.05) {
                scale = 1.0;
            } else if (g_dist <= g_dotWavePos + 0.05) {
                let distToWave = abs(g_dist - g_dotWavePos);
                scale = select(
                    mix(1.0, 0.1, smoothstep(g_dotWavePos - 0.05, g_dotWavePos + 0.05, g_dist)),
                    mix(0.1, 0.2, 1.0 - distToWave * 40.0),
                    distToWave < 0.025
                );
            } else {
                gsplatMakeRound(covA, covB, 0.0);
                return;
            }
        } else if (g_dist > g_dotWavePos + 0.05) {
            gsplatMakeRound(covA, covB, 0.0);
            return;
        } else if (g_dist > g_dotWavePos - 0.05) {
            let distToWave = abs(g_dist - g_dotWavePos);
            scale = select(
                mix(0.0, 0.1, smoothstep(g_dotWavePos + 0.05, g_dotWavePos - 0.05, g_dist)),
                mix(0.1, 0.2, 1.0 - distToWave * 40.0),
                distToWave < 0.025
            );
        } else {
            scale = 0.1;
        }
    } else {
        // Effects disabled - show all points at full scale
        scale = 1.0;
    }
    
    // Apply scale to covariance with smooth interpolation to original
    let originalSize = gsplatExtractSize(origCovA, origCovB);
    
    if (scale >= 1.0) {
        // Fully revealed: transition from point cloud to full scene
        let pointCloudSize = originalSize * uniform.uPointCloudScale;
        let minSize: f32 = max(0.005 * uniform.uPointCloudScale, originalSize * 0.1 * uniform.uPointCloudScale);
        let pointCloudSizeFinal = max(pointCloudSize, minSize);
        
        // Smooth interpolation from point cloud to original (используем localT для радиальной волны)
        let finalSize = mix(pointCloudSizeFinal, originalSize, localT);
        
        // Interpolate shape: from round dots to original shape
        var dotCovA: vec3f = vec3f(0.0);
        var dotCovB: vec3f = vec3f(0.0);
        gsplatMakeRound(&dotCovA, &dotCovB, finalSize);
        
        *covA = mix(dotCovA, origCovA, localT);
        *covB = mix(dotCovB, origCovB, localT);
    } else {
        // Dot phase: interpolate to original (используем localT для радиальной волны)
        let scaledOriginal = originalSize * uniform.uPointCloudScale;
        var dotSize = min(scale * 0.08 * uniform.uPointCloudScale, max(scaledOriginal, originalSize * 0.1 * uniform.uPointCloudScale));
        let minSize: f32 = 0.001 * uniform.uPointCloudScale;
        dotSize = max(dotSize, minSize);
        
        // Interpolate dot phase to original
        var dotCovA: vec3f = vec3f(0.0);
        var dotCovB: vec3f = vec3f(0.0);
        gsplatMakeRound(&dotCovA, &dotCovB, dotSize);
        
        *covA = mix(dotCovA, origCovA, localT);
        *covB = mix(dotCovB, origCovB, localT);
    }
}

fn modifyColor(center: vec3f, color: ptr<function, vec4f>) {
    // Hide scene animation - скрытие по слоям
    let hideVisibility = hideSceneVisibility(center);
    if (hideVisibility <= 0.001) {
        (*color).a = 0.0;
        return;
    }
    
    let globalT = clamp(uniform.uLoadFullSceneProgress, 0.0, 1.0);
    
    // Радиальная волна для load full scene - переход от центра наружу
    // Когда globalT = 0.0: все точки в виде точек (localT = 0.0)
    // Когда globalT = 1.0: все точки в полной сцене (localT = 1.0)
    // Переход радиальный: ближние точки переходят первыми
    let maxDistance = uniform.uEndRadius;
    let waveRadius = globalT * maxDistance; // Радиус волны на текущий момент
    let waveThickness: f32 = uniform.uLoadFullSceneWaveThickness; // Толщина волны для плавного перехода
    
    // Локальный прогресс для этой точки на основе расстояния от центра
    var localT: f32;
    if (waveRadius <= 0.001) {
        localT = 0.0;
    } else {
        let signedDist = g_dist - waveRadius;
        localT = 1.0 - smoothstep(-waveThickness, waveThickness, signedDist);
    }
    
    let localEffectStrength = 1.0 - localT; // 1.0 = full effects, 0.0 = no effects
    // Smooth fade for reveal effects - плавное затухание вместо резкого отключения
    let revealFade = smoothstep(0.0, uniform.uLoadFullSceneMotionFadeRange, localEffectStrength); // Плавное затухание
    
    // Use shared globals
    if (g_dist > uniform.uEndRadius && revealFade > 0.001) {
        return;
    }
    
    // Reverse mode: hide points beyond wave (only if effects active)
    if (uniform.uReverseMode > 0.5 && revealFade > 0.001) {
        if (g_dist > g_dotWavePos + 0.05) {
            (*color).a = 0.0;
            return;
        }
    } else if (revealFade > 0.001) {
        // Normal mode: initially hide everything - reveal starts from center
        if (g_dotWavePos <= 0.001) {
            (*color).a = 0.0;
            return;
        }
    }
    
    let maskFade = maskVisibility();
    // Вместо резкого скрытия — плавно домножаем альфу на маску
    (*color).a *= mix(1.0, maskFade, revealFade);

    // Random sampling for point cloud density - only if effects active
    if (revealFade > 0.001) {
        let splatHash = hash(g_originalCenter);
        // Плавно убираем прореживание: при revealFade=0 → threshold=1 (не режем), при revealFade=1 → threshold=uniform.uPointCloudDensity
        let densityThreshold = mix(1.0, uniform.uPointCloudDensity, revealFade);
        if (splatHash > densityThreshold) {
            // Плавное затухание вместо полного скрытия
            (*color).a *= (1.0 - revealFade);
        }
    }
    
    // Interpolate opacity from point cloud opacity to full opacity (1.0) - используем localT для радиальной волны
    let finalOpacity = mix(uniform.uPointCloudOpacity, 1.0, localT);
    (*color).a *= finalOpacity;
    
    // Distance-based darkening: only apply if effects active (with smooth fade)
    if (uniform.uDistanceDarkening > 0.001 && revealFade > 0.001) {
        let distToCamera = length(center - uniform.uCameraPosition);
        let maxDist = uniform.uEndRadius * 2.0;
        let normalizedDist = clamp(distToCamera / maxDist, 0.0, 1.0);
        let darkeningFactor = 1.0 - (normalizedDist * uniform.uDistanceDarkening);
        (*color).rgb *= darkeningFactor;
    }
    
    // Apply tint effects with smooth fade interpolation
    if (revealFade > 0.001) {
        let radialPlane = length((g_originalCenter - uniform.uCenter).xz);
        let waveFront = max(g_dotWavePos, 0.0001);
        let waveBorder = abs(waveFront - radialPlane - 0.5);
        var disperseAmount = 1.0 - smoothstep(waveFront - 0.5, waveFront + 0.5, radialPlane + 0.5);
        disperseAmount = max(disperseAmount, 0.8);
        (*color).rgb += uniform.uDotTint * exp(-20.0 * waveBorder) * disperseAmount * 0.35 * revealFade;

        // Dot wave tint (active in dot phase)
        if (g_dist <= g_dotWavePos) {
            let distToDot = abs(g_dist - g_dotWavePos);
            let dotIntensity = smoothstep(max(0.01, uniform.uDotWaveThickness), 0.0, distToDot);
            (*color).rgb += uniform.uDotTint * dotIntensity * revealFade;
        }
    }

    // Apply base brightness with smooth fade
    (*color).rgb *= mix(1.0, uniform.uBaseBrightness, revealFade);
    
    (*color).a *= maskFade;

    // Ocean wave effects only if effects active (with smooth fade)
    if (g_oceanWaveIntensity > 0.0 && revealFade > 0.001) {
        let brightnessRestore = (1.0 / max(0.001, uniform.uBaseBrightness)) * max(0.001, uniform.uOceanWaveBrightness);
        (*color).rgb *= mix(1.0, brightnessRestore, g_oceanWaveIntensity);
    }
    
    // Apply hide scene visibility
    (*color).a *= hideVisibility;
}
`;

/**
 * Radial reveal effect for gaussian splats.
 * Creates waves emanating from a center point:
 * 1. Dot wave: Small colored dots appear progressively
 * 2. Ocean wave: Repeating waves that create lift and brightness effects
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * entity.script.create(GsplatRevealRadial, {
 *     attributes: {
 *         center: new pc.Vec3(0, 0, 0),
 *         speed: 2,
 *         delay: 1,
 *         oscillationIntensity: 0.2
 *     }
 * });
 */
class GsplatRevealRadial extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealRadial';

    // Reusable arrays for uniform updates
    _centerArray = [0, 0, 0];

    _dotTintArray = [0, 0, 0];

    _waveTintArray = [0, 0, 0];

    _cameraPositionArray = [0, 0, 0];

    /**
     * Origin point for radial waves
     * @attribute
     */
    center = new Vec3(0, 0, 0);

    /**
     * Base wave speed in units/second
     * @attribute
     * @range [0, 10]
     */
    speed = 1;

    /**
     * Speed increase over time
     * @attribute
     * @range [0, 5]
     */
    acceleration = 5;

    /**
     * Time offset before lift wave starts (seconds)
     * @attribute
     * @range [0, 10]
     */
    delay = 0;

    /**
     * Radius around the center that remains hidden before reveal begins.
     * Helps avoid showing partially loaded splats at time zero.
     * @attribute
     * @range [0, 10]
     */
    revealStartRadius = 0.3;

    /**
     * Optional radius (raw wave position) used to mask out already revealed regions when blending between scenes.
     * @attribute
     */
    maskRevealPos = 0;

    /**
     * Start radius paired with maskRevealPos to define the active mask wave.
     * @attribute
     */
    maskRevealStartRadius = 0;

    /**
     * Feather distance (world units) applied to the mask edge to avoid hard cut lines.
     * @attribute
     * @range [0, 5]
     */
    maskFeather = 0.4;

    /**
     * Additive color for initial dots
     * @attribute
     */
    dotTint = new Color(0, 1, 1);

    /**
     * Additive color for lift wave highlight
     * @attribute
     */
    waveTint = new Color(5, 0, 0);

    /**
     * Position oscillation strength
     * @attribute
     * @range [0, 1]
     */
    oscillationIntensity = 0.1;

    /**
     * Distance at which to disable effect for performance
     * @attribute
     * @range [0, 500]
     */
    endRadius = 25;

    /**
     * Scale factor for splat size to maintain point cloud appearance (0.0-1.0)
     * @attribute
     * @range [0, 1]
     */
    pointCloudScale = 0.85;

    /**
     * Opacity multiplier for point cloud appearance (0.0-1.0)
     * @attribute
     * @range [0, 1]
     */
    pointCloudOpacity = 0.6;

    /**
     * Density threshold for random sampling (0.0-1.0). Higher values show more splats.
     * @attribute
     * @range [0, 1]
     */
    pointCloudDensity = 0.25;

    /**
     * Speed multiplier for point motion animation (1.0 = normal, 1.5 = 1.5x faster).
     * @attribute
     * @range [0, 3]
     */
    pointMotionSpeed = 1.5;

    /**
     * Speed multiplier for floating motion animation (gentle floating and wave frequency).
     * @attribute
     * @range [0, 3]
     */
    floatMotionSpeed = 1.5;

    /**
     * Speed multiplier for dispersive wave animation (noise-driven movement).
     * @attribute
     * @range [0, 3]
     */
    dispersiveMotionSpeed = 1.0;

    /**
     * Thickness of the dot wave tint (world units). Higher values make the colored wave thicker.
     * @attribute
     * @range [0.01, 5]
     */
    dotWaveThickness = 1;

    /**
     * Thickness of the ocean wave tint (world units). Moves independently from main reveal.
     * @attribute
     * @range [0.01, 5]
     */
    oceanWaveThickness = 1;

    /**
     * Interval between ocean wave repetitions (seconds). The ocean wave repeats every N seconds.
     * @attribute
     * @range [1, 60]
     */
    oceanWaveInterval = 10;

    /**
     * Speed multiplier for the repeating ocean wave once the reveal completes.
     * @attribute
     * @range [0.1, 10]
     */
    oceanWaveSpeedMultiplier = 4;

    /**
     * Lift strength applied by the repeating ocean wave.
     * @attribute
     * @range [0, 1]
     */
    oceanWaveLiftScale = 0.6;

    /**
     * Brightness multiplier applied by the ocean wave relative to the base brightness.
     * @attribute
     * @range [0.5, 2]
     */
    oceanWaveBrightness = 1.0;

    /**
     * Speed of the wave motion animation. Higher values make waves move faster.
     * @attribute
     * @range [0, 5]
     */
    waveSpeed = 1.0;

    /**
     * Amplitude (size) of the wave motion. Higher values create larger wave movements.
     * @attribute
     * @range [0, 0.1]
     */
    waveAmplitude = 0.002;

    /**
     * Camera position for distance-based effects.
     * @attribute
     */
    cameraPosition = new Vec3(0, 0, 0);

    /**
     * Intensity of distance-based darkening effect. 0 = no darkening, 5 = very strong darkening at max distance.
     * @attribute
     * @range [0, 5]
     */
    distanceDarkening = 0.0;

    /**
     * Base brightness of all points in the scene. 1.0 = full brightness, 0.7 = 70% brightness.
     * @attribute
     * @range [0, 1]
     */
    baseBrightness = 0.7;

    /**
     * Height from which points start descending when they first appear.
     * @attribute
     * @range [0, 5]
     */
    descentHeight = 0.5;

    /**
     * Distance (in world units) over which points descend from their starting height.
     * Higher values make the descent happen over a longer distance.
     * @attribute
     * @range [0, 10]
     */
    descentDuration = 2.5;

    /**
     * Enable reverse mode: wave moves from outer edge to center (hiding effect).
     * @attribute
     */
    reverseMode = false;

    /**
     * Speed of the reverse wave in units/second (only used when reverseMode is true).
     * @attribute
     * @range [0.1, 10]
     */
    reverseSpeed = 1.0;

    /**
     * Progress of loading full scene (0.0 = point cloud, 1.0 = full scene).
     * @attribute
     * @range [0, 1]
     */
    loadFullSceneProgress = 0.0;

    /**
     * Wave thickness for load full scene animation.
     * @attribute
     * @range [0.1, 3.0]
     */
    loadFullSceneWaveThickness = 0.8;

    /**
     * Motion fade range for load full scene animation.
     * @attribute
     * @range [0.01, 0.5]
     */
    loadFullSceneMotionFadeRange = 0.15;

    /**
     * Progress of hiding scene animation (0.0 = visible, 1.0 = hidden).
     * @attribute
     * @range [0, 1]
     */
    hideSceneProgress = 0.0;

    /**
     * Hide mode: 0 = bottom to top (low points hide first), 1 = top to bottom (high points hide first), 2 = by distance from camera.
     * @attribute
     * @range [0, 2]
     */
    hideSceneMode = 0.0;

    /**
     * Layer thickness for hide scene animation (world units). Higher values create smoother transitions.
     * @attribute
     * @range [0.01, 1.0]
     */
    hideSceneLayerThickness = 0.1;

    /**
     * Minimum Y coordinate for height-based hide modes.
     * @attribute
     */
    hideSceneMinY = -10.0;

    /**
     * Maximum Y coordinate for height-based hide modes.
     * @attribute
     */
    hideSceneMaxY = 10.0;

    getShaderGLSL() {
        return shaderGLSL;
    }

    getShaderWGSL() {
        return shaderWGSL;
    }

    updateEffect(effectTime, dt) {
        // Pass full effectTime to shader - per-wave delays are handled in shader code
        this.setUniform('uTime', effectTime);
        this.setUniform('uFloatTime', effectTime);

        this._centerArray[0] = this.center.x;
        this._centerArray[1] = this.center.y;
        this._centerArray[2] = this.center.z;
        this.setUniform('uCenter', this._centerArray);

        this.setUniform('uSpeed', this.speed);
        this.setUniform('uAcceleration', this.acceleration);
        this.setUniform('uDelay', this.delay);

        this._dotTintArray[0] = this.dotTint.r;
        this._dotTintArray[1] = this.dotTint.g;
        this._dotTintArray[2] = this.dotTint.b;
        this.setUniform('uDotTint', this._dotTintArray);

        this._waveTintArray[0] = this.waveTint.r;
        this._waveTintArray[1] = this.waveTint.g;
        this._waveTintArray[2] = this.waveTint.b;
        this.setUniform('uWaveTint', this._waveTintArray);

        this.setUniform('uOscillationIntensity', this.oscillationIntensity);
        this.setUniform('uEndRadius', this.endRadius);
        this.setUniform('uPointCloudScale', this.pointCloudScale);
        this.setUniform('uPointCloudOpacity', this.pointCloudOpacity);
        this.setUniform('uPointCloudDensity', this.pointCloudDensity);
        this.setUniform('uPointMotionSpeed', this.pointMotionSpeed);
        this.setUniform('uFloatMotionSpeed', this.floatMotionSpeed);
        this.setUniform('uDispersiveMotionSpeed', this.dispersiveMotionSpeed);
        this.setUniform('uDotWaveThickness', this.dotWaveThickness);
        this.setUniform('uOceanWaveThickness', this.oceanWaveThickness);
        this.setUniform('uOceanWaveInterval', this.oceanWaveInterval);
        this.setUniform('uOceanWaveSpeedMultiplier', this.oceanWaveSpeedMultiplier);
        this.setUniform('uOceanWaveLiftScale', this.oceanWaveLiftScale);
        this.setUniform('uOceanWaveBrightness', this.oceanWaveBrightness);
        this.setUniform('uRevealStartRadius', this.revealStartRadius);
        this.setUniform('uMaskRevealPos', this.maskRevealPos ?? 0);
        this.setUniform('uMaskRevealStartRadius', this.maskRevealStartRadius ?? 0);
        this.setUniform('uMaskFeather', this.maskFeather ?? 0.4);
        this.setUniform('uWaveSpeed', this.waveSpeed);
        this.setUniform('uWaveAmplitude', this.waveAmplitude);
        
        this._cameraPositionArray[0] = this.cameraPosition.x;
        this._cameraPositionArray[1] = this.cameraPosition.y;
        this._cameraPositionArray[2] = this.cameraPosition.z;
        this.setUniform('uCameraPosition', this._cameraPositionArray);
        this.setUniform('uDistanceDarkening', this.distanceDarkening);
        this.setUniform('uBaseBrightness', this.baseBrightness);
        this.setUniform('uDescentHeight', this.descentHeight);
        this.setUniform('uDescentDuration', this.descentDuration);
        this.setUniform('uReverseMode', this.reverseMode ? 1 : 0);
        this.setUniform('uReverseSpeed', this.reverseSpeed);
        this.setUniform('uLoadFullSceneProgress', this.loadFullSceneProgress);
        this.setUniform('uLoadFullSceneWaveThickness', this.loadFullSceneWaveThickness);
        this.setUniform('uLoadFullSceneMotionFadeRange', this.loadFullSceneMotionFadeRange);
        this.setUniform('uHideSceneProgress', this.hideSceneProgress);
        this.setUniform('uHideSceneMode', this.hideSceneMode);
        this.setUniform('uHideSceneLayerThickness', this.hideSceneLayerThickness);
        this.setUniform('uHideSceneMinY', this.hideSceneMinY);
        this.setUniform('uHideSceneMaxY', this.hideSceneMaxY);
    }

    /**
     * Calculates when the lift wave reaches endRadius.
     * @returns {number} Time in seconds when the effect completes
     */
    getCompletionTime() {
        const liftStartTime = this.delay;

        // Solve for when wave reaches endRadius
        // endRadius = speed * t + 0.5 * acceleration * t²
        if (this.acceleration === 0) {
            // No acceleration: simple linear motion
            return Math.min(
                liftStartTime + (this.endRadius / this.speed),
                liftStartTime + MAX_REVEAL_TIME
            );
        }
        // With acceleration: use quadratic formula
        // 0.5 * a * t² + v * t - d = 0
        // t = (-v + sqrt(v² + 2ad)) / a
        const discriminant = this.speed * this.speed + 2 * this.acceleration * this.endRadius;
        if (discriminant < 0) {
            // Should not happen with positive values, but handle gracefully
            return Infinity;
        }
        const t = (-this.speed + Math.sqrt(discriminant)) / this.acceleration;
        return Math.min(liftStartTime + t, liftStartTime + MAX_REVEAL_TIME);

    }

    /**
     * Checks if the reveal effect has completed (lift wave reached endRadius).
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        if (this.effectTime - this.delay >= MAX_REVEAL_TIME) {
            return true;
        }
        return this.effectTime >= this.getCompletionTime();
    }
}

export { GsplatRevealRadial };
