import { Vec3, Color } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform vec3 uCenter;
uniform float uSpeed;
uniform float uDistortionAmount;
uniform float uPulseSpeed;
uniform float uMagicIntensity;
uniform float uEndRadius;
uniform vec3 uMagicTint;
uniform float uMagicTintIntensity;

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

// Shared globals
float g_dist;
float g_wavePos;
float g_magicPhase;

void initShared(vec3 center) {
    g_dist = length(center - uCenter);
    
    // Calculate wave position (distance from center)
    float magicTime = max(0.0, uTime);
    g_wavePos = uSpeed * magicTime;
    
    // Calculate magic phase for this splat (based on position)
    g_magicPhase = hash(center) * 6.28318;
}

void modifyCenter(inout vec3 center) {
    vec3 originalCenter = center;
    initShared(originalCenter);
    
    // Early exit for distant splats
    if (g_dist > uEndRadius) return;
    
    // If wave hasn't reached this splat yet, hide it
    if (g_dist > g_wavePos) return;
    
    // Calculate magic reveal progress
    float progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply magic distortion using noise
    vec3 noiseInput = originalCenter * 2.0 + vec3(uTime * uPulseSpeed);
    vec3 noiseSample = pcNoise(noiseInput);
    vec3 centeredNoise = (noiseSample - 0.5) * 2.0;
    
    // Distortion effect - stronger when appearing
    float distortionStrength = uDistortionAmount * (1.0 - progress) * uMagicIntensity;
    center += centeredNoise * distortionStrength;
    
    // Pulsing effect - splats pulse as they appear
    float pulse = sin(uTime * uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    float pulseAmount = (1.0 - progress) * uMagicIntensity * 0.3;
    vec3 direction = normalize(originalCenter - uCenter);
    center += direction * pulse * pulseAmount;
    
    // Spiral magic effect
    float spiralAngle = (1.0 - progress) * 3.14159 + uTime * uPulseSpeed * 0.5;
    vec2 offset2D = (originalCenter - uCenter).xz;
    float angle = atan(offset2D.y, offset2D.x);
    float radius2D = length(offset2D);
    
    float spiralOffset = sin(spiralAngle + g_magicPhase) * (1.0 - progress) * uMagicIntensity * 0.5;
    center.x = uCenter.x + (radius2D + spiralOffset) * cos(angle);
    center.z = uCenter.z + (radius2D + spiralOffset) * sin(angle);
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
    
    // Magic pulsing size effect
    float pulse = sin(uTime * uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    float pulseSize = mix(0.8, 1.2, pulse) * (1.0 - progress) * uMagicIntensity * 0.2;
    
    // Start as small dots, grow to full size with magic pulse
    float minSize = originalSize * 0.05;
    float baseSize = mix(minSize, originalSize, progress);
    float currentSize = baseSize * (1.0 + pulseSize);
    
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
    
    // Magic pulsing brightness
    float pulse = sin(uTime * uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    float brightnessPulse = 1.0 + pulse * (1.0 - progress) * uMagicIntensity * 0.5;
    color.rgb *= brightnessPulse;
    
    // Apply magic tint
    if (progress < 1.0) {
        float tintStrength = uMagicTintIntensity * (1.0 - progress);
        color.rgb = mix(color.rgb, uMagicTint, tintStrength);
    }
    
    // Fade in opacity with magic shimmer
    float shimmer = sin(uTime * uPulseSpeed * 2.0 + g_magicPhase) * 0.1 + 0.9;
    color.a *= progress * shimmer;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uCenter: vec3f;
uniform uSpeed: f32;
uniform uDistortionAmount: f32;
uniform uPulseSpeed: f32;
uniform uMagicIntensity: f32;
uniform uEndRadius: f32;
uniform uMagicTint: vec3f;
uniform uMagicTintIntensity: f32;

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

// Shared globals
var<private> g_dist: f32;
var<private> g_wavePos: f32;
var<private> g_magicPhase: f32;

fn initShared(center: vec3f) {
    g_dist = length(center - uniform.uCenter);
    
    // Calculate wave position (distance from center)
    let magicTime = max(0.0, uniform.uTime);
    g_wavePos = uniform.uSpeed * magicTime;
    
    // Calculate magic phase for this splat (based on position)
    g_magicPhase = hash(center) * 6.28318;
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
    
    // Calculate magic reveal progress
    var progress = (g_wavePos - g_dist) / max(g_wavePos, 0.001);
    progress = smoothstep(0.0, 1.0, progress);
    
    // Apply magic distortion using noise
    let noiseInput = originalCenter * 2.0 + vec3f(uniform.uTime * uniform.uPulseSpeed);
    let noiseSample = pcNoise(noiseInput);
    let centeredNoise = (noiseSample - vec3f(0.5, 0.5, 0.5)) * 2.0;
    
    // Distortion effect - stronger when appearing
    let distortionStrength = uniform.uDistortionAmount * (1.0 - progress) * uniform.uMagicIntensity;
    (*center) += centeredNoise * distortionStrength;
    
    // Pulsing effect - splats pulse as they appear
    let pulse = sin(uniform.uTime * uniform.uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    let pulseAmount = (1.0 - progress) * uniform.uMagicIntensity * 0.3;
    var direction = normalize(originalCenter - uniform.uCenter);
    (*center) += direction * pulse * pulseAmount;
    
    // Spiral magic effect
    let spiralAngle = (1.0 - progress) * 3.14159 + uniform.uTime * uniform.uPulseSpeed * 0.5;
    let offset2D = (originalCenter - uniform.uCenter).xz;
    let angle = atan2(offset2D.y, offset2D.x);
    let radius2D = length(offset2D);
    
    let spiralOffset = sin(spiralAngle + g_magicPhase) * (1.0 - progress) * uniform.uMagicIntensity * 0.5;
    (*center).x = uniform.uCenter.x + (radius2D + spiralOffset) * cos(angle);
    (*center).z = uniform.uCenter.z + (radius2D + spiralOffset) * sin(angle);
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
    
    // Magic pulsing size effect
    let pulse = sin(uniform.uTime * uniform.uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    let pulseSize = mix(0.8, 1.2, pulse) * (1.0 - progress) * uniform.uMagicIntensity * 0.2;
    
    // Start as small dots, grow to full size with magic pulse
    let minSize = originalSize * 0.05;
    let baseSize = mix(minSize, originalSize, progress);
    let currentSize = baseSize * (1.0 + pulseSize);
    
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
    
    // Magic pulsing brightness
    let pulse = sin(uniform.uTime * uniform.uPulseSpeed + g_magicPhase) * 0.5 + 0.5;
    let brightnessPulse = 1.0 + pulse * (1.0 - progress) * uniform.uMagicIntensity * 0.5;
    (*color).rgb *= brightnessPulse;
    
    // Apply magic tint
    if (progress < 1.0) {
        let tintStrength = uniform.uMagicTintIntensity * (1.0 - progress);
        (*color) = vec4f(mix((*color).rgb, uniform.uMagicTint, tintStrength), (*color).a);
    }
    
    // Fade in opacity with magic shimmer
    let shimmer = sin(uniform.uTime * uniform.uPulseSpeed * 2.0 + g_magicPhase) * 0.1 + 0.9;
    (*color).a *= progress * shimmer;
}
`;

/**
 * Magic reveal effect for gaussian splats.
 * Creates a magical appearance with distortions, pulsing, and shimmer effects.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const magicScript = entity.script.create(GsplatRevealMagic);
 * magicScript.center.set(0, 0, 0);
 * magicScript.speed = 2.0;
 * magicScript.distortionAmount = 0.5;
 * magicScript.pulseSpeed = 2.0;
 */
class GsplatRevealMagic extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealMagic';

    // Reusable arrays for uniform updates
    _centerArray = [0, 0, 0];
    _magicTintArray = [0, 0, 0];

    /**
     * Origin point for the magic effect
     * @attribute
     */
    center = new Vec3(0, 0, 0);

    /**
     * Magic wave speed in units/second
     * @attribute
     * @range [0, 10]
     */
    speed = 2.0;

    /**
     * Amount of distortion applied to splats
     * @attribute
     * @range [0, 2]
     */
    distortionAmount = 0.5;

    /**
     * Speed of pulsing effects (cycles per second)
     * @attribute
     * @range [0, 10]
     */
    pulseSpeed = 2.0;

    /**
     * Overall intensity of magic effects
     * @attribute
     * @range [0, 2]
     */
    magicIntensity = 1.0;

    /**
     * Color tint for magic effect
     * @attribute
     */
    magicTint = new Color(0.5, 0.3, 1.0);

    /**
     * Blend intensity between original color and magic tint (0=original, 1=full tint)
     * @attribute
     * @range [0, 1]
     */
    magicTintIntensity = 0.4;

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
        this.setUniform('uDistortionAmount', this.distortionAmount);
        this.setUniform('uPulseSpeed', this.pulseSpeed);
        this.setUniform('uMagicIntensity', this.magicIntensity);
        this.setUniform('uEndRadius', this.endRadius);

        this._magicTintArray[0] = this.magicTint.r;
        this._magicTintArray[1] = this.magicTint.g;
        this._magicTintArray[2] = this.magicTint.b;
        this.setUniform('uMagicTint', this._magicTintArray);
        this.setUniform('uMagicTintIntensity', this.magicTintIntensity);
    }

    /**
     * Checks if the magic effect has completed
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        return this.effectTime >= (this.endRadius / this.speed);
    }
}

export { GsplatRevealMagic };

