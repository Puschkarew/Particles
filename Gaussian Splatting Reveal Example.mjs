// @config DESCRIPTION This example demonstrates reveal effects for gaussian splats.
import { data } from 'examples/observer';
import { deviceType, rootPath, fileImport } from 'examples/utils';
import * as pc from 'playcanvas';

const { GsplatRevealRadial } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-radial.mjs`);
const { GsplatRevealRain } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-rain.mjs`);
const { GsplatRevealGridEruption } = await fileImport(`${rootPath}/static/scripts/esm/gsplat/reveal-grid-eruption.mjs`);

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('application-canvas'));
window.focus();

const gfxOptions = {
    deviceTypes: [deviceType],

    // disable antialiasing as gaussian splats do not benefit from it and it's expensive
    antialias: false
};

const device = await pc.createGraphicsDevice(canvas, gfxOptions);
device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);

const createOptions = new pc.AppOptions();
createOptions.graphicsDevice = device;
createOptions.mouse = new pc.Mouse(document.body);
createOptions.touch = new pc.TouchDevice(document.body);

createOptions.componentSystems = [
    pc.RenderComponentSystem,
    pc.CameraComponentSystem,
    pc.LightComponentSystem,
    pc.ScriptComponentSystem,
    pc.GSplatComponentSystem
];
createOptions.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler, pc.ScriptHandler, pc.GSplatHandler];

const app = new pc.AppBase(canvas);
app.init(createOptions);

// Set the canvas to fill the window and automatically change resolution to be the same as the canvas size
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

// Ensure canvas is resized when window changes size
const resize = () => app.resizeCanvas();
window.addEventListener('resize', resize);
app.on('destroy', () => {
    window.removeEventListener('resize', resize);
});

const assets = {
    hotel: new pc.Asset('gsplat', 'gsplat', { url: `${rootPath}/static/assets/splats/hotel-culpture.compressed.ply` }),
    orbit: new pc.Asset('script', 'script', { url: `${rootPath}/static/scripts/camera/orbit-camera.js` })
};

