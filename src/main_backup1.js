import './style.scss';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Scene Setup
const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scene with Fog
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x111122, 0.02); // Cool blue-black fog

// Camera
const camera = new THREE.PerspectiveCamera(
  35, 
  sizes.width / sizes.height, 
  0.1, 
  1000
);
camera.position.set(6.2, 4.2, 10.8);

// Bloom Effect
const bloomParams = {
  strength: 1.2,
  radius: 1.5,
  threshold: 1.2,
};

const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  bloomParams.strength,
  bloomParams.radius,
  bloomParams.threshold
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY
};
controls.target.set(1.244, 2.206, -0.905);

// Lights (Cool Tone)
const hemiLight = new THREE.HemisphereLight(0xe0f7ff, 0x2a3a4a, 1);
hemiLight.position.set(0, 100, 3);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xccf0ff, 2);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

// Materials with Emissive for Bloom
const materialMap = {
  beige: new THREE.MeshPhysicalMaterial({
    color: 0xD3D3D3,
    roughness: 0.7,
  }),
  black: new THREE.MeshPhysicalMaterial({
    color: 0x3B3B3B,
    roughness: 0.8,
  }),
  green: new THREE.MeshPhysicalMaterial({
    color: 0x023020,
    roughness: 0.7,
  }),
  grey: new THREE.MeshPhysicalMaterial({
    color: 0x808080,
    roughness: 0.7,
  }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xB22222,
    roughness: 0.1,
    emissive: 0xff3333,       // Glowing red
    emissiveIntensity: 1.5    // Strong emission for bloom
  }),
  white: new THREE.MeshPhysicalMaterial({
    color: 0xFAFAFA,
    roughness: 0.6,
  })
};

// Model Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

gltfLoader.load(
  "/models/web3d_meme_raycast-v1.glb",
  (gltf) => {
    const model = gltf.scene;
    
    model.traverse((child) => {
      if (!child.isMesh) return;
      
      // Material replacement with emission preservation
      if (materialMap[child.material.name]) {
        const newMat = materialMap[child.material.name];
        child.material = newMat.clone();
        
        // Special handling for emissive materials
        if (newMat.emissive) {
          child.material.emissive = newMat.emissive.clone();
          child.material.emissiveIntensity = newMat.emissiveIntensity;
        }
      }
      
      // Shadow configuration
      child.receiveShadow = true;
      child.castShadow = true;
      child.material.shadowSide = THREE.DoubleSide;
    });
    
    scene.add(model);
  },
  undefined,
  (error) => console.error("Error loading model:", error)
);

// Event Listeners
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(sizes.width, sizes.height);
  composer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation Loop
const render = () => {
  controls.update();
  composer.render();
  requestAnimationFrame(render);
};

render();