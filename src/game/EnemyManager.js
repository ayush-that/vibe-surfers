import * as THREE from "three";
import {
  createHealthBarSprite,
  updateHealthBarTexture,
  getRandom,
} from "./utils";
import {
  MAX_ENEMIES_POOL,
  ENEMY_START_HEALTH,
  ENEMY_BASE_Y,
  LANE_WIDTH,
  NUM_LANES,
  GROUND_SEGMENT_LENGTH,
  NUM_GROUND_SEGMENTS,
  ENEMY_SPAWN_INTERVAL_MIN,
  ENEMY_SPAWN_INTERVAL_MAX,
  MOVE_SPEED,
  PLAYER_DAMAGE_ON_ENEMY_HIT,
  ENEMY_SCORE_VALUE,
  HIT_FLASH_DURATION,
  DEATH_SHRINK_DURATION,
} from "./constants";

export default class EnemyManager {
  enemyPool = [];
  activeEnemies = [];
  spawnTimer = 0;
  nextSpawnInterval = 0;

  sceneManager;
  playerController;

  constructor() {
    this.createEnemyPool();
    this.setNextSpawnInterval();
  }

  initialize(sceneManager, playerController) {
    this.sceneManager = sceneManager;
    this.playerController = playerController;
    this.enemyPool.forEach((enemyData) =>
      this.sceneManager.addToScene(enemyData.mesh)
    );
  }

