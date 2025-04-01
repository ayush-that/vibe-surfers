import * as THREE from "three";
import {
  LANE_WIDTH,
  PLAYER_START_POS_Z,
  PLAYER_MAX_HEALTH,
  PLAYER_LANE_SWITCH_SPEED,
  PROJECTILE_COOLDOWN,
} from "./constants";

export default class PlayerController {
  mesh;
  currentLane = 0;
  targetX = 0;
  health = PLAYER_MAX_HEALTH;
  maxHealth = PLAYER_MAX_HEALTH;
  lastShotTime = 0;
  isDead = false;

  projectileManager;
  sceneManager;

  constructor() {
    this.createPlayerMesh();
  }

  createPlayerMesh() {
    const geometry = new THREE.CapsuleGeometry(0.4, 0.6, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0077ff,
      metalness: 0.3,
      roughness: 0.6,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(0, 0.7, PLAYER_START_POS_Z);
    this.mesh.castShadow = true;
    this.mesh.userData.isPlayer = true;
  }

  initialize(sceneManager, projectileManager) {
    this.sceneManager = sceneManager;
    this.projectileManager = projectileManager;
    this.sceneManager.addToScene(this.mesh);
  }

  handleInput(event) {
    if (this.isDead) return;

    switch (event.key) {
      case "ArrowLeft":
      case "a":
        if (this.currentLane > -1) {
          this.currentLane--;
          this.targetX = this.currentLane * LANE_WIDTH;
        }
        break;
      case "ArrowRight":
      case "d":
        if (this.currentLane < 1) {
          this.currentLane++;
          this.targetX = this.currentLane * LANE_WIDTH;
        }
        break;
    }
  }

  handleShoot(currentTime) {
    if (this.isDead || !this.projectileManager) return;

    if (currentTime - this.lastShotTime < PROJECTILE_COOLDOWN) {
      return;
    }
    this.lastShotTime = currentTime;

    const startPosition = this.mesh.position.clone();
    startPosition.y += 0.2;
    startPosition.z -= 0.5;

    const direction = new THREE.Vector3(0, 0, -1);

    this.projectileManager.fireProjectile(startPosition, direction);
  }

  update(deltaTime) {
    if (this.isDead) return;

    this.mesh.position.x = THREE.MathUtils.lerp(
      this.mesh.position.x,
      this.targetX,
      PLAYER_LANE_SWITCH_SPEED
    );
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.health -= amount;
    console.log(`Player health: ${this.health}/${this.maxHealth}`);
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
    return this.health / this.maxHealth;
  }

  die() {
    if (this.isDead) return;
    console.log("Player Died!");
    this.isDead = true;
    this.mesh.visible = false;
  }

  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.currentLane = 0;
    this.targetX = 0;
    this.mesh.position.set(0, 0.7, PLAYER_START_POS_Z);
    this.mesh.visible = true;
    this.lastShotTime = 0;
  }

  getPlayerHealthState() {
    return { current: this.health, max: this.maxHealth };
  }
}
