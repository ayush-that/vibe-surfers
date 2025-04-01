import * as THREE from "three";
import { ENEMY_HEALTH_BAR_WIDTH, ENEMY_HEALTH_BAR_HEIGHT } from "./constants";

export const createHealthBarSprite = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 16;
  const context = canvas.getContext("2d");

  const spriteMaterial = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    sizeAttenuation: true,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(ENEMY_HEALTH_BAR_WIDTH, ENEMY_HEALTH_BAR_HEIGHT, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.context = context;
  updateHealthBarTexture(sprite, 1);
  sprite.renderOrder = 1;
  return sprite;
};

export const updateHealthBarTexture = (healthBarSprite, healthPercentage) => {
  const canvas = healthBarSprite.userData.canvas;
  const context = healthBarSprite.userData.context;
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;

  context.clearRect(0, 0, width, height);

  context.fillStyle = "rgba(68, 68, 68, 0.7)";
  context.fillRect(0, 0, width, height);

  const healthWidth = width * Math.max(0, healthPercentage);
  context.fillStyle =
    healthPercentage > 0.5
      ? "#00ff00"
      : healthPercentage > 0.2
      ? "#ffff00"
      : "#ff0000";
  context.fillRect(0, 0, healthWidth, height);

  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineWidth = 2;
  context.strokeRect(0, 0, width, height);

  if (healthBarSprite.material.map) {
    healthBarSprite.material.map.needsUpdate = true;
  }
};

export function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}