  createEnemyPool() {
    const enemyGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    const enemyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8c00,
      metalness: 0.1,
      roughness: 0.7,
    });

    for (let i = 0; i < MAX_ENEMIES_POOL; i++) {
      const mesh = new THREE.Mesh(enemyGeometry.clone(), enemyMaterial.clone());
      mesh.castShadow = true;
      mesh.visible = false;
      const healthBar = createHealthBarSprite();
      healthBar.position.y = 1.0;
      healthBar.visible = false;
      mesh.add(healthBar);

      const enemyData = {
        mesh: mesh,
        healthBar: healthBar,
        currentHealth: ENEMY_START_HEALTH,
        maxHealth: ENEMY_START_HEALTH,
        boundingBox: new THREE.Box3(),
        isActive: false,
        originalColor: enemyMaterial.color.clone(),
        hitFlashTimer: 0,
        deathTimer: 0,
        isDying: false,
      };
      this.enemyPool.push(enemyData);
    }
  }

  setNextSpawnInterval() {
    this.nextSpawnInterval = getRandom(
      ENEMY_SPAWN_INTERVAL_MIN,
      ENEMY_SPAWN_INTERVAL_MAX
    );
  }

  getAvailableEnemy() {
    return this.enemyPool.find((enemy) => !enemy.isActive);
  }

  spawnEnemy() {
    const enemyData = this.getAvailableEnemy();
    if (!enemyData) {
      console.warn("Enemy pool depleted!");
      return;
    }

    const lane = Math.floor(Math.random() * NUM_LANES) - 1;

    enemyData.mesh.position.set(
      lane * LANE_WIDTH,
      ENEMY_BASE_Y,
      -GROUND_SEGMENT_LENGTH * (NUM_GROUND_SEGMENTS - 1.5)
    );
    enemyData.currentHealth = enemyData.maxHealth;
    enemyData.mesh.visible = true;
    enemyData.healthBar.visible = true;
    updateHealthBarTexture(enemyData.healthBar, 1);
    enemyData.boundingBox.setFromObject(enemyData.mesh);
    enemyData.isActive = true;
    enemyData.isDying = false;
    enemyData.mesh.scale.set(1, 1, 1);
    enemyData.mesh.material.color.copy(enemyData.originalColor);
    this.activeEnemies.push(enemyData);
  }

  update(deltaTime, gameTime) {
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.nextSpawnInterval) {
      this.spawnEnemy();
      this.spawnTimer = 0;
      this.setNextSpawnInterval();
    }

    let scoreToAdd = 0;
    let damageToPlayer = 0;

    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemyData = this.activeEnemies[i];
      if (!enemyData.isActive) continue;

      if (enemyData.isDying) {
        enemyData.deathTimer -= deltaTime;
        const scale = Math.max(0, enemyData.deathTimer / DEATH_SHRINK_DURATION);
        enemyData.mesh.scale.set(scale, scale, scale);
        if (enemyData.deathTimer <= 0) {
          this.deactivateEnemy(enemyData, i);
        }
        continue;
      }

      if (enemyData.hitFlashTimer > 0) {
        enemyData.hitFlashTimer -= deltaTime;
        if (enemyData.hitFlashTimer <= 0) {
          enemyData.mesh.material.color.copy(enemyData.originalColor);
        }
      }

      const speedMultiplier = 1.0 + (gameTime / 60.0) * 0.5;
      const currentMoveSpeed = MOVE_SPEED * speedMultiplier;
      enemyData.mesh.position.z += currentMoveSpeed * deltaTime;
      enemyData.boundingBox.setFromObject(enemyData.mesh);

      if (
        enemyData.mesh.position.z >
        this.playerController.mesh.position.z - 0.5
      ) {
        console.log("Enemy reached player!");
        damageToPlayer += PLAYER_DAMAGE_ON_ENEMY_HIT;
        this.startDeathEffect(enemyData);
        scoreToAdd -= 5;
      } else if (
        enemyData.mesh.position.z >
        this.sceneManager.camera.position.z + 10
      ) {
        this.deactivateEnemy(enemyData, i);
      }
    }

    return { scoreToAdd, damageToPlayer };
  }

  takeDamage(enemyData, amount) {
    if (!enemyData.isActive || enemyData.isDying)
      return { killed: false, scoreValue: 0 };

    enemyData.currentHealth -= amount;
    const healthPerc = enemyData.currentHealth / enemyData.maxHealth;
    updateHealthBarTexture(enemyData.healthBar, healthPerc);

    enemyData.mesh.material.color.set(0xffffff);
    enemyData.hitFlashTimer = HIT_FLASH_DURATION;

    if (enemyData.currentHealth <= 0) {
      this.startDeathEffect(enemyData);
      return { killed: true, scoreValue: ENEMY_SCORE_VALUE };
    }
    return { killed: false, scoreValue: 0 };
  }

  startDeathEffect(enemyData) {
    if (!enemyData.isActive || enemyData.isDying) return;
    enemyData.isDying = true;
    enemyData.deathTimer = DEATH_SHRINK_DURATION;
    enemyData.healthBar.visible = false;
  }

  deactivateEnemy(enemyData, index) {
    enemyData.mesh.visible = false;
    enemyData.healthBar.visible = false;
    enemyData.isActive = false;
    enemyData.isDying = false;
    enemyData.mesh.scale.set(1, 1, 1);
    enemyData.mesh.material.color.copy(enemyData.originalColor);
    this.activeEnemies.splice(index, 1);
  }

  reset() {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      this.deactivateEnemy(this.activeEnemies[i], i);
    }
    this.activeEnemies = [];
    this.spawnTimer = 0;
    this.setNextSpawnInterval();
    this.enemyPool.forEach((enemyData) => {
      if (enemyData.isActive) {
        enemyData.mesh.visible = false;
        enemyData.healthBar.visible = false;
        enemyData.isActive = false;
        enemyData.isDying = false;
        enemyData.mesh.scale.set(1, 1, 1);
        enemyData.mesh.material.color.copy(enemyData.originalColor);
      }
    });
  }

  getActiveEnemiesData() {
    return this.activeEnemies
      .filter((e) => e.isActive && !e.isDying)
      .map((e) => ({
        mesh: e.mesh,
        boundingBox: e.boundingBox,
        id: e.mesh.uuid,
        manager: this,
      }));
  }
}
