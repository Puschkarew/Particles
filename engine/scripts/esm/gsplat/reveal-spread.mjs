import { Vec3, Color } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform vec3 uCenter;
uniform float uSpeed;
uniform float uAcceleration;
uniform float uSpreadAngle;
uniform float uEndRadius;
uniform vec3 uSpreadTint;
uniform float uSpreadTintIntensity;

// Shared globals
float g_dist;
float g_wavePos;

void initShared(vec3 center) {
    g_dist = length(center - uCenter);
    
    // Calculate wave position (distance from center)
    float spreadTime = max(0.0, uTime);
    g_wavePos = uSpeed * spreadTime + 0.5 * uAcceleration * spreadTime * spreadTime;
}

void modifyCenter(inout vec3 center) {
    vec3 originalCenter = center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uEndRadius) return;
    
    // If wave hasn't reached this splat yet, hide it
    if (g_dist > g_wavePos) return;
    
    // Calculate spread effect - push splats outward based on distance from center
    vec3 direction = normalize(originalCenter - uCenter);
    float spreadAmount = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    spreadAmount = smoothstep(0.0, 1.0, spreadAmount);
    
    // Apply spread with angle variation
    float spreadDistance = spreadAmount * uSpreadAngle * 0.5;
    center += direction * spreadDistance;
}

void modifyCovariance(vec3 originalCenter, vec3 modifiedCenter, inout vec3 covA, inout vec3 covB) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uEndRadius || g_dist > g_wavePos + 0.1) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    float originalSize = gsplatExtractSize(covA, covB);
    
    // Calculate reveal progress
    float distToWave = g_wavePos - g_dist;
    float progress = clamp(distToWave / max(g_wavePos, 0.001), 0.0, 1.0);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Start as small dots, grow to full size
    float minSize = originalSize * 0.05;
    float currentSize = mix(minSize, originalSize, progress);
    
    // Interpolate between round dots and original shape
    vec3 origCovA = covA;
    vec3 origCovB = covB;
    gsplatMakeRound(covA, covB, currentSize);
    
    covA = mix(covA, origCovA, progress);
    covB = mix(covB, origCovB, progress);
}

void modifyColor(vec3 center, inout vec4 color) {
    initShared(center);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uEndRadius || g_dist > g_wavePos + 0.1) {
        color.a = 0.0;
        return;
    }
    
    // Calculate reveal progress
    float distToWave = g_wavePos - g_dist;
    float progress = clamp(distToWave / max(g_wavePos, 0.001), 0.0, 1.0);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during spread
    if (progress < 1.0) {
        color.rgb = mix(color.rgb, uSpreadTint, uSpreadTintIntensity * (1.0 - progress));
    }
    
    // Fade in opacity
    color.a *= progress;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uCenter: vec3f;
uniform uSpeed: f32;
uniform uAcceleration: f32;
uniform uSpreadAngle: f32;
uniform uEndRadius: f32;
uniform uSpreadTint: vec3f;
uniform uSpreadTintIntensity: f32;

// Shared globals
var<private> g_dist: f32;
var<private> g_wavePos: f32;

fn initShared(center: vec3f) {
    g_dist = length(center - uniform.uCenter);
    
    // Calculate wave position (distance from center)
    let spreadTime = max(0.0, uniform.uTime);
    g_wavePos = uniform.uSpeed * spreadTime + 0.5 * uniform.uAcceleration * spreadTime * spreadTime;
}

fn modifyCenter(center: ptr<function, vec3f>) {
    let originalCenter = *center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uniform.uEndRadius) {
        return;
    }
    
    // If wave hasn't reached this splat yet, hide it
    if (g_dist > g_wavePos) {
        return;
    }
    
    // Calculate spread effect - push splats outward based on distance from center
    var direction = normalize(originalCenter - uniform.uCenter);
    var spreadAmount = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    spreadAmount = smoothstep(0.0, 1.0, spreadAmount);
    
    // Apply spread with angle variation
    let spreadDistance = spreadAmount * uniform.uSpreadAngle * 0.5;
    (*center) += direction * spreadDistance;
}

