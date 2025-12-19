import * as THREE from "three";
import { SparkControls, SplatMesh, dyno } from "@sparkjsdev/spark";
import GUI from "lil-gui";
import "./style.css";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// Initialize camera with elevated perspective
camera.position.set(1.4, -0.08, -5.48);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation timing variables
const animateT = dyno.dynoFloat(0);
let baseTime = 0;
let splatLoaded = false;

// Available visual effects configuration
const effectParams = {
  effect: "Magic"
};

const cameraControls = {
  x: camera.position.x,
  y: camera.position.y,
  z: camera.position.z,
  orbitEnabled: false
};

let splatMesh = null;

/**
 * Loads and configures splat mesh based on selected effect
 * @param {string} effect - The effect type (Magic, Spread, Unroll, Twister, or Rain)
 */
async function loadSplatForEffect(effect) {
  // Clean up existing splat mesh
  if (splatMesh) {
    scene.remove(splatMesh);
    splatMesh = null;
  }

  // Configure splat file and positioning per effect
  const fileName = "Ceramic_500k.compressed.ply";

  let splatFileName = fileName;
  let position = [0, 0, 0];

  // Load and initialize new splat mesh
  const splatURL = splatFileName; //await getAssetFileURL(splatFileName);
  splatMesh = new SplatMesh({ url: splatURL });
  splatMesh.quaternion.set(1, 0, 0, 0);
  splatMesh.position.set(position[0], position[1], position[2]);

  scene.add(splatMesh);

  // Wait for asset loading and reset animation timing
  splatLoaded = false;
  await splatMesh.loaded;
  splatLoaded = true;
  baseTime = 0;

  // Apply visual effects to the loaded splat
  setupSplatModifier();
}

// Initialize user interface
const gui = new GUI();
const effectFolder = gui.addFolder('Effects');

await loadSplatForEffect(effectParams.effect);

// Animation controls
const guiControls = {
  resetTime: () => {
    baseTime = 0;
    animateT.value = 0;
  }
};
effectFolder.add(guiControls, 'resetTime').name('Reset Time');
effectFolder.open();

const cameraFolder = gui.addFolder('Camera');
// Add camera position controls
cameraFolder.add(cameraControls, 'x', -10, 10).name('Position X').onChange(value => camera.position.x = value);
cameraFolder.add(cameraControls, 'y', -10, 10).name('Position Y').onChange(value => camera.position.y = value);
cameraFolder.add(cameraControls, 'z', -10, 10).name('Position Z').onChange(value => camera.position.z = value);
cameraFolder.open();

/**
 * Configures visual effects shader for the current splat mesh
 */
function setupSplatModifier() {
  splatMesh.objectModifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => {
      const d = new dyno.Dyno({
        inTypes: { gsplat: dyno.Gsplat, t: "float", effectType: "int" },
        outTypes: { gsplat: dyno.Gsplat },
        // GLSL utility functions for effects
        globals: () => [
          dyno.unindent(`
              // Pseudo-random hash function
              vec3 hash(vec3 p) {
                p = fract(p * 0.3183099 + 0.1);
                p *= 17.0;
                return fract(vec3(p.x * p.y * p.z, p.x + p.y * p.z, p.x * p.y + p.z));
              }

              // 3D Perlin-style noise function
              vec3 noise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                
                vec3 n000 = hash(i + vec3(0,0,0));
                vec3 n100 = hash(i + vec3(1,0,0));
                vec3 n010 = hash(i + vec3(0,1,0));
                vec3 n110 = hash(i + vec3(1,1,0));
                vec3 n001 = hash(i + vec3(0,0,1));
                vec3 n101 = hash(i + vec3(1,0,1));
                vec3 n011 = hash(i + vec3(0,1,1));
                vec3 n111 = hash(i + vec3(1,1,1));
                
                vec3 x0 = mix(n000, n100, f.x);
                vec3 x1 = mix(n010, n110, f.x);
                vec3 x2 = mix(n001, n101, f.x);
                vec3 x3 = mix(n011, n111, f.x);
                
                vec3 y0 = mix(x0, x1, f.y);
                vec3 y1 = mix(x2, x3, f.y);
                
                return mix(y0, y1, f.z);
              }

              // 2D rotation matrix
              mat2 rot(float a) {
                float s=sin(a),c=cos(a);
                return mat2(c,-s,s,c);
              }
            `)
        ],
        // Main effect shader logic
        statements: ({ inputs, outputs }) => dyno.unindentLines(`
            ${outputs.gsplat} = ${inputs.gsplat};
            float t = ${inputs.t};
            float s = smoothstep(0.,10.,t-4.5)*10.;
            vec3 scales = ${inputs.gsplat}.scales;
            vec3 localPos = ${inputs.gsplat}.center;
            float l = length(localPos.xz);
            
if (${inputs.effectType} == 1) {
              // Magic Effect: Keep all particles as points
              float border = abs(s-l-.5);
              
              // Always keep particles dispersed (inverted logic)
              float disperseAmount = 1.0 - smoothstep(s-.5,s,l+.5);
              disperseAmount = max(disperseAmount, 0.8); // Always keep mostly dispersed
              
              // Add continuous noise movement
              vec3 noiseOffset = .1*noise(localPos.xyz*2.+t*.5) * disperseAmount;
              
              // Force scales to stay small (as points)
              vec3 finalScales = vec3(0.002);
              
              ${outputs.gsplat}.center = localPos + noiseOffset;
              ${outputs.gsplat}.scales = finalScales;
              
              // Gradual reveal based on angle
              float at = atan(localPos.x,localPos.z)/3.1416;
              ${outputs.gsplat}.rgba *= step(at,t-3.1416);
              
              // Add glow to dispersed particles
              ${outputs.gsplat}.rgba += exp(-20.*border) * disperseAmount;
            }
          `),
      });

      // Map effect names to shader integer constants
      const effectType = 1;

      gsplat = d.apply({
        gsplat,
        t: animateT,
        effectType: dyno.dynoInt(effectType)
      }).gsplat;

      return { gsplat };
    }
  );

  // Apply shader modifications to splat mesh
  splatMesh.updateGenerator();
}

// Initialize with default effect
await loadSplatForEffect(effectParams.effect);

// Initialize camera controls and start render loop
const controls = new SparkControls({ canvas: renderer.domElement });

renderer.setAnimationLoop(function animate(time) {
  // Update animation timing
  if (splatLoaded) {
    baseTime += 1 / 60;
    animateT.value = baseTime;
  } else {
    animateT.value = 0;
  }

  // If orbit is disabled, ensure camera position matches GUI controls
  camera.position.x = cameraControls.x;
  camera.position.y = cameraControls.y;
  camera.position.z = cameraControls.z;

  camera.lookAt(0, 0, 0);

  // Update splat rendering if available
  if (splatMesh) {
    splatMesh.updateVersion();
  }

  controls.update(camera);
  renderer.render(scene, camera);
});