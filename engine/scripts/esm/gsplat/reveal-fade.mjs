import { Vec3 } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform float uDuration;
uniform float uEndRadius;

// Shared globals
float g_dist;

void initShared(vec3 center) {
    g_dist = length(center);
}

void modifyCenter(inout vec3 center) {
    initShared(center);
    // No position modifications for fade effect
}

void modifyCovariance(vec3 originalCenter, vec3 modifiedCenter, inout vec3 covA, inout vec3 covB) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius
    if (g_dist > uEndRadius) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Calculate fade progress (0.0 to 1.0)
    float progress = clamp(uTime / max(uDuration, 0.001), 0.0, 1.0);
    
    // If not fully faded in, scale down slightly for smoother transition
    if (progress < 1.0) {
        float originalSize = gsplatExtractSize(covA, covB);
        float minSize = originalSize * 0.1;
        float currentSize = mix(minSize, originalSize, progress);
        
        vec3 origCovA = covA;
        vec3 origCovB = covB;
        gsplatMakeRound(covA, covB, currentSize);
        
        // Interpolate between round and original shape
        covA = mix(covA, origCovA, progress);
        covB = mix(covB, origCovB, progress);
    }
    // When fully faded in, show original shape
}

void modifyColor(vec3 center, inout vec4 color) {
    initShared(center);
    
    // Hide splats beyond endRadius
    if (g_dist > uEndRadius) {
        color.a = 0.0;
        return;
    }
    
    // Calculate fade progress (0.0 to 1.0)
    float progress = clamp(uTime / max(uDuration, 0.001), 0.0, 1.0);
    
    // Apply fade to opacity
    color.a *= progress;
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uDuration: f32;
uniform uEndRadius: f32;

// Shared globals
var<private> g_dist: f32;

fn initShared(center: vec3f) {
    g_dist = length(center);
}

fn modifyCenter(center: ptr<function, vec3f>) {
    initShared(*center);
    // No position modifications for fade effect
}

fn modifyCovariance(originalCenter: vec3f, modifiedCenter: vec3f, covA: ptr<function, vec3f>, covB: ptr<function, vec3f>) {
    initShared(originalCenter);
    
    // Hide splats beyond endRadius
    if (g_dist > uniform.uEndRadius) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // Calculate fade progress (0.0 to 1.0)
    let progress = clamp(uniform.uTime / max(uniform.uDuration, 0.001), 0.0, 1.0);
    
    // If not fully faded in, scale down slightly for smoother transition
    if (progress < 1.0) {
        let originalSize = gsplatExtractSize(*covA, *covB);
        let minSize = originalSize * 0.1;
        let currentSize = mix(minSize, originalSize, progress);
        
        let origCovA = *covA;
        let origCovB = *covB;
        gsplatMakeRound(covA, covB, currentSize);
        
        // Interpolate between round and original shape
        *covA = mix(*covA, origCovA, progress);
        *covB = mix(*covB, origCovB, progress);
    }
    // When fully faded in, show original shape
}

fn modifyColor(center: vec3f, color: ptr<function, vec4f>) {
    initShared(center);
    
    // Hide splats beyond endRadius
    if (g_dist > uniform.uEndRadius) {
        (*color).a = 0.0;
        return;
    }
    
    // Calculate fade progress (0.0 to 1.0)
    let progress = clamp(uniform.uTime / max(uniform.uDuration, 0.001), 0.0, 1.0);
    
    // Apply fade to opacity
    (*color).a *= progress;
}
`;

/**
 * Fade reveal effect for gaussian splats.
 * Smoothly fades in the scene by gradually increasing opacity from 0 to 1.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const fadeScript = entity.script.create(GsplatRevealFade);
 * fadeScript.duration = 2.0;
 */
class GsplatRevealFade extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealFade';

    /**
     * Duration of the fade animation in seconds
     * @attribute
     * @range [0.1, 10]
     */
    duration = 2.0;

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
        this.setUniform('uDuration', this.duration);
        this.setUniform('uEndRadius', this.endRadius);
    }

    /**
     * Checks if the fade effect has completed
     * @returns {boolean} True if effect is complete
     */
    isEffectComplete() {
        return this.effectTime >= this.duration;
    }
}

export { GsplatRevealFade };

