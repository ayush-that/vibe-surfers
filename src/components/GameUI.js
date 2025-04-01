import React from "react";
import styles from "./GameUI.module.css";

const GameUI = ({
  score,
  playerHealth,
  maxPlayerHealth,
  isGameOver,
  onRestart,
}) => {
  const healthPercentage =
    maxPlayerHealth > 0 ? (playerHealth / maxPlayerHealth) * 100 : 0;

  return (
    <>
      <div className={styles.hud}>
        <div className={styles.scoreDisplay}>Score: {score}</div>
        <div className={styles.healthBarContainer}>
          <div className={styles.healthBarLabel}>HP</div>
          <div className={styles.healthBarBackground}>
            <div
              className={styles.healthBarFill}
              style={{
                width: `${healthPercentage}%`,
                backgroundColor:
                  healthPercentage > 50
                    ? "#4CAF50"
                    : healthPercentage > 20
                    ? "#FFC107"
                    : "#F44336",
              }}
            ></div>
          </div>
        </div>
      </div>

      {isGameOver && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverBox}>
            <h2>Game Over!</h2>
            <p>Final Score: {score}</p>
            <button onClick={onRestart} className={styles.restartButton}>
              Restart
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameUI;
