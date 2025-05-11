// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Set canvas dimensions
canvas.width = 800;
canvas.height = 400;

// Constants for boundaries
const GROUND_Y = canvas.height; // Bottom of the canvas (ground level)
const CEILING_Y = 0; // Top of the canvas (ceiling level)

// Game variables
const gravity = 0.6;
const jumpForce = -12;
const maxJumpTime = 15;
const coyoteTimeLimit = 10;
const minGapMultiplier = 50; // Adjusted for difficulty scaling
const maxGapMultiplier = 150; // Adjusted for reasonable gaps

let player = {
  x: 50,
  y: GROUND_Y - 80, // Adjusted for double block height
  width: 40,
  height: 80, // Double block height
  dy: 0,
  jumping: false,
  ducking: false,
  jumpTime: 0,
  grounded: false,
  coyoteTime: 0
};

let obstacles = [];
let frameCount = 0;
let score = 0;
let highScore = 0;
let gameSpeed = 4;
let isGameOver = false;

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
    player.height = 40; // Reduce height while ducking
    player.y += 40; // Adjust position to stay on the ground
  }
});

document.addEventListener("keyup", (e) => {
  if (e.code === "Space") {
    player.jumping = false;
  }

  if (e.code === "ArrowDown") {
    player.ducking = false;
    player.height = 80; // Restore original height
    player.y -= 40; // Adjust position back
  }
});

// Game loop: Update and draw game elements
function gameLoop() {
  if (!isGameOver) {
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
  } else {
    handleGameOver();
  }
}

// Update game state
function updateGame() {
  frameCount++;

  // Update player position
  if (player.jumping && player.jumpTime < maxJumpTime) {
    player.dy += gravity / 2; // Allow controlled jump height
    player.jumpTime++;
  } else {
    player.dy += gravity; // Apply gravity
  }

  player.y += player.dy;

  // Prevent player from falling below ground
  if (player.y + player.height >= GROUND_Y) {
    player.y = GROUND_Y - player.height;
    player.dy = 0;
    player.grounded = true;
  }

  // Handle coyote time (allow jumping shortly after leaving ground)
  if (!player.grounded) {
    player.coyoteTime = Math.max(0, player.coyoteTime - 1);
  } else {
    player.coyoteTime = coyoteTimeLimit;
  }

  // Move and manage obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];
    obstacle.x -= gameSpeed;

    // Remove off-screen obstacles
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(i, 1); // Remove obstacle from the array
      score++;
      gameSpeed += 0.005; // Gradually increase game speed
    }

    // Collision detection
    if (
      player.x < obstacle.x + obstacle.width &&
      player.x + player.width > obstacle.x &&
      player.y < obstacle.y + obstacle.height &&
      player.y + player.height > obstacle.y
    ) {
      // Check if the player is ducking and the obstacle is "overhead"
      if (!(player.ducking && obstacle.type === "overhead")) {
        isGameOver = true;
      }
    }
  }

  // Generate new obstacles at a controlled rate
  if (frameCount % Math.max(50, 150 - gameSpeed * 10) === 0) {
    generateObstacle();
  }
}

// Generate obstacles
function generateObstacle() {
  const obstacleType = Math.random() < 0.5 ? "ground" : "overhead"; // Randomize type
  const obstacleHeight =
    obstacleType === "ground"
      ? Math.random() * 50 + 20
      : Math.random() * 30 + 20; // Adjusted height for overhead obstacles
  const obstacleY =
    obstacleType === "ground"
      ? GROUND_Y - obstacleHeight
      : GROUND_Y - 60 - obstacleHeight; // Overhead obstacles are closer to the player

  const minGap = minGapMultiplier / gameSpeed; // Minimum gap between obstacles
  const maxGap = maxGapMultiplier / gameSpeed; // Maximum gap between obstacles

  obstacles.push({
    x: canvas.width + Math.random() * (maxGap - minGap) + minGap,
    y: obstacleY,
    width: 30,
    height: obstacleHeight,
    type: obstacleType
  });
}

// Draw game elements
function drawGame() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw player
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw obstacles
  ctx.fillStyle = "red";
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // Draw score
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 10, 20);
  ctx.fillText("High Score: " + highScore, 10, 40);
}

// Handle game over
function handleGameOver() {
  highScore = Math.max(score, highScore);
  alert("Game Over! Your Score: " + score);
  resetGame();
}

// Reset game state
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
    coyoteTime: 0
  };
  obstacles = [];
  frameCount = 0;
  score = 0;
  gameSpeed = 4;
  isGameOver = false;
  gameLoop();
}

// Start the game
gameLoop();