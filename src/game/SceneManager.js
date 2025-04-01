import * as THREE from "three";
import {
  LANE_WIDTH,
  NUM_LANES,
  GROUND_SEGMENT_LENGTH,
  NUM_GROUND_SEGMENTS,
  BACKGROUND_COLOR,
  FOG_COLOR,
  FOG_NEAR,
  FOG_FAR,
} from "./constants";

export default class SceneManager {
  scene;
  camera;
  renderer;
  ambientLight;
  directionalLight;
  groundSegments = [];
  fog;

  constructor(mountPoint) {
    if (!mountPoint) {
      throw new Error("SceneManager requires a mount point.");
    }
    this.mountPoint = mountPoint;
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);
    this.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
    this.scene.fog = this.fog;

    const aspect = this.mountPoint.clientWidth / this.mountPoint.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
    this.camera.position.set(0, 3.0, 6);
    this.camera.lookAt(0, 1, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.mountPoint.clientWidth,
      this.mountPoint.clientHeight
    );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mountPoint.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(5, 10, 7.5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    const shadowCamSize = 15;
    this.directionalLight.shadow.camera.left = -shadowCamSize;
    this.directionalLight.shadow.camera.right = shadowCamSize;
    this.directionalLight.shadow.camera.top = shadowCamSize;
    this.directionalLight.shadow.camera.bottom = -shadowCamSize;
    this.scene.add(this.directionalLight);

    this.createGround();
  }

  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(
      LANE_WIDTH * NUM_LANES * 1.2,
      GROUND_SEGMENT_LENGTH
    ); // Ensure slightly wider than lanes
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.2,
      roughness: 0.8,
    }); // Darker, slightly metallic ground
    groundMaterial.side = THREE.DoubleSide;

    for (let i = 0; i < NUM_GROUND_SEGMENTS; i++) {
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.z =
        -i * GROUND_SEGMENT_LENGTH + GROUND_SEGMENT_LENGTH / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);
      this.groundSegments.push(ground);
    }
  }

  updateGround(deltaTime, speed) {
    const moveDistance = speed * deltaTime;
    this.groundSegments.forEach((segment) => {
      segment.position.z += moveDistance;
      if (segment.position.z > GROUND_SEGMENT_LENGTH * 1.5) {
        segment.position.z -= NUM_GROUND_SEGMENTS * GROUND_SEGMENT_LENGTH;
      }
    });
  }

  onResize() {
    const width = this.mountPoint.clientWidth;
    const height = this.mountPoint.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  addToScene(object) {
    this.scene.add(object);
  }

  removeFromScene(object) {
    this.scene.remove(object);
  }

  dispose() {
    console.log("Disposing SceneManager resources...");
    this.scene.traverse((object) => {
      if (object.isMesh || object.isSprite) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => {
              if (material.map) material.map.dispose();
              material.dispose();
            });
          } else {
            if (object.material.map) object.material.map.dispose();
            object.material.dispose();
          }
        }
      }
    });
    if (this.renderer) {
      this.renderer.dispose();
      if (
        this.mountPoint &&
        this.renderer.domElement &&
        this.mountPoint.contains(this.renderer.domElement)
      ) {
        this.mountPoint.removeChild(this.renderer.domElement);
      }
    }
    this.groundSegments = [];
    console.log("SceneManager disposed.");
  }
}
