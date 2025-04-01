import React, { useRef, useEffect, useState, useCallback } from "react";

import SceneManager from "../game/SceneManager";
import PlayerController from "../game/PlayerController";
import EnemyManager from "../game/EnemyManager";
import ProjectileManager from "../game/ProjectileManager";
import GameUI from "./GameUI";
import { useGameLoop } from "../hooks/useGameLoop";

const GameCanvas = () => {
  const mountRef = useRef(null);
  const sceneManagerRef = useRef();
  const playerControllerRef = useRef();
  const enemyManagerRef = useRef();
  const projectileManagerRef = useRef();

  const [score, setScore] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [maxPlayerHealth, setMaxPlayerHealth] = useState(100);
  const [isGameOver, setIsGameOver] = useState(false);

  const initializeGame = useCallback((mountPoint) => {
    console.log("Initializing game...");
    const sceneManager = new SceneManager(mountPoint);
    const playerController = new PlayerController();
    const enemyManager = new EnemyManager();
    const projectileManager = new ProjectileManager();

    sceneManagerRef.current = sceneManager;
    playerControllerRef.current = playerController;
    enemyManagerRef.current = enemyManager;
    projectileManagerRef.current = projectileManager;

    playerController.initialize(sceneManager, projectileManager);
    enemyManager.initialize(sceneManager, playerController);
    projectileManager.initialize(sceneManager, enemyManager);

    setScore(0);
    setMaxPlayerHealth(playerController.maxHealth);
    setPlayerHealth(playerController.health);
    setIsGameOver(false);

    console.log("Game Initialized.");
  }, []);

  const handleGameOver = useCallback(
    (reason) => {
      if (isGameOver) return;
      console.log(`Game Over: ${reason}`);
      setIsGameOver(true);

      if (playerControllerRef.current) {
        playerControllerRef.current.isDead = true;
      }
      if (enemyManagerRef.current) {
        enemyManagerRef.current.reset();
      }
      if (projectileManagerRef.current) {
        projectileManagerRef.current.reset();
      }
    },
    [isGameOver]
  );

  const { startGameLoop, stopGameLoop, resetGameLoop } = useGameLoop({
    sceneManagerRef,
    playerControllerRef,
    enemyManagerRef,
    projectileManagerRef,
    isGameOver,
    setScore,
    setPlayerHealth,
    handleGameOver,
  });

  const handleKeyDown = useCallback((event) => {
    playerControllerRef.current?.handleInput(event);
  }, []);

  const handleMouseDown = useCallback((event) => {
    if (event.button === 0) {
      playerControllerRef.current?.handleShoot(performance.now() / 1000);
    }
  }, []);

  const handleResize = useCallback(() => {
    sceneManagerRef.current?.onResize();
  }, []);

  useEffect(() => {
    const mountPoint = mountRef.current;
    if (mountPoint) {
      initializeGame(mountPoint);
      startGameLoop();

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      console.log("Cleaning up GameCanvas...");
      stopGameLoop();

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("resize", handleResize);

      sceneManagerRef.current?.dispose();

      sceneManagerRef.current = null;
      playerControllerRef.current = null;
      enemyManagerRef.current = null;
      projectileManagerRef.current = null;
      console.log("GameCanvas cleanup complete.");
    };
  }, [
    initializeGame,
    startGameLoop,
    stopGameLoop,
    handleKeyDown,
    handleMouseDown,
    handleResize,
  ]);

  const handleRestart = useCallback(() => {
    console.log("Restarting game...");
    setIsGameOver(false);
    setScore(0);

    if (playerControllerRef.current) {
      playerControllerRef.current.reset();
      playerControllerRef.current.mesh.visible = true;
      playerControllerRef.current.isDead = false;
    }
    if (enemyManagerRef.current) {
      enemyManagerRef.current.reset();
    }
    if (projectileManagerRef.current) {
      projectileManagerRef.current.reset();
    }

    resetGameLoop();
    startGameLoop();
    setPlayerHealth(playerControllerRef.current?.maxHealth || 100);
  }, [resetGameLoop, startGameLoop]);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: "#111",
        cursor: "crosshair",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <GameUI
        score={score}
        playerHealth={playerHealth}
        maxPlayerHealth={maxPlayerHealth}
        isGameOver={isGameOver}
        onRestart={handleRestart}
      />
    </div>
  );
};

export default GameCanvas;
