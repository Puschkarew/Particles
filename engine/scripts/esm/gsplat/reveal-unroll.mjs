import { Vec3, Color } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uDirection;
uniform float uSpeed;
uniform float uUnrollAngle;
uniform float uEndRadius;
uniform vec3 uUnrollTint;
uniform float uUnrollTintIntensity;

// Shared globals
float g_dist;
float g_wavePos;
float g_projectedDist;

void initShared(vec3 center) {
    vec3 offset = center - uCenter;
    g_dist = length(offset);
    
    // Project distance along unroll direction
    g_projectedDist = dot(offset, normalize(uDirection));
    
    // Calculate wave position along direction
    float unrollTime = max(0.0, uTime);
    g_wavePos = uSpeed * unrollTime;
}

void modifyCenter(inout vec3 center) {
    vec3 originalCenter = center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uEndRadius) return;
    
    // If wave hasn't reached this splat yet, hide it
    if (g_projectedDist > g_wavePos) return;
    
    // Calculate unroll progress
    float progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply unroll rotation effect
    vec3 direction = normalize(uDirection);
    vec3 offset = originalCenter - uCenter;
    float angle = (1.0 - progress) * uUnrollAngle;
    
    // Rotate around axis perpendicular to direction
    vec3 axis = abs(direction.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);
    vec3 perpAxis = normalize(cross(direction, axis));
    
    float cosAngle = cos(angle);
    float sinAngle = sin(angle);
    
    vec3 rotatedOffset = offset * cosAngle + cross(perpAxis, offset) * sinAngle + perpAxis * dot(perpAxis, offset) * (1.0 - cosAngle);
    center = uCenter + rotatedOffset;
}

void modifyCovariance(vec3 originalCenter, vec3 modifiedCenter, inout vec3 covA, inout vec3 covB) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uEndRadius || g_projectedDist > g_wavePos + 0.1) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    float originalSize = gsplatExtractSize(covA, covB);
    
    // Calculate reveal progress
    float progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
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
    if (g_dist > uEndRadius || g_projectedDist > g_wavePos + 0.1) {
        color.a = 0.0;
        return;
    }
    
    // Calculate reveal progress
    float progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during unroll
    if (progress < 1.0) {
        color.rgb = mix(color.rgb, uUnrollTint, uUnrollTintIntensity * (1.0 - progress));
    }
    
    // Fade in opacity
    color.a *= progress;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uCenter: vec3f;
uniform uDirection: vec3f;
uniform uSpeed: f32;
uniform uUnrollAngle: f32;
uniform uEndRadius: f32;
uniform uUnrollTint: vec3f;
uniform uUnrollTintIntensity: f32;

// Shared globals
var<private> g_dist: f32;
var<private> g_wavePos: f32;
var<private> g_projectedDist: f32;

fn initShared(center: vec3f) {
    let offset = center - uniform.uCenter;
    g_dist = length(offset);
    
    // Project distance along unroll direction
    g_projectedDist = dot(offset, normalize(uniform.uDirection));
    
    // Calculate wave position along direction
    let unrollTime = max(0.0, uniform.uTime);
    g_wavePos = uniform.uSpeed * unrollTime;
}

fn modifyCenter(center: ptr<function, vec3f>) {
    let originalCenter = *center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uniform.uEndRadius) {
        return;
    }
    
    // If wave hasn't reached this splat yet, hide it
    if (g_projectedDist > g_wavePos) {
        return;
    }
    
    // Calculate unroll progress
    var progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply unroll rotation effect
    let direction = normalize(uniform.uDirection);
    let offset = originalCenter - uniform.uCenter;
    let angle = (1.0 - progress) * uniform.uUnrollAngle;
    
    // Rotate around axis perpendicular to direction
    var axis = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 1.0, 0.0), abs(direction.y) < 0.9);
    let perpAxis = normalize(cross(direction, axis));
    
    let cosAngle = cos(angle);
    let sinAngle = sin(angle);
    
    let rotatedOffset = offset * cosAngle + cross(perpAxis, offset) * sinAngle + perpAxis * dot(perpAxis, offset) * (1.0 - cosAngle);
    *center = uniform.uCenter + rotatedOffset;
}

fn modifyCovariance(originalCenter: vec3f, modifiedCenter: vec3f, covA: ptr<function, vec3f>, covB: ptr<function, vec3f>) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius or before wave reaches
    if (g_dist > uniform.uEndRadius || g_projectedDist > g_wavePos + 0.1) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    let originalSize = gsplatExtractSize(*covA, *covB);
    
    // Calculate reveal progress
    var progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
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
    if (g_dist > uniform.uEndRadius || g_projectedDist > g_wavePos + 0.1) {
        (*color).a = 0.0;
        return;
    }
    
    // Calculate reveal progress
    var progress = (g_wavePos - g_projectedDist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply tint during unroll
    if (progress < 1.0) {
        (*color) = vec4f(mix((*color).rgb, uniform.uUnrollTint, uniform.uUnrollTintIntensity * (1.0 - progress)), (*color).a);
    }
    
    // Fade in opacity
    (*color).a *= progress;
}
`;

/**
 * Unroll reveal effect for gaussian splats.
 * Scene unrolls like a carpet or scroll in a specified direction.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const unrollScript = entity.script.create(GsplatRevealUnroll);
 * unrollScript.center.set(0, 0, 0);
 * unrollScript.direction.set(1, 0, 0); // Unroll along X axis
 * unrollScript.speed = 2.0;
 */
class GsplatRevealUnroll extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealUnroll';

    // Reusable arrays for uniform updates
    _centerArray = [0, 0, 0];
    _directionArray = [1, 0, 0];
    _unrollTintArray = [0, 0, 0];

    /**
     * Origin point for the unroll
     * @attribute
     */
    center = new Vec3(0, 0, 0);

    /**
     * Direction of unroll (normalized)
     * @attribute
     */
    direction = new Vec3(1, 0, 0);

    /**
     * Unroll speed in units/second
     * @attribute
     * @range [0, 10]
     */
    speed = 2.0;

    /**
     * Unroll angle in radians - how much rotation during unroll
     * @attribute
     * @range [0, 3.14159]
     */
    unrollAngle = 1.57; // 90 degrees

    /**
     * Color tint during unroll
     * @attribute
     */
    unrollTint = new Color(0.5, 0.8, 1.0);

    /**
     * Blend intensity between original color and unroll tint (0=original, 1=full tint)
     * @attribute
     * @range [0, 1]
     */
    unrollTintIntensity = 0.2;

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

        // Normalize direction
        const dir = this.direction.clone().normalize();
        this._directionArray[0] = dir.x;
        this._directionArray[1] = dir.y;
        this._directionArray[2] = dir.z;
        this.setUniform('uDirection', this._directionArray);

        this.setUniform('uSpeed', this.speed);
        this.setUniform('uUnrollAngle', this.unrollAngle);
        this.setUniform('uEndRadius', this.endRadius);

        this._unrollTintArray[0] = this.unrollTint.r;
        this._unrollTintArray[1] = this.unrollTint.g;
        this._unrollTintArray[2] = this.unrollTint.b;
        this.setUniform('uUnrollTint', this._unrollTintArray);
        this.setUniform('uUnrollTintIntensity', this.unrollTintIntensity);
    }

    /**
     * Checks if the unroll effect has completed
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        // Estimate completion based on endRadius
        return this.effectTime >= (this.endRadius / this.speed);
    }
}

export { GsplatRevealUnroll };