fn modifyCovariance(originalCenter: vec3f, modifiedCenter: vec3f, covA: ptr<function, vec3f>, covB: ptr<function, vec3f>) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uniform.uEndRadius || g_dist > g_wavePos + 0.1) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    let originalSize = gsplatExtractSize(*covA, *covB);
    
    // Calculate reveal progress
    let distToWave = g_wavePos - g_dist;
    var progress = clamp(distToWave / max(g_wavePos, 0.001), 0.0, 1.0);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Start as small dots, grow to full size
    let minSize = originalSize * 0.05;
    let currentSize = mix(minSize, originalSize, progress);
    
    // Interpolate between round dots and original shape
    let origCovA = *covA;
    let origCovB = *covB;
    gsplatMakeRound(covA, covB, currentSize);
    
    *covA = mix(*covA, origCovA, progress);
    *covB = mix(*covB, origCovB, progress);
}

fn modifyColor(center: vec3f, color: ptr<function, vec4f>) {
    initShared(center);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uniform.uEndRadius || g_dist > g_wavePos + 0.1) {
        (*color).a = 0.0;
        return;
    }
    
    // Calculate reveal progress
    let distToWave = g_wavePos - g_dist;
    var progress = clamp(distToWave / max(g_wavePos, 0.001), 0.0, 1.0);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during spread
    if (progress < 1.0) {
        (*color) = vec4f(mix((*color).rgb, uniform.uSpreadTint, uniform.uSpreadTintIntensity * (1.0 - progress)), (*color).a);
    }
    
    // Fade in opacity
    (*color).a *= progress;
}
`;

/**
 * Spread reveal effect for gaussian splats.
 * Splats spread outward from a center point with a spreading effect.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const spreadScript = entity.script.create(GsplatRevealSpread);
 * spreadScript.center.set(0, 0, 0);
 * spreadScript.speed = 2.0;
 * spreadScript.spreadAngle = 1.0;
 */
class GsplatRevealSpread extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealSpread';

    // Reusable arrays for uniform updates
    _centerArray = [0, 0, 0];
    _spreadTintArray = [0, 0, 0];

    /**
     * Origin point for the spread
     * @attribute
     */
    center = new Vec3(0, 0, 0);

    /**
     * Spread wave speed in units/second
     * @attribute
     * @range [0, 10]
     */
    speed = 2.0;

    /**
     * Speed increase over time
     * @attribute
     * @range [0, 5]
     */
    acceleration = 0;

    /**
     * Spread angle/intensity - how much splats spread outward
     * @attribute
     * @range [0, 5]
     */
    spreadAngle = 1.0;

    /**
     * Color tint during spread
     * @attribute
     */
    spreadTint = new Color(1, 0.5, 0);

    /**
     * Blend intensity between original color and spread tint (0=original, 1=full tint)
     * @attribute
     * @range [0, 1]
     */
    spreadTintIntensity = 0.3;

    /**
     * Distance at which to disable effect for performance
     * @attribute
     * @range [0, 500]
     */
    endRadius = 5000;

    getShaderGLSL() {
        return shaderGLSL;
    }

    getShaderWGSL() {
        return shaderWGSL;
    }

    updateEffect(effectTime, dt) {
        this.setUniform('uTime', effectTime);

        this._centerArray[0] = this.center.x;
        this._centerArray[1] = this.center.y;
        this._centerArray[2] = this.center.z;
        this.setUniform('uCenter', this._centerArray);

        this.setUniform('uSpeed', this.speed);
        this.setUniform('uAcceleration', this.acceleration);
        this.setUniform('uSpreadAngle', this.spreadAngle);
        this.setUniform('uEndRadius', this.endRadius);

        this._spreadTintArray[0] = this.spreadTint.r;
        this._spreadTintArray[1] = this.spreadTint.g;
        this._spreadTintArray[2] = this.spreadTint.b;
        this.setUniform('uSpreadTint', this._spreadTintArray);
        this.setUniform('uSpreadTintIntensity', this.spreadTintIntensity);
    }

    /**
     * Checks if the spread effect has completed
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        // Calculate when wave reaches endRadius
        if (this.acceleration === 0) {
            return this.effectTime >= (this.endRadius / this.speed);
        }
        // With acceleration: use quadratic formula
        const discriminant = this.speed * this.speed + 2 * this.acceleration * this.endRadius;
        if (discriminant < 0) {
            return false;
        }
        const t = (-this.speed + Math.sqrt(discriminant)) / this.acceleration;
        return this.effectTime >= t;
    }
}

export { GsplatRevealSpread };

