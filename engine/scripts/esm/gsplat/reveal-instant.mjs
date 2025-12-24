import { Vec3 } from 'playcanvas';
import { GsplatShaderEffect } from './gsplat-shader-effect.mjs';

const shaderGLSL = /* glsl */`
uniform float uTime;
uniform float uEndRadius;

// Shared globals
float g_dist;

void initShared(vec3 center) {
    g_dist = length(center);
}

void modifyCenter(inout vec3 center) {
    initShared(center);
    // No modifications - instant reveal shows everything as-is
}

void modifyCovariance(vec3 originalCenter, vec3 modifiedCenter, inout vec3 covA, inout vec3 covB) {
    initShared(originalCenter);
    
    // Show all splats within endRadius immediately
    if (g_dist > uEndRadius) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // No modifications - show original shape and size
}

void modifyColor(vec3 center, inout vec4 color) {
    initShared(center);
    
    // Show all splats within endRadius immediately
    if (g_dist > uEndRadius) {
        color.a = 0.0;
        return;
    }
    
    // No modifications - show full opacity
}
`;

const shaderWGSL = /* wgsl */`
uniform uTime: f32;
uniform uEndRadius: f32;

// Shared globals
var<private> g_dist: f32;

fn initShared(center: vec3f) {
    g_dist = length(center);
}

fn modifyCenter(center: ptr<function, vec3f>) {
    initShared(*center);
    // No modifications - instant reveal shows everything as-is
}

fn modifyCovariance(originalCenter: vec3f, modifiedCenter: vec3f, covA: ptr<function, vec3f>, covB: ptr<function, vec3f>) {
    initShared(originalCenter);
    
    // Show all splats within endRadius immediately
    if (g_dist > uniform.uEndRadius) {
        gsplatMakeRound(covA, covB, 0.0);
        return;
    }
    
    // No modifications - show original shape and size
}

fn modifyColor(center: vec3f, color: ptr<function, vec4f>) {
    initShared(center);
    
    // Show all splats within endRadius immediately
    if (g_dist > uniform.uEndRadius) {
        (*color).a = 0.0;
        return;
    }
    
    // No modifications - show full opacity
}
`;

/**
 * Instant reveal effect for gaussian splats.
 * Shows the entire scene immediately without any animation.
 *
 * @example
 * // Add the script to a gsplat entity
 * entity.addComponent('script');
 * const instantScript = entity.script.create(GsplatRevealInstant);
 */
class GsplatRevealInstant extends GsplatShaderEffect {
    static scriptName = 'gsplatRevealInstant';

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
        this.setUniform('uEndRadius', this.endRadius);
    }

    /**
     * Effect is complete immediately (instant reveal)
     * @returns {boolean} Always returns true
     */
    isEffectComplete() {
        return true;
    }
}

export { GsplatRevealInstant };

