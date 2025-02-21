// Singleton instance for Three.js modules
let instance = null;

export async function getThreeInstance() {
    if (!instance) {
        const THREE = await import('three');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
        
        instance = {
            THREE,
            OrbitControls,
            FBXLoader
        };
    }
    return instance;
}
