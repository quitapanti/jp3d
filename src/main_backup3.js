import "./style.scss";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

// Scene Setup
const canvas = document.querySelector("#experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.2;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.1,
  10000
);
camera.position.set(6.2, 4.2, 10.8);

// Lights
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
directionalLight.position.set(5, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.bias = -0.001;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xe0f7ff, 0x2a3a4a, 0.8);
scene.add(hemisphereLight);

// Post-Processing
const composer = new EffectComposer(renderer);
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  0.5, // strength
  0.75, // initial radius (midpoint between 0.5-1)
  0.8 // threshold
);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(1.244, 2.206, -0.905);
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.PAN,
  RIGHT: THREE.MOUSE.DOLLY,
};
controls.touches = {
  ONE: THREE.TOUCH.DOLLY_ROTATE,
  TWO: THREE.TOUCH.PAN,
};

// Materials
const materialMap = {
  beige: new THREE.MeshPhysicalMaterial({ color: 0xd3d3d3, roughness: 0.7 }),
  black: new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.8 }),
  green: new THREE.MeshPhysicalMaterial({ color: 0x235347, roughness: 0.7 }),
  grey: new THREE.MeshPhysicalMaterial({ color: 0x808080, roughness: 0.7 }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xffac00,
    roughness: 0.1,
    emissive: 0xffac00,
    emissiveIntensity: 1,
  }),
  paper: new THREE.MeshPhysicalMaterial({ color: 0xfafafa, roughness: 0.6 }),
};

// Bloom pulsation settings
const bloomPulse = {
  idleTime: 1.5, // Time spent at 0.5 (seconds)
  spikeTime: 0.4, // Time to reach peak (seconds)
  fallTime: 0.8, // Time to return (seconds)
  minRadius: 0,
  maxRadius: 0.5,
  timer: 0, // Cycle timer
};

// Model Loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
dracoLoader.setDecoderConfig({ type: "js" });

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let pointerObjects = [];
let hoverableObjects = [];
let rotatingObjects = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let currentHover = null;

// Define groups before using them
const groups = ["clock", "plotter", "2dprinter", "3dprinter", "monitor", "pen"];
const hoverGroups = {};
groups.forEach(group => {
  hoverGroups[group] = {
    objects: [],
    originalScale: new THREE.Vector3(1, 1, 1),
    isHovered: false
  };
});

gltfLoader.load(
  "/models/web3d_meme_raycast4-v1.glb",
  (gltf) => {
    pointerObjects = [];
    hoverableObjects = [];
    rotatingObjects = [];

    gltf.scene.traverse((child) => {
      if (!child.isMesh) return;

      // Store original scale
      child.userData.originalScale = child.scale.clone();

      // Apply materials
      if (materialMap[child.material.name]) {
        child.material = materialMap[child.material.name].clone();
      }
      
      // Increase emission for specific objects
      if (/face|line|monitor_raycast\.001/i.test(child.name)) {
        child.material.emissiveIntensity = 1;
      }

      // Shadow settings
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.shadowSide = THREE.FrontSide;

      // Add pointer objects to bloom targets
      if (/pointer/i.test(child.name)) {
        pointerObjects.push(child);
        child.frustumCulled = false;
        child.renderOrder = 1;
      }

      // Group assignments
      for (const group of groups) {
        if (new RegExp(group, "i").test(child.name)) {
          hoverGroups[group].objects.push(child);
          child.userData.group = group;
          if (hoverGroups[group].originalScale.length() === 0) {
            hoverGroups[group].originalScale.copy(child.scale);
          }
          break;
        }
      }

      // Hoverable objects
      if (/raycast/i.test(child.name.toLowerCase())) {
        hoverableObjects.push(child);
        child.userData.isHoverable = true;
      }

      // Identify rotating objects
      if (/face|line/i.test(child.name)) {
        rotatingObjects.push(child);
        child.userData.rotationSpeed =  0.04;
      }
    });

    bloomPass.selectedObjects = pointerObjects;
    scene.add(gltf.scene);
  },
  undefined,
  (error) => console.error("Error loading model:", error)
);

// Mouse move handler
window.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([
    ...hoverableObjects,
    ...Object.values(hoverGroups).flatMap((group) => group.objects),
  ]);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (currentHover === object) return;

    if (currentHover) {
      if (currentHover.userData.group) {
        hoverGroups[currentHover.userData.group].isHovered = false;
      } else {
        currentHover.userData.isHovered = false;
      }
    }

    currentHover = object;
    if (object.userData.group) {
      hoverGroups[object.userData.group].isHovered = true;
    } else {
      object.userData.isHovered = true;
    }
  } else if (currentHover) {
    if (currentHover.userData.group) {
      hoverGroups[currentHover.userData.group].isHovered = false;
    } else {
      currentHover.userData.isHovered = false;
    }
    currentHover = null;
  }
});

// Render Loop
const render = () => {
  const deltaTime = 0.0167; // ~60fps
  const cycleTime =
    bloomPulse.idleTime + bloomPulse.spikeTime + bloomPulse.fallTime;

  // Update timer (looping)
  bloomPulse.timer = (bloomPulse.timer + deltaTime) % cycleTime;

  // Calculate radius
  if (bloomPulse.timer < bloomPulse.idleTime) {
    // Idle phase
    bloomPass.radius = bloomPulse.minRadius;
  } else if (bloomPulse.timer < bloomPulse.idleTime + bloomPulse.spikeTime) {
    // Rising spike
    const t = (bloomPulse.timer - bloomPulse.idleTime) / bloomPulse.spikeTime;
    bloomPass.radius = THREE.MathUtils.lerp(
      bloomPulse.minRadius,
      bloomPulse.maxRadius,
      Math.pow(t, 3) // Fast cubic rise
    );
  } else {
    // Falling back
    const t =
      (bloomPulse.timer - bloomPulse.idleTime - bloomPulse.spikeTime) /
      bloomPulse.fallTime;
    bloomPass.radius = THREE.MathUtils.lerp(
      bloomPulse.maxRadius,
      bloomPulse.minRadius,
      t // Linear fall
    );
  }

  // Rotate objects on Y-axis
  rotatingObjects.forEach(obj => {
    obj.rotation.y += obj.userData.rotationSpeed;
  });

  // Light animation
  directionalLight.position.copy(camera.position);
  directionalLight.position.y += 10;
  directionalLight.position.z += 5;
  directionalLight.target.position.set(0, 0, 0);
  directionalLight.target.updateMatrixWorld();

  // Hover animations
  hoverableObjects.forEach((obj) => {
    if (!obj.userData.group && obj.userData.originalScale) {
      const targetScale = obj.userData.isHovered
        ? obj.userData.originalScale.clone().multiplyScalar(1.2)
        : obj.userData.originalScale.clone();
      obj.scale.lerp(targetScale, 0.1);
    }
  });

  Object.values(hoverGroups).forEach((group) => {
    if (group.originalScale) {
      const targetScale = group.isHovered
        ? group.originalScale.clone().multiplyScalar(1.1)
        : group.originalScale.clone();

      group.objects.forEach((obj) => {
        if (obj.userData.originalScale) {
          obj.scale.lerp(targetScale, 0.1);
        }
      });
    }
  });

  composer.render();
  requestAnimationFrame(render);
};

// Resize Handler
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  composer.setSize(sizes.width, sizes.height);
  bloomPass.setSize(sizes.width, sizes.height);
});

render();