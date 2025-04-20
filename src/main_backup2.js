import './style.scss';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Scene Setup
const canvas = document.querySelector("#experience-canvas");
canvas.style.cursor = 'default';
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
renderer.toneMappingExposure = 1.5;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scene (no fog)
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 1000);
camera.position.set(6.2, 4.2, 10.8);

// Post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Bloom Pass
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  1, // strength
  0.4, // radius
  0.9 // threshold
);
composer.addPass(bloomPass);

// Outline Pass
const outlinePass = new OutlinePass(
  new THREE.Vector2(sizes.width, sizes.height),
  scene,
  camera
);
outlinePass.edgeStrength = 3.0;
outlinePass.edgeGlow = 0.5;
outlinePass.edgeThickness = 1.2;
outlinePass.visibleEdgeColor.set(0xFFA500); // Orange
outlinePass.hiddenEdgeColor.set(0x000000);
composer.addPass(outlinePass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY
};
controls.target.set(1.244, 2.206, -0.905);

// Lights (same as before)
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1.0);
hemiLight.position.set(0, 100, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 15, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
fillLight.position.set(-5, 5, 5);
scene.add(fillLight);

// Materials (same as before)
const materialMap = {
  beige: new THREE.MeshPhysicalMaterial({
    color: 0xD3D3D3,
    roughness: 0.7,
    metalness: 0
  }),
  black: new THREE.MeshPhysicalMaterial({
    color: 0x222222,
    roughness: 0.8,
    metalness: 0
  }),
  green: new THREE.MeshPhysicalMaterial({
    color: 0x338833,
    roughness: 0.4,
    metalness: 0
  }),
  grey: new THREE.MeshPhysicalMaterial({
    color: 0xBBBBBB,
    roughness: 0.5,
    metalness: 0
  }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xE74C3C,
    roughness: 0.2,
    metalness: 0
  }),
  white: new THREE.MeshPhysicalMaterial({
    color: 0xFFFFFF,
    roughness: 0.4,
    metalness: 0
  })
};

// Model Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

// Hover System
const originalScales = new WeakMap();
const hoveredObjects = new Set();
const SCALE_FACTOR = 1.2;
const SCALE_SPEED = 0.2;

// Object Collections
const pointerObjects = []; // Objects that get orange outline
const raycastObjects = []; // Objects that scale on hover
const allInteractiveObjects = []; // All objects that should respond to hover

gltfLoader.load("/models/web3d_meme_raycast2-v1.glb", (gltf) => {
  const model = gltf.scene;
  
  model.traverse((child) => {
    if (child.isMesh) {
      // Store original scale
      originalScales.set(child, child.scale.clone());
      
      // Apply materials
      if (materialMap[child.material.name]) {
        child.material = materialMap[child.material.name].clone();
      }
      
      // Configure shadows
      child.receiveShadow = true;
      child.castShadow = true;
      
      // Categorize objects
      // const isPointer = child.name.includes('pointer');
      // const isRaycast = child.name.includes('raycast');
      
      // if (isPointer) {
      //   pointerObjects.push(child);
      // }
      // if (isRaycast) {
      //   raycastObjects.push(child);
      // }
      // if (isPointer || isRaycast) {
      //   allInteractiveObjects.push(child);
      // }
    }
  });
  
  // outlinePass.selectedObjects = pointerObjects;
  scene.add(model);
});

// Mouse Interaction
// const raycaster = new THREE.Raycaster();
// const mouse = new THREE.Vector2();

// canvas.addEventListener('mousemove', (event) => {
//   mouse.x = (event.clientX / sizes.width) * 2 - 1;
//   mouse.y = -(event.clientY / sizes.height) * 2 + 1;
  
//   raycaster.setFromCamera(mouse, camera);
//   const intersects = raycaster.intersectObjects(allInteractiveObjects);
  
//   // Reset previous hover state
//   hoveredObjects.clear();
//   canvas.style.cursor = 'default';
  
//   // Set new hover state
//   if (intersects.length > 0) {
//     const hoveredObj = intersects[0].object;
//     hoveredObjects.add(hoveredObj);
    
//     // Special handling for pointer objects
//     if (pointerObjects.includes(hoveredObj)) {
//       canvas.style.cursor = 'pointer';
//     }
//   }
// });

// Animation Loop
// const animate = () => {
//   // Apply smooth scaling to raycast objects
//   raycastObjects.forEach(obj => {
//     const shouldScale = hoveredObjects.has(obj);
//     const targetScale = shouldScale ? 
//       originalScales.get(obj).clone().multiplyScalar(SCALE_FACTOR) : 
//       originalScales.get(obj);
    
//     obj.scale.lerp(targetScale, SCALE_SPEED);
//   });
  
//   controls.update();
//   composer.render();
//   requestAnimationFrame(animate);
// };
// animate();

// Resize handler
// window.addEventListener('resize', () => {
//   sizes.width = window.innerWidth;
//   sizes.height = window.innerHeight;
//   camera.aspect = sizes.width / sizes.height;
//   camera.updateProjectionMatrix();
//   renderer.setSize(sizes.width, sizes.height);
//   composer.setSize(sizes.width, sizes.height);
// });