const assetListLoader = new pc.AssetListLoader(Object.values(assets), app.assets);
assetListLoader.load(() => {
    app.start();

    // Array of available effects (extensible for future effects)
    const effects = ['radial', 'rain', 'grid'];

    // Default to radial effect
    data.set('effect', 'radial');

    // Parameters for scene transition
    const reverseSpeed = data.get('reverseSpeed') ?? 5.0;
    const transitionOverlap = data.get('transitionOverlap') ?? 0.5;
    data.set('reverseSpeed', reverseSpeed);
    data.set('transitionOverlap', transitionOverlap);

    // Create two scenes for smooth transition
    // Scene 1: First scene that reveals initially
    const scene1 = new pc.Entity('scene1');
    scene1.addComponent('gsplat', {
        asset: assets.hotel,
        unified: true
    });
    scene1.setLocalEulerAngles(180, 0, 0);
    scene1.addComponent('script');
    app.root.addChild(scene1);

    // Scene 2: Second scene that replaces scene1
    const scene2 = new pc.Entity('scene2');
    scene2.addComponent('gsplat', {
        asset: assets.hotel,
        unified: true
    });
    scene2.setLocalEulerAngles(180, 0, 0);
    scene2.addComponent('script');
    // Scene2 renders on top of scene1
    scene2.renderOrder = 1;
    // Initially hidden - will be enabled when transition starts
    scene2.enabled = false;
    app.root.addChild(scene2);

    // Keep reference to hotel for backward compatibility
    const hotel = scene1;

    // Helper function to create radial script with configured attributes
    const createRadialScript = (entity, reverseMode = false, reverseSpeedValue = 5.0) => {
        const script = entity.script?.create(GsplatRevealRadial);
        if (script) {
            script.center.set(0, 0, 0);
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
        }
        return script;
    };

    // Helper function to create rain script with configured attributes
    const createRainScript = () => {
        const script = hotel.script?.create(GsplatRevealRain);
        if (script) {
            script.center.set(0, 0, 0);
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
        }
        return script;
    };

    // Helper function to create grid eruption script with configured attributes
    const createGridScript = () => {
        const script = hotel.script?.create(GsplatRevealGridEruption);
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
        }
        return script;
    };

    /**
     * Function to create and start an effect based on its name
     * @param {string} effectName - Name of the effect to create
     * @param {pc.Entity} entity - Entity to apply effect to (default: scene1)
     */
    const createEffect = (effectName, entity = scene1) => {
        // Destroy any existing reveal scripts
        entity.script?.destroy(GsplatRevealRadial.scriptName);
        entity.script?.destroy(GsplatRevealRain.scriptName);
        entity.script?.destroy(GsplatRevealGridEruption.scriptName);

        // Create the selected effect (fresh instance, starts from beginning)
        if (effectName === 'radial') {
            createRadialScript(entity, false);
        } else if (effectName === 'rain') {
            createRainScript();
        } else if (effectName === 'grid') {
            createGridScript();
        }
    };

    // Variables for scene transition
    let scene1Script = null;
    let scene2Script = null;
    let transitionStarted = false;

    // Create only the radial script initially on scene1
    scene1Script = createEffect('radial', scene1);

    // Switch between effects when dropdown changes
    data.on('effect:set', () => {
        const effect = data.get('effect');
        createEffect(effect);
    });

    // Restart button - recreate current effect from beginning
    data.on('restart', () => {
        const currentEffect = data.get('effect');
        createEffect(currentEffect);
    });

    // Prev button - cycle to previous effect in the list
    data.on('prev', () => {
        const currentEffect = data.get('effect');
        const currentIndex = effects.indexOf(currentEffect);
        const prevIndex = (currentIndex - 1 + effects.length) % effects.length;
        const prevEffect = effects[prevIndex];
        data.set('effect', prevEffect);
    });

    // Next button - cycle to next effect in the list
    data.on('next', () => {
        const currentEffect = data.get('effect');
        const currentIndex = effects.indexOf(currentEffect);
        const nextIndex = (currentIndex + 1) % effects.length;
        const nextEffect = effects[nextIndex];
        data.set('effect', nextEffect);
    });

    // Handle camera pause toggle
    data.on('cameraPause', (paused) => {
        cameraPaused = paused;
    });

    // Create an Entity with a camera component
    const camera = new pc.Entity();
    camera.addComponent('camera', {
        clearColor: pc.Color.BLACK,
        fov: 80,
        toneMapping: pc.TONEMAP_ACES
    });
    camera.setLocalPosition(3, 1, 0.5);

    // add orbit camera script with a mouse and a touch support
    camera.addComponent('script');
    camera.script?.create('orbitCamera', {
        attributes: {
            inertiaFactor: 0.2,
            focusEntity: hotel,
            distanceMax: 3.2,
            frameOnStart: false
        }
    });
    camera.script?.create('orbitCameraInputMouse');
    camera.script?.create('orbitCameraInputTouch');
    app.root.addChild(camera);

    // Auto-rotate camera when idle
    let autoRotateEnabled = true;
    let cameraPaused = false;
    let lastInteractionTime = 0;
    const autoRotateDelay = 2; // seconds of inactivity before auto-rotate resumes
    const autoRotateSpeed = 10; // degrees per second

    // Detect user interaction (click/touch only, not mouse movement)
    const onUserInteraction = () => {
        autoRotateEnabled = false;
        lastInteractionTime = Date.now();
    };

    // Listen for click and touch events only
    if (app.mouse) {
        app.mouse.on('mousedown', onUserInteraction);
        app.mouse.on('mousewheel', onUserInteraction);
    }
    if (app.touch) {
        app.touch.on('touchstart', onUserInteraction);
    }

    /**
     * Start transition from scene1 to scene2 with reverse reveal animation
     */
    const startSceneTransition = () => {
        if (transitionStarted) return;
        transitionStarted = true;

        // Get current parameters
        const currentReverseSpeed = data.get('reverseSpeed') ?? 5.0;
        const currentOverlap = data.get('transitionOverlap') ?? 0.5;

        // Calculate reverse animation duration
        // Time to hide scene1: (endRadius - revealStartRadius) / reverseSpeed
        const endRadius = scene1Script?.endRadius ?? 25;
        const revealStartRadius = scene1Script?.revealStartRadius ?? 0.3;
        const reverseDistance = endRadius - revealStartRadius;
        const reverseDuration = reverseDistance / currentReverseSpeed;

        // Calculate when to start scene2 reveal based on overlap
        const scene2StartTime = reverseDuration * currentOverlap;

        // Start reverse reveal on scene1
        scene1.script?.destroy(GsplatRevealRadial.scriptName);
        scene1Script = createRadialScript(scene1, true, currentReverseSpeed);
        if (scene1Script) {
            scene1Script.delay = 0; // Start immediately
        }

        // Enable scene2 and start forward reveal after calculated delay
        scene2.enabled = true;
        scene2Script = createRadialScript(scene2, false, 1.0);
        if (scene2Script) {
            scene2Script.delay = scene2StartTime; // Start after overlap time
        }

        // Disable scene1 after reverse animation completes
        setTimeout(() => {
            scene1.enabled = false;
        }, reverseDuration * 1000);
    };

    // Handle scene transition
    data.on('nextScene', () => {
        if (!transitionStarted) {
            startSceneTransition();
        }
    });

    // Auto-rotate update
    app.on('update', (dt) => {
        // Re-enable auto-rotate after delay (only if not paused)
        if (!cameraPaused && !autoRotateEnabled && (Date.now() - lastInteractionTime) / 1000 > autoRotateDelay) {
            autoRotateEnabled = true;
        }

        // Apply auto-rotation (only if not paused)
        if (!cameraPaused && autoRotateEnabled) {
            const orbitCamera = camera.script?.get('orbitCamera');
            if (orbitCamera) {
                orbitCamera.yaw += autoRotateSpeed * dt;
            }
        }
    });
});

export { app };
