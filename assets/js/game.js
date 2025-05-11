// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas dimensions
canvas.width = 800;
canvas.height = 400;

// Constants for boundaries
const GROUND_Y = canvas.height;
const CEILING_Y = 0;

// Game variables
const gravity = 0.6;
const jumpForce = -10;
const maxJumpTime = 15;
const coyoteTimeLimit = 10;

// Hindernisabstände: Je nach Geschwindigkeit
const BASE_MIN_GAP = 220; // px, Mindestabstand (bei Startgeschwindigkeit)
const BASE_MAX_GAP = 340; // px, Maximalabstand (bei Startgeschwindigkeit)
const GAP_SCALING = 2.6;  // Wie stark wächst der Mindestabstand mit Geschwindigkeit

let player = {
  x: 50,
  y: GROUND_Y - 80,
  width: 40,
  height: 80,
  dy: 0,
  jumping: false,
  ducking: false,
  jumpTime: 0,
  grounded: false,
  coyoteTime: 0,
  color: "blue",
  invincible: false,
  invincibleTimer: 0,
};

let obstacles = [];
let powerUps = [];
let frameCount = 0;
let score = 0;
let highScore = 0;
let gameSpeed = 2.8; // Viel langsamerer Start
const MAX_GAME_SPEED = 8.5; // Maximalgeschwindigkeit, danach bleibt sie konstant
let isGameOver = false;
let backgroundX = 0;

// Input handling
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && (player.grounded || player.coyoteTime > 0)) {
    if (!player.ducking) {
      player.jumping = true;
      player.dy = jumpForce;
      player.grounded = false;
      player.coyoteTime = 0;
      player.jumpTime = 0;
    }
  }

  if (e.code === "ArrowDown" && player.grounded) {
    player.ducking = true;
    player.height = 40;
    player.y += 40;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    player.jumping = false;
  }

  if (e.code === "ArrowDown") {
    player.ducking = false;
    player.height = 80;
    player.y -= 40;
  }
});

function gameLoop() {
  if (!isGameOver) {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
  } else {
    handleGameOver();
  }
}

function getMinMaxGap() {
  // Der Mindestabstand wächst mit Geschwindigkeit, aber nicht zu schnell.
  let minGap = BASE_MIN_GAP + (gameSpeed - 2.8) * 60 * GAP_SCALING;
  let maxGap = BASE_MAX_GAP + (gameSpeed - 2.8) * 110 * GAP_SCALING;
  // Begrenzungen, damit es nicht zu schwer oder zu leicht wird
  minGap = Math.min(minGap, 430);
  maxGap = Math.min(maxGap, 650);
  return { minGap, maxGap };
}

function updateGame() {
  frameCount++;

  // Background scroll effect
  backgroundX -= gameSpeed / 6;
  if (backgroundX <= -canvas.width) backgroundX = 0;

  // Update player position
  if (player.jumping && player.jumpTime < maxJumpTime) {
    player.dy += gravity / 2;
    player.jumpTime++;
  } else {
    player.dy += gravity;
  }

  player.y += player.dy;

  // Prevent player from falling below ground
  if (player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.dy = 0;
    player.grounded = true;
  } else {
    player.grounded = false;
  }

  // Handle coyote time
  if (!player.grounded) {
    player.coyoteTime = Math.max(0, player.coyoteTime - 1);
  } else {
    player.coyoteTime = coyoteTimeLimit;
  }

  // Invincibility
  if (player.invincible) {
    player.invincibleTimer--;
    if (player.invincibleTimer <= 0) {
      player.invincible = false;
      player.color = "blue";
    }
  }

  // Move and manage obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.x -= gameSpeed;

    // Remove off-screen obstacles
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(i, 1);
      score++;
      if (gameSpeed < MAX_GAME_SPEED) {
        gameSpeed += 0.013; // Noch langsameres Steigern der Geschwindigkeit
      }
    }

    // Collision detection
    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ) {
      if (!(player.ducking && obstacle.type === "overhead")) {
        if (!player.invincible) isGameOver = true;
      }
    }
  }

  // Move and manage power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.x -= gameSpeed;

    // Remove off-screen power-ups
    if (powerUp.x + powerUp.size < 0) {
      powerUps.splice(i, 1);
    }

    // Collision with player
    if (
      player.x < powerUp.x + powerUp.size &&
      player.x + player.width > powerUp.x &&
      player.y < powerUp.y + powerUp.size &&
      player.y + player.height > powerUp.y
    ) {
      applyPowerUp(powerUp.type);
      powerUps.splice(i, 1);
    }
  }

  // Hindernis-Generierung: fairer, abhängig von Geschwindigkeit
  const { minGap, maxGap } = getMinMaxGap();
  let lastObstacle = obstacles[obstacles.length - 1];

  if (
    obstacles.length === 0 ||
    (lastObstacle &&
      lastObstacle.x < canvas.width - minGap)
  ) {
    // Zufallswert für mehr Variation, aber nie kleiner als Mindestabstand
    const gap = minGap + Math.random() * (maxGap - minGap);
    generateObstacle(gap);
  }

  // Power-Ups
  if (Math.random() < 0.0025 && powerUps.length < 2) {
    generatePowerUp();
  }
}

