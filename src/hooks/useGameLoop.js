import { useRef, useCallback } from "react";
import * as THREE from "three";
import { MOVE_SPEED } from "../game/constants";

export const useGameLoop = ({
  sceneManagerRef,
  playerControllerRef,
  enemyManagerRef,
  projectileManagerRef,
  isGameOver,
  setScore,
  setPlayerHealth,
  handleGameOver,
}) => {
  const gameLoopRef = useRef();
  const gameClockRef = useRef(new THREE.Clock());
  const gameTimeRef = useRef(0);

  const stopGameLoop = useCallback(() => {
    if (gameLoopRef.current) {
      console.log("Stopping game loop.");
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (
      !sceneManagerRef.current ||
      !playerControllerRef.current ||
      !enemyManagerRef.current ||
      !projectileManagerRef.current ||
      isGameOver
    ) {
      console.log("Game loop stopping or managers not ready.");
      return;
    }

    const deltaTime = gameClockRef.current.getDelta();
    const currentTotalTime = gameClockRef.current.elapsedTime;
    gameTimeRef.current = currentTotalTime;

    const player = playerControllerRef.current;
    const enemies = enemyManagerRef.current;
    const projectiles = projectileManagerRef.current;
    const scene = sceneManagerRef.current;

    player.update(deltaTime);

    const enemyUpdateResult = enemies.update(deltaTime, currentTotalTime);
    if (enemyUpdateResult.scoreToAdd !== 0) {
      setScore((prev) => Math.max(0, prev + enemyUpdateResult.scoreToAdd));
    }
    if (enemyUpdateResult.damageToPlayer > 0 && !player.isDead) {
      const newHealthPerc = player.takeDamage(enemyUpdateResult.damageToPlayer);
      setPlayerHealth(Math.round(newHealthPerc * player.maxHealth));
      if (player.isDead) {
        handleGameOver("Player defeated!");
      }
    }

    const projectileUpdateResult = projectiles.update(deltaTime);
    if (projectileUpdateResult.scoreToAdd !== 0) {
      setScore((prev) => prev + projectileUpdateResult.scoreToAdd);
    }

    const currentMoveSpeed =
      MOVE_SPEED * (1.0 + (currentTotalTime / 20.0) * 0.6);
    scene.updateGround(deltaTime, currentMoveSpeed);

    scene.render();

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [
    isGameOver,
    sceneManagerRef,
    playerControllerRef,
    enemyManagerRef,
    projectileManagerRef,
    setScore,
    setPlayerHealth,
    handleGameOver,
  ]);

  const startGameLoop = useCallback(() => {
    console.log("Starting game loop...");
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    gameClockRef.current = new THREE.Clock();
    gameTimeRef.current = 0;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameLoop]);

  const resetGameLoop = useCallback(() => {
    stopGameLoop();
    gameClockRef.current = new THREE.Clock();
    gameTimeRef.current = 0;
  }, [stopGameLoop]);

  return {
    startGameLoop,
    stopGameLoop,
    resetGameLoop,
    gameTime: gameTimeRef.current,
  };
};
