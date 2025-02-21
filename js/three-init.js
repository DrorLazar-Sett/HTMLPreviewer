// Three.js singleton module
let threeInstance = null;
let orbitControlsClass = null;
let fbxLoaderClass = null;

// Initialize Three.js modules
async function initThree() {
    if (!threeInstance) {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
        
        threeInstance = THREE;
        orbitControlsClass = OrbitControls;
        fbxLoaderClass = FBXLoader;
    }
    return {
        THREE: threeInstance,
        OrbitControls: orbitControlsClass,
        FBXLoader: fbxLoaderClass
    };
}

// Export initialization function and getters
export { initThree };
export function getThree() {
    if (!threeInstance) throw new Error('Three.js not initialized');
    return threeInstance;
}
export function getOrbitControls() {
    if (!orbitControlsClass) throw new Error('OrbitControls not initialized');
    return orbitControlsClass;
}
export function getFBXLoader() {
    if (!fbxLoaderClass) throw new Error('FBXLoader not initialized');
    return fbxLoaderClass;
}
