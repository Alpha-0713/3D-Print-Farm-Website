import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";

const THREE_VERSION = "0.186.0";
const THREE_CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const THREE_MODULE_URL = `${THREE_CDN}/build/three.module.js`;
let activePreview = null;
let threeMfLoaderPromise = null;

async function loadThreeMFLoader() {
  if (!threeMfLoaderPromise) {
    threeMfLoaderPromise = (async () => {
      const loaderUrl = `${THREE_CDN}/examples/jsm/loaders/3MFLoader.js`;
      const response = await fetch(loaderUrl, { mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error("The 3MF parser could not be downloaded.");
      let source = await response.text();
      const replacements = [
        ["from 'three';", `from '${THREE_MODULE_URL}';`],
        ["from '../libs/fflate.module.js';", "from 'https://cdn.jsdelivr.net/npm/fflate@0.8.3/esm/browser.js';"],
        ["from '../utils/BufferGeometryUtils.js';", `from '${THREE_CDN}/examples/jsm/utils/BufferGeometryUtils.js';`],
      ];
      for (const [search, replacement] of replacements) {
        if (!source.includes(search)) throw new Error("The 3MF parser version was not recognized.");
        source = source.replace(search, replacement);
      }
      const moduleUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      try {
        return (await import(moduleUrl)).ThreeMFLoader;
      } finally {
        URL.revokeObjectURL(moduleUrl);
      }
    })().catch((error) => {
      threeMfLoaderPromise = null;
      throw error;
    });
  }
  return threeMfLoaderPromise;
}

function disposeObject(root) {
  if (!root) return;
  root.traverse((child) => {
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value?.isTexture) value.dispose();
      }
      material.dispose?.();
    }
  });
}

function getGeometry(extension, buffer) {
  if (extension === "stl") {
    const geometry = new STLLoader().parse(buffer);
    const material = new THREE.MeshStandardMaterial({
      color: geometry.hasColors ? 0xffffff : 0x9ba994,
      vertexColors: Boolean(geometry.hasColors),
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    return new THREE.Mesh(geometry, material);
  }
  if (extension === "obj") {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    return new OBJLoader().parse(source);
  }
  throw new Error("Unsupported model format.");
}

function validateAndFrame(object, extension) {
  if (extension === "3mf") object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);

  let meshCount = 0;
  let vertexCount = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    meshCount += 1;
    const geometry = child.geometry;
    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) return;
    vertexCount += position.count;
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    if (!child.material) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0x9ba994,
        roughness: 0.72,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
    }
  });
  if (!meshCount || !vertexCount) throw new Error("The file contains no renderable triangle geometry.");

  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  if (
    bounds.isEmpty()
    || !Number.isFinite(maxDimension)
    || maxDimension <= 1e-8
    || ![bounds.min.x, bounds.min.y, bounds.min.z, bounds.max.x, bounds.max.y, bounds.max.z].every(Number.isFinite)
  ) {
    throw new Error("The file contains empty or invalid model dimensions.");
  }

  object.position.sub(bounds.getCenter(new THREE.Vector3()));
  object.updateMatrixWorld(true);
  const centeredBounds = new THREE.Box3().setFromObject(object);
  const sphere = centeredBounds.getBoundingSphere(new THREE.Sphere());
  return { sphere, maxDimension, vertexCount };
}

class ModelPreview {
  constructor(container, file, onState) {
    this.container = container;
    this.file = file;
    this.onState = onState;
    this.disposed = false;
    this.frameId = 0;
    this.observer = null;
    this.object = null;
    this.renderer = null;
    this.controls = null;
    this.scene = null;
    this.camera = null;
  }

  updateState(status, message = "") {
    if (this.disposed) return;
    const statusNode = this.container.querySelector(".model-preview-message");
    if (statusNode) statusNode.textContent = message || "";
    this.onState?.(status, message);
  }

  async load() {
    try {
      this.updateState("loading", "Reading actual model geometry…");
      if (!this.file?.size || this.file.size > 25 * 1024 * 1024) {
        throw new Error("The model file is empty or exceeds the 25 MB limit.");
      }
      const name = String(this.file.name || "").trim().split(/[?#]/, 1)[0];
      const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
      const buffer = await this.file.arrayBuffer();
      let object;
      if (extension === "3mf") {
        const ThreeMFLoader = await loadThreeMFLoader();
        object = new ThreeMFLoader().parse(buffer);
      } else if (extension === "stl" || extension === "obj") {
        object = getGeometry(extension, buffer);
      } else {
        throw new Error("Choose an STL, 3MF, or OBJ model.");
      }
      if (this.disposed) {
        disposeObject(object);
        return;
      }
      this.object = object;
      const frame = validateAndFrame(object, extension);
      this.createViewer(object, frame.sphere);
      this.updateState("ready", "Drag to orbit · scroll to zoom · right-drag to pan");
    } catch (error) {
      if (this.disposed) return;
      this.cleanupResources();
      this.updateState(
        "error",
        error?.message?.includes("fetch") || error?.message?.includes("parser")
          ? "The 3D parser could not load. Check your connection and try again."
          : "This file could not be previewed. Check that it is a valid STL, 3MF, or OBJ model.",
      );
    }
  }

  createViewer(object, sphere) {
    const canvas = document.createElement("canvas");
    canvas.className = "model-preview-canvas";
    canvas.setAttribute("aria-label", `Interactive 3D preview of ${this.file.name}`);
    canvas.tabIndex = 0;
    const message = document.createElement("p");
    message.className = "model-preview-message";
    message.setAttribute("role", "status");
    message.setAttribute("aria-live", "polite");
    this.container.replaceChildren(canvas, message);

    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141815);
    this.camera = new THREE.PerspectiveCamera(38, width / height, Math.max(0.0001, sphere.radius / 1000), sphere.radius * 100);
    const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.28;
    this.camera.position.set(distance * 0.85, distance * 0.72, distance);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(width, height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x141815, 1);
    this.scene.add(new THREE.HemisphereLight(0xeaf1e7, 0x303832, 2.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
    keyLight.position.set(3, 5, 4);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb7d8a5, 0.75);
    fillLight.position.set(-4, -2, -3);
    this.scene.add(fillLight);
    this.scene.add(object);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = Math.max(sphere.radius * 0.025, 0.0001);
    this.controls.maxDistance = sphere.radius * 45;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.container);
    const animate = () => {
      if (this.disposed) return;
      this.frameId = requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  resize() {
    if (this.disposed || !this.renderer || !this.camera) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  cleanupResources() {
    cancelAnimationFrame(this.frameId);
    this.observer?.disconnect();
    this.controls?.dispose();
    disposeObject(this.object);
    this.scene?.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.object = null;
    this.scene = null;
    this.controls = null;
    this.renderer = null;
    this.observer = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cleanupResources();
    this.container.replaceChildren();
  }
}

export function disposeModelPreview() {
  activePreview?.dispose();
  activePreview = null;
}

export async function mountModelPreview(container, file, onState) {
  disposeModelPreview();
  const preview = new ModelPreview(container, file, onState);
  activePreview = preview;
  await preview.load();
}
