import * as THREE from "three";
import {
  MAX_PROJECTILES_POOL,
  PROJECTILE_SPEED,
  PROJECTILE_DAMAGE,
  GROUND_SEGMENT_LENGTH,
  NUM_GROUND_SEGMENTS,
} from "./constants";

export default class ProjectileManager {
  projectilePool = [];
  activeProjectiles = [];

  sceneManager;
  enemyManager;

  constructor() {
    this.createProjectilePool();
  }

  initialize(sceneManager, enemyManager) {
    this.sceneManager = sceneManager;
    this.enemyManager = enemyManager;
    this.projectilePool.forEach((projData) =>
      this.sceneManager.addToScene(projData.mesh)
    );
  }

  createProjectilePool() {
    const projectileGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    for (let i = 0; i < MAX_PROJECTILES_POOL; i++) {
      const mesh = new THREE.Mesh(
        projectileGeometry.clone(),
        projectileMaterial.clone()
      );
      mesh.visible = false;
      const projData = {
        mesh: mesh,
        velocity: new THREE.Vector3(),
        boundingBox: new THREE.Box3(),
        isActive: false,
      };
      this.projectilePool.push(projData);
    }
  }

  getAvailableProjectile() {
    return this.projectilePool.find((p) => !p.isActive);
  }

  fireProjectile(startPosition, direction) {
    const projData = this.getAvailableProjectile();
    if (!projData) {
      console.warn("Projectile pool empty!");
      return;
    }

    projData.mesh.position.copy(startPosition);
    projData.velocity
      .copy(direction)
      .normalize()
      .multiplyScalar(PROJECTILE_SPEED);
    projData.mesh.visible = true;
    projData.isActive = true;
    projData.boundingBox.setFromObject(projData.mesh);
    this.activeProjectiles.push(projData);
  }

  update(deltaTime) {
    let scoreToAdd = 0;
    const enemiesData = this.enemyManager.getActiveEnemiesData();

    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projData = this.activeProjectiles[i];
      if (!projData.isActive) continue;

      projData.mesh.position.addScaledVector(projData.velocity, deltaTime);
      projData.boundingBox.setFromObject(projData.mesh);

      let hit = false;
      for (const enemy of enemiesData) {
        if (projData.boundingBox.intersectsBox(enemy.boundingBox)) {
          const damageResult = enemy.manager.takeDamage(
            this.enemyManager.activeEnemies.find(
              (e) => e.mesh.uuid === enemy.id
            ),
            PROJECTILE_DAMAGE
          );

          if (damageResult.killed) {
            scoreToAdd += damageResult.scoreValue;
          }

          this.deactivateProjectile(projData, i);
          hit = true;
          break;
        }
      }

      if (hit) continue;

      if (
        projData.mesh.position.z <
          -GROUND_SEGMENT_LENGTH * NUM_GROUND_SEGMENTS ||
        projData.mesh.position.z > this.sceneManager.camera.position.z + 10
      ) {
        this.deactivateProjectile(projData, i);
      }
    }
    return { scoreToAdd };
  }

  deactivateProjectile(projData, index) {
    projData.mesh.visible = false;
    projData.isActive = false;
    this.activeProjectiles.splice(index, 1);
  }

  reset() {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      this.deactivateProjectile(this.activeProjectiles[i], i);
    }
    this.activeProjectiles = [];
    this.projectilePool.forEach((projData) => {
      if (projData.isActive) {
        projData.mesh.visible = false;
        projData.isActive = false;
      }
    });
  }
}