function generateObstacle(gap = 300) {
  const obstacleType = Math.random() < 0.5 ? "ground" : "overhead";
  const obstacleHeight =
    obstacleType === "ground"
      ? Math.random() * 40 + 30
      : Math.random() * 28 + 22;
  const obstacleY =
    obstacleType === "ground"
      ? GROUND_Y - obstacleHeight
      : GROUND_Y - 60 - obstacleHeight;

  // Hindernis hinter dem Canvas platzieren, plus den Abstand (gap)
  obstacles.push({
    x: canvas.width + gap,
    y: obstacleY,
    width: 30,
    height: obstacleHeight,
    type: obstacleType,
  });
}

function generatePowerUp() {
  const types = ["invincible", "scoreBoost"];
  const type = types[Math.floor(Math.random() * types.length)];
  const size = 25;
  const y =
    Math.random() < 0.5
      ? GROUND_Y - size - Math.random() * 60
      : GROUND_Y - 80 - size - Math.random() * 80;
  powerUps.push({
    x: canvas.width + Math.random() * 100 + 120,
    y,
    size,
    type,
    color: type === "invincible" ? "gold" : "lime"
  });
}

function applyPowerUp(type) {
  if (type === "invincible") {
    player.invincible = true;
    player.invincibleTimer = 180;
    player.color = "gold";
  } else if (type === "scoreBoost") {
    score += 10;
  }
}

// Drawing
function drawGame() {
  ctx.fillStyle = "#222";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let x = backgroundX; x < canvas.width + 40; x += 40) {
    ctx.fillStyle = "#444";
    ctx.fillRect(x, GROUND_Y - 20, 40, 20);
  }

  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  ctx.fillStyle = "red";
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    if (obstacle.type === "overhead") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.arc(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width,
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.fillStyle = "red";
    }
  });

  powerUps.forEach((powerUp) => {
    ctx.fillStyle = powerUp.color;
    ctx.beginPath();
    ctx.arc(
      powerUp.x + powerUp.size / 2,
      powerUp.y + powerUp.size / 2,
      powerUp.size / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    if (powerUp.type === "invincible") {
      ctx.fillText("★", powerUp.x + 3, powerUp.y + powerUp.size - 7);
    } else {
      ctx.fillText("+10", powerUp.x + 1, powerUp.y + powerUp.size - 7);
    }
  });

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 30);
  ctx.fillText("High Score: " + highScore, 10, 55);

  if (player.invincible) {
    ctx.fillStyle = "gold";
    ctx.font = "18px Arial";
    ctx.fillText(
      "Invincible: " + Math.ceil(player.invincibleTimer / 60) + "s",
      canvas.width - 190,
      30
    );
  }
}

function handleGameOver() {
  highScore = Math.max(score, highScore);
  setTimeout(() => {
    alert("Game Over! Your Score: " + score);
    resetGame();
  }, 100);
}

function resetGame() {
  player = {
    x: 50,
    y: GROUND_Y - 80,
    width: 40,
    height: 80,
    dy: 0,
    jumping: false,
    ducking: false,
    jumpTime: 0,
    grounded: false,
    coyoteTime: 0,
    color: "blue",
    invincible: false,
    invincibleTimer: 0,
  };
  obstacles = [];
  powerUps = [];
  frameCount = 0;
  score = 0;
  gameSpeed = 2.8;
  isGameOver = false;
  backgroundX = 0;
  gameLoop();
}

gameLoop();
