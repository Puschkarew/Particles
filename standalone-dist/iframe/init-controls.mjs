// Auto-initialize controls in iframe mode
import { data } from 'examples/observer';

window.addEventListener('exampleLoad', async (event) => {
    const { observer } = event.detail || { observer: data };
    if (observer) {
        try {
            const { controls } = await import('./gaussian-splatting_reveal.controls.mjs');
            if (controls) {
                controls({ observer });
            }
        } catch (e) {
            console.error('Failed to load controls:', e);
        }
    }
});

// Also try to initialize after a delay as fallback
setTimeout(async () => {
    if (!document.getElementById('controlPanel-controls')) {
        try {
            const { controls } = await import('./gaussian-splatting_reveal.controls.mjs');
            if (controls) {
                controls({ observer: data });
            }
        } catch (e) {
            console.error('Failed to load controls (fallback):', e);
        }
    }
}, 3000);
