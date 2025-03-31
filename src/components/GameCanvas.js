import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const GameCanvas = () => {
  const mountRef = useRef(null);
  const gameInstance = useRef({
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    obstacles: [],
    groundSegments: [],
    clock: new THREE.Clock(),
    moveSpeed: 5,
    laneWidth: 2,
    currentLane: 0,
    isJumping: false,
    velocityY: 0,
    gravity: -15,
    jumpForce: 7,
    score: 0,
    gameOver: false,
    animationFrameId: null,
    obstacleSpawnTimer: 0,
    obstacleSpawnInterval: 1.5,
    groundSegmentLength: 20,
    numGroundSegments: 5,
    obstaclePool: [],
    maxObstacles: 15,
  });
  const [currentScore, setCurrentScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    const game = gameInstance.current;
    const mountPoint = mountRef.current;

    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x87ceeb);
    game.scene.fog = new THREE.Fog(0x87ceeb, 10, 50);

    const aspect = mountPoint.clientWidth / mountPoint.clientHeight;
    game.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 100);
    game.camera.position.set(0, 2.5, 5);
    game.camera.lookAt(0, 1, 0);

    game.renderer = new THREE.WebGLRenderer({ antialias: true });
    game.renderer.setSize(mountPoint.clientWidth, mountPoint.clientHeight);
    game.renderer.shadowMap.enabled = true;
    mountPoint.appendChild(game.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    game.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    game.scene.add(directionalLight);


    // Player (Simple Cube)
    const playerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red cube
    game.player = new THREE.Mesh(playerGeometry, playerMaterial);
    game.player.position.set(0, 0.4, 0); // Start in the middle lane, slightly above ground
    game.player.castShadow = true;
    game.player.userData.boundingBox = new THREE.Box3().setFromObject(
      game.player
    ); // For collision
    game.scene.add(game.player);

    // Ground Segments
    const groundGeometry = new THREE.PlaneGeometry(
      game.laneWidth * 3,
      game.groundSegmentLength
    ); // Wider than 3 lanes
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22 }); // Forest green
    groundMaterial.side = THREE.DoubleSide;

    for (let i = 0; i < game.numGroundSegments; i++) {
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2; // Rotate to be flat
      ground.position.z =
        -i * game.groundSegmentLength + game.groundSegmentLength / 2; // Position segments one after another
      ground.receiveShadow = true;
      game.scene.add(ground);
      game.groundSegments.push(ground);
    }

    // Obstacle Pool
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x808080,
    }); // Grey
    for (let i = 0; i < game.maxObstacles; i++) {
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      obstacle.castShadow = true;
      obstacle.visible = false; // Start inactive
      obstacle.userData.boundingBox = new THREE.Box3().setFromObject(obstacle);
      game.scene.add(obstacle);
      game.obstaclePool.push(obstacle);
    }

    // --- Event Listeners ---
    const handleKeyDown = (event) => {
      if (game.gameOver) return;

      switch (event.key) {
        case "ArrowLeft":
        case "a":
          if (game.currentLane > -1) {
            game.currentLane--;
          }
          break;
        case "ArrowRight":
        case "d":
          if (game.currentLane < 1) {
            game.currentLane++;
          }
          break;
        case "ArrowUp":
        case "w":
        case " ": // Space bar for jump
          if (!game.isJumping) {
            game.isJumping = true;
            game.velocityY = game.jumpForce;
          }
          break;
      }
    };

    const handleResize = () => {
      if (!game.renderer || !game.camera) return;
      const width = mountPoint.clientWidth;
      const height = mountPoint.clientHeight;
      game.renderer.setSize(width, height);
      game.camera.aspect = width / height;
      game.camera.updateProjectionMatrix();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    // --- Start Game Loop ---
    const animate = () => {
      if (!gameInstance.current || gameInstance.current.gameOver) {
        // Check if game still exists or is over
        console.log("Game Over or Unmounted");
        // Potentially stop background music, show final score etc.
        return;
      }

      game.animationFrameId = requestAnimationFrame(animate);
      const deltaTime = game.clock.getDelta();

      // Update Score
      game.score += deltaTime * 10; // Score increases with time
      setCurrentScore(Math.floor(game.score));

      // Move Ground and Obstacles
      const moveDistance = game.moveSpeed * deltaTime;

      game.groundSegments.forEach((segment) => {
        segment.position.z += moveDistance;
        // Reset segment position if it moves too far forward
        if (segment.position.z > game.groundSegmentLength) {
          segment.position.z -=
            game.numGroundSegments * game.groundSegmentLength;
        }
      });

      game.obstacles.forEach((obstacle, index) => {
        if (!obstacle.visible) return; // Skip inactive obstacles
        obstacle.position.z += moveDistance;
        obstacle.userData.boundingBox.setFromObject(obstacle); // Update bounding box

        // Deactivate obstacles that move past the camera
        if (obstacle.position.z > game.camera.position.z + 2) {
          obstacle.visible = false;
          game.obstacles.splice(index, 1); // Remove from active list
        }
      });

      // Player Horizontal Movement (Smoothly lerp to target lane)
      const targetX = game.currentLane * game.laneWidth;
      game.player.position.x = THREE.MathUtils.lerp(
        game.player.position.x,
        targetX,
        0.2
      );

      // Player Vertical Movement (Jumping)
      if (game.isJumping) {
        game.player.position.y += game.velocityY * deltaTime;
        game.velocityY += game.gravity * deltaTime;

        if (game.player.position.y <= 0.4) {
          // Landed
          game.player.position.y = 0.4;
          game.isJumping = false;
          game.velocityY = 0;
        }
      }
      game.player.userData.boundingBox.setFromObject(game.player); // Update player bounding box

      // Spawn Obstacles
      game.obstacleSpawnTimer -= deltaTime;
      if (game.obstacleSpawnTimer <= 0) {
        game.obstacleSpawnTimer =
          game.obstacleSpawnInterval + (Math.random() - 0.5) * 0.5; // Reset timer with some variance
        spawnObstacle();
      }

      // Collision Detection
      checkCollisions();

      // Render Scene
      game.renderer.render(game.scene, game.camera);
    };

    const getAvailableObstacle = () => {
      for (let obstacle of game.obstaclePool) {
        if (!obstacle.visible) {
          return obstacle;
        }
      }
      console.warn("Obstacle pool depleted, consider increasing maxObstacles.");
      // Optionally create a new one if pool is empty, but pooling is generally preferred
      return null;
    };

    const spawnObstacle = () => {
      const obstacle = getAvailableObstacle();
      if (!obstacle) return; // No available obstacle in the pool

      const lane = Math.floor(Math.random() * 3) - 1; // Random lane (-1, 0, 1)
      obstacle.position.set(
        lane * game.laneWidth,
        0.5, // Position obstacle slightly above ground
        -game.groundSegmentLength * (game.numGroundSegments - 1.5) // Spawn ahead of the player
      );
      obstacle.visible = true;
      obstacle.userData.boundingBox.setFromObject(obstacle); // Set initial bounding box
      game.obstacles.push(obstacle); // Add to active obstacles list
    };

    const checkCollisions = () => {
      const playerBox = game.player.userData.boundingBox;
      for (let obstacle of game.obstacles) {
        if (!obstacle.visible) continue; // Skip inactive obstacles

        const obstacleBox = obstacle.userData.boundingBox;
        if (playerBox.intersectsBox(obstacleBox)) {
          console.log("Collision Detected!");
          game.gameOver = true;
          setIsGameOver(true);
          if (game.animationFrameId) {
            cancelAnimationFrame(game.animationFrameId);
            game.animationFrameId = null;
          }
          // You can add more game over logic here (e.g., stop sounds, show menu)
          break; // No need to check further collisions
        }
      }
    };

    // Start the animation loop
    animate();

    // --- Cleanup ---
    return () => {
      console.log("Cleaning up Three.js scene...");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);

      if (game.animationFrameId) {
        cancelAnimationFrame(game.animationFrameId);
      }

      // Dispose of Three.js objects
      game.scene.traverse((object) => {
        if (object.isMesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            // If material is an array, dispose each element
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
      if (game.renderer) {
        game.renderer.dispose();
        // Remove canvas from DOM if it exists
        if (
          mountPoint &&
          game.renderer.domElement &&
          mountPoint.contains(game.renderer.domElement)
        ) {
          mountPoint.removeChild(game.renderer.domElement);
        }
      }

      // Clear refs
      gameInstance.current = {
        // Reset the ref content
        scene: null,
        camera: null,
        renderer: null,
        player: null,
        obstacles: [],
        groundSegments: [],
        clock: null,
        moveSpeed: 5,
        laneWidth: 2,
        currentLane: 0,
        isJumping: false,
        velocityY: 0,
        gravity: -15,
        jumpForce: 7,
        score: 0,
        gameOver: false,
        animationFrameId: null,
        obstacleSpawnTimer: 0,
        obstacleSpawnInterval: 1.5,
        groundSegmentLength: 20,
        numGroundSegments: 5,
        obstaclePool: [],
        maxObstacles: 15,
      };
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const restartGame = () => {
    // This is a simple way to restart: reload the page or re-mount the component.
    // For a smoother restart, you'd need to reset all game state variables
    // within gameInstance.current and restart the animate loop without unmounting.
    window.location.reload(); // Easiest way for this example
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        background: "#111",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          color: "white",
          fontSize: "24px",
          fontFamily: "Arial, sans-serif",
          zIndex: 10,
        }}
      >
        Score: {currentScore}
      </div>
      {isGameOver && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.7)",
            padding: "30px",
            borderRadius: "10px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <h2>Game Over!</h2>
          <p>Final Score: {currentScore}</p>
          <button
            onClick={restartGame}
            style={{
              padding: "10px 20px",
              fontSize: "18px",
              cursor: "pointer",
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
