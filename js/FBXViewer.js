import { getThreeInstance } from './three-instance.js';

// FBXViewer class - Handles the rendering of FBX 3D models using Three.js
export class FBXViewer {
  #scene;
  #camera;
  #renderer;
  #controls;
  #mixer;
  #clock;
  constructor(container) {
    this.container = container;
    this.init();
  }

  async init() {
    try {
      // Get Three.js instance
      const { THREE, OrbitControls } = await getThreeInstance();
      
      // Initialize scene
      this.#scene = new THREE.Scene();
      this.#camera = new THREE.PerspectiveCamera(45, 200/180, 0.1, 1000);
      this.#camera.position.set(0, 1.6, 3);
      
      // Initialize renderer
      this.#renderer = new THREE.WebGLRenderer({antialias: true});
      this.#renderer.setSize(200, 180);
      this.#renderer.setClearColor(0x3a3a3a);
      this.container.appendChild(this.#renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      this.#scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0.5, 1, 0.5);
      this.#scene.add(directionalLight);
      
      // Initialize controls
      this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
      this.#controls.enableDamping = true;
      this.#controls.dampingFactor = 0.05;
      
      // Initialize animation
      this.#mixer = null;
      this.#clock = new THREE.Clock();
      
      this.animate();
    } catch (error) {
      console.error('Error initializing FBXViewer:', error);
      throw error;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.#mixer) {
      this.#mixer.update(this.#clock.getDelta());
    }
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  }

  async loadModel(url) {
    try {
      const { THREE, FBXLoader } = await getThreeInstance();
      const loader = new FBXLoader();
      
      return new Promise((resolve, reject) => {
        loader.load(url, (object) => {
          try {
            // Calculate bounding box to center and scale model
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1.5 / maxDim;
            
            // Apply transformations
            object.scale.set(scale, scale, scale);
            object.position.sub(center.multiplyScalar(scale));
            
            // Add to scene
            this.#scene.add(object);
            
            // Handle animations if present
            if (object.animations.length > 0) {
              this.#mixer = new THREE.AnimationMixer(object);
              const action = this.#mixer.clipAction(object.animations[0]);
              action.play();
            }
            
            // Reset camera view
            this.#controls.reset();
            this.#camera.lookAt(0, 0, 0);
            
            resolve(object);
          } catch (error) {
            reject(error);
          }
        }, undefined, reject);
      });
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  }

  // Clean up resources
  dispose() {
    this.#renderer.dispose();
    this.#controls.dispose();
    
    // Dispose of all geometries and materials in the scene
    this.#scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    // Remove the canvas element
    if (this.#renderer.domElement) {
      this.#renderer.domElement.remove();
    }
  }

  // Resize viewer
  resize(width, height) {
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(width, height);
  }
}
