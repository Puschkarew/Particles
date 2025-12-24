import { Vec3, Color } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform vec3 uCenter;
uniform float uSpeed;
uniform float uTwistIntensity;
uniform float uRotationSpeed;
uniform float uEndRadius;
uniform vec3 uTwistTint;
uniform float uTwistTintIntensity;

// Shared globals
float g_dist;
float g_wavePos;
float g_angle;

void initShared(vec3 center) {
    vec3 offset = center - uCenter;
    g_dist = length(offset);
    
    // Calculate wave position (distance from center)
    float twistTime = max(0.0, uTime);
    g_wavePos = uSpeed * twistTime;
    
    // Calculate angle from center (for rotation)
    vec2 offset2D = offset.xz;
    g_angle = atan(offset2D.y, offset2D.x);
}

void modifyCenter(inout vec3 center) {
    vec3 originalCenter = center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uEndRadius) return;
    
    // If wave hasn't reached this splat yet, hide it
    if (g_dist > g_wavePos) return;
    
    // Calculate twist progress
    float progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply twist rotation - splats rotate around Y axis as they appear
    vec3 offset = originalCenter - uCenter;
    float twistAngle = (1.0 - progress) * uTwistIntensity * 6.28318; // Full rotation in radians
    float rotationAngle = uTime * uRotationSpeed;
    
    // Combine twist and rotation
    float totalAngle = g_angle + twistAngle + rotationAngle;
    
    // Rotate in XZ plane
    float cosAngle = cos(totalAngle);
    float sinAngle = sin(totalAngle);
    float radius2D = length(offset.xz);
    
    center.x = uCenter.x + radius2D * cosAngle;
    center.z = uCenter.z + radius2D * sinAngle;
    center.y = originalCenter.y; // Keep Y position
    
    // Add vertical spiral effect
    float spiralHeight = (1.0 - progress) * uTwistIntensity * 2.0;
    center.y += sin(progress * 3.14159) * spiralHeight;
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
    float progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
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
    float progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during twist
    if (progress < 1.0) {
        color.rgb = mix(color.rgb, uTwistTint, uTwistTintIntensity * (1.0 - progress));
    }
    
    // Fade in opacity
    color.a *= progress;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uCenter: vec3f;
uniform uSpeed: f32;
uniform uTwistIntensity: f32;
uniform uRotationSpeed: f32;
uniform uEndRadius: f32;
uniform uTwistTint: vec3f;
uniform uTwistTintIntensity: f32;

// Shared globals
var<private> g_dist: f32;
var<private> g_wavePos: f32;
var<private> g_angle: f32;

fn initShared(center: vec3f) {
    let offset = center - uniform.uCenter;
    g_dist = length(offset);
    
    // Calculate wave position (distance from center)
    let twistTime = max(0.0, uniform.uTime);
    g_wavePos = uniform.uSpeed * twistTime;
    
    // Calculate angle from center (for rotation)
    let offset2D = offset.xz;
    g_angle = atan2(offset2D.y, offset2D.x);
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
    
    // Calculate twist progress
    var progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply twist rotation - splats rotate around Y axis as they appear
    let offset = originalCenter - uniform.uCenter;
    let twistAngle = (1.0 - progress) * uniform.uTwistIntensity * 6.28318; // Full rotation in radians
    let rotationAngle = uniform.uTime * uniform.uRotationSpeed;
    
    // Combine twist and rotation
    let totalAngle = g_angle + twistAngle + rotationAngle;
    
    // Rotate in XZ plane
    let cosAngle = cos(totalAngle);
    let sinAngle = sin(totalAngle);
    let radius2D = length(offset.xz);
    
    (*center).x = uniform.uCenter.x + radius2D * cosAngle;
    (*center).z = uniform.uCenter.z + radius2D * sinAngle;
    (*center).y = originalCenter.y; // Keep Y position
    
    // Add vertical spiral effect
    let spiralHeight = (1.0 - progress) * uniform.uTwistIntensity * 2.0;
    (*center).y += sin(progress * 3.14159) * spiralHeight;
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
    var progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
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
    var progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during twist
    if (progress < 1.0) {
        (*color) = vec4f(mix((*color).rgb, uniform.uTwistTint, uniform.uTwistTintIntensity * (1.0 - progress)), (*color).a);
    }
    
    // Fade in opacity
    (*color).a *= progress;
}
`;

/**
 * Twister reveal effect for gaussian splats.
 * Splats twist and rotate around a center point as they appear.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const twisterScript = entity.script.create(GsplatRevealTwister);
 * twisterScript.center.set(0, 0, 0);
 * twisterScript.speed = 2.0;
 * twisterScript.twistIntensity = 1.0;
 */
class GsplatRevealTwister extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealTwister';

    // Reusable arrays for uniform updates
    _centerArray = [0, 0, 0];
    _twistTintArray = [0, 0, 0];

    /**
     * Origin point for the twist
     * @attribute
     */
    center = new Vec3(0, 0, 0);

    /**
     * Twist wave speed in units/second
     * @attribute
     * @range [0, 10]
     */
    speed = 2.0;

    /**
     * Twist intensity - how much rotation during reveal (1.0 = full rotation)
     * @attribute
     * @range [0, 2]
     */
    twistIntensity = 1.0;

    /**
     * Continuous rotation speed after reveal (radians/second)
     * @attribute
     * @range [0, 5]
     */
    rotationSpeed = 0.5;

    /**
     * Color tint during twist
     * @attribute
     */
    twistTint = new Color(1, 0, 1);

    /**
     * Blend intensity between original color and twist tint (0=original, 1=full tint)
     * @attribute
     * @range [0, 1]
     */
    twistTintIntensity = 0.3;

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
        this.setUniform('uTwistIntensity', this.twistIntensity);
        this.setUniform('uRotationSpeed', this.rotationSpeed);
        this.setUniform('uEndRadius', this.endRadius);

        this._twistTintArray[0] = this.twistTint.r;
        this._twistTintArray[1] = this.twistTint.g;
        this._twistTintArray[2] = this.twistTint.b;
        this.setUniform('uTwistTint', this._twistTintArray);
        this.setUniform('uTwistTintIntensity', this.twistTintIntensity);
    }

    /**
     * Checks if the twist effect has completed
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        return this.effectTime >= (this.endRadius / this.speed);
    }
}

export { GsplatRevealTwister };

