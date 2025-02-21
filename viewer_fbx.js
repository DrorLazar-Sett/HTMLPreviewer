// viewer_fbx.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

class FBXViewer {
  constructor(container) {
    this.container = container;
    this.init();
  }
  async init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 200/180, 0.1, 1000);
    this.camera.position.set(0, 1.6, 3);
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(200, 180);
    this.renderer.setClearColor(0x3a3a3a);
    this.container.appendChild(this.renderer.domElement);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0.5, 1, 0.5);
    this.scene.add(directionalLight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.animate();
  }
  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.mixer) { this.mixer.update(this.clock.getDelta()); }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  loadModel(url) {
    new FBXLoader().load(url, (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim;
      object.scale.set(scale, scale, scale);
      object.position.sub(center.multiplyScalar(scale));
      this.scene.add(object);
      if (object.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(object);
        const action = this.mixer.clipAction(object.animations[0]);
        action.play();
      }
      this.controls.reset();
      this.camera.lookAt(0, 0, 0);
    });
  }
}

export default FBXViewer;
