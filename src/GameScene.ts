import Phaser from "phaser";
import {
  CAT_ENEMY,
  CAT_GROUND,
  CAT_OBSTACLE,
  CAT_PLAYER,
  MAX_OBSTACLE_ATTEMPTS,
  MIN_SPAWN_X,
  SPAWN_MARGIN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";

export class GameScene extends Phaser.Scene {
  private knight!: Phaser.Physics.Matter.Sprite;
  private ballista!: Phaser.GameObjects.Rectangle;
  private launchAngle = -45;
  private launchPower = 0;
  private readonly maxLaunchPower = 100;
  private isCharging = false;
  private isKnightLaunched = false;
  private isKnightStopped = false;
  private canCheckStop = false;
  private isFirstUpdate = true;
  private knightFollower!: Phaser.GameObjects.Zone;

  private maxDistance = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private seed!: string;
  private enemyDefinitions: { x: number; y: number; isSpawned: boolean }[] = [];
  private obstacleDefinitions: {
    x: number;
    y: number;
    type: "tent" | "mud";
    isSpawned: boolean;
  }[] = [];
  private activeEnemies!: Phaser.GameObjects.Group;
  private activeObstacles!: Phaser.GameObjects.Group;
  private resetText!: Phaser.GameObjects.Text;

  private launchAngleIndicator!: Phaser.GameObjects.Line;
  private powerIndicator!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spacebar!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    this.registry.set("highScore", this.registry.get("highScore") || 0);

    // Initialize with a new random seed for each game
    this.seed = Phaser.Math.RND.uuid();
    Phaser.Math.RND.sow([this.seed]);

    this.enemyDefinitions = [];
    this.obstacleDefinitions = [];

    this.launchAngle = -45;
    this.launchPower = 0;
    this.isCharging = false;
    this.isKnightLaunched = false;
    this.isKnightStopped = false;
    this.canCheckStop = false;
    this.maxDistance = 0;
    this.isFirstUpdate = true;

    if (this.cameras.main) {
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
    }
  }

  preload() {
    this.load.image("knight", "assets/knight.png");

    // Create a texture for the enemy knights
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 20, 40);
    graphics.generateTexture("enemy_knight_texture", 20, 40);
    graphics.destroy();
  }

  create() {


    // Set camera and world bounds
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.matter.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.initializeEnemyDefinitions();
    this.initializeObstacleDefinitions();
    this.activeEnemies = this.add.group();
    this.activeObstacles = this.add.group();

    this.cameras.main.setBackgroundColor("#3498db"); // Sky blue

    // Create a much longer ground
        this.matter.add.rectangle(WORLD_WIDTH / 2, 580, WORLD_WIDTH, 40, {
      isStatic: true,
      label: "ground",
      collisionFilter: { category: CAT_GROUND, mask: CAT_PLAYER },
    });
    this.ballista = this.add.rectangle(100, 540, 100, 20, 0x666666);
    this.knight = this.matter.add.sprite(100, 530, "knight", undefined, {
      label: "knight",
      friction: 0.1, // Add some friction
      collisionFilter: {
        category: CAT_PLAYER,
        mask: CAT_GROUND | CAT_OBSTACLE | CAT_ENEMY,
      },
    });

    // Create an invisible follower game object for the camera to track
    this.knightFollower = this.add.zone(this.knight.x, this.knight.y, 30, 50);

    this.launchAngleIndicator = this.add
      .line(this.ballista.x, this.ballista.y, 0, 0, 100, 0, 0xffffff)
      .setOrigin(0, 0.5);
    this.powerIndicator = this.add.graphics();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spacebar = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    // UI Elements (HUD)
    this.scoreText = this.add
      .text(16, 16, "Distance: 0", {
        fontSize: "32px",
        color: "#fff",
      })
      .setScrollFactor(0); // Fix to camera

    const highScore = this.registry.get("highScore");
    this.highScoreText = this.add
      .text(784, 16, `High Score: ${highScore}`, {
        fontSize: "32px",
        color: "#fff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    this.resetText = this.add
      .text(400, 300, "Press Space to Reset", {
        fontSize: "48px",
        color: "#fff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0) // Fix to camera
      .setVisible(false);

    this.matter.world.on("collisionstart", this.handleCollision, this);
  }

  update() {
    if (this.isFirstUpdate) {
      this.isFirstUpdate = false;
      return; // Skip the entire first update frame to prevent input bleed.
    }

    this.handleInput();
    this.updateIndicators();

    this.updateWorldObjects();
    this.updateEnemiesAI();
    if (this.isKnightLaunched) {
      // Sync the invisible follower's position with the knight's physics body
      this.knightFollower.setPosition(this.knight.x, this.knight.y);

      this.updateScore();
      this.checkKnightStatus();
    }
  }

  private handleCollision(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent
  ) {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;

      const knightBody =
        bodyA.label === "knight"
          ? bodyA
          : bodyB.label === "knight"
          ? bodyB
          : null;
      if (!knightBody) return;

      const otherLabel = bodyA.label === "knight" ? bodyB.label : bodyA.label;

      if (otherLabel === "mud") {
        // Correctly apply velocity change to the colliding body
        this.matter.body.setVelocity(knightBody, {
          x: knightBody.velocity.x * 0.5,
          y: knightBody.velocity.y,
        });
      } else if (otherLabel === "tent") {
        // Add a constant velocity to boost even when player is slow
        this.matter.body.setVelocity(knightBody, { x: 10, y: -15 });
      } else if (otherLabel === "ground") {
        // Apply a controlled bounce off the ground
        this.matter.body.setVelocity(knightBody, {
          x: knightBody.velocity.x * 0.8, // Dampen horizontal movement
          y: knightBody.velocity.y * -0.8, // Reverse and dampen vertical movement
        });
      } else if (otherLabel === "enemy_knight") {
        const enemyBody = bodyA.label === "enemy_knight" ? bodyA : bodyB;
        const enemyObject = enemyBody.gameObject as Phaser.GameObjects.Sprite;

        // Apply a boost on enemy collision
        this.matter.body.setVelocity(knightBody, {
          x: knightBody.velocity.x * 1.4,
          y: knightBody.velocity.y * -1.4,
        });

        // Remove the enemy knight
        if (enemyObject) {
          enemyObject.destroy();
        }
      }
    }
  }

  private initializeEnemyDefinitions() {
    const numEnemies = 20;
    for (let i = 0; i < numEnemies; i++) {
            const x = Phaser.Math.Between(400, WORLD_WIDTH - 100);
      const y = 540; // Ground level
      this.enemyDefinitions.push({ x, y, isSpawned: false });
    }
  }

  private initializeObstacleDefinitions() {
    const worldWidth = 3200;
    const minObstacleDistance = 150;
    const obstaclePositions: number[] = [];

    const generateObstaclePosition = () => {
      let x;
      let isValidPosition = false;
      let attempts = 0;
      const maxAttempts = MAX_OBSTACLE_ATTEMPTS; // Failsafe to prevent infinite loop

      while (!isValidPosition && attempts < maxAttempts) {
        x = Phaser.Math.RND.between(MIN_SPAWN_X, WORLD_WIDTH - SPAWN_MARGIN);
        isValidPosition = true;
        for (const pos of obstaclePositions) {
          if (Math.abs(x - pos) < minObstacleDistance) {
            isValidPosition = false;
            break;
          }
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn(
          `Could not find a valid position for an obstacle after ${maxAttempts} attempts. Placing it anyway.`
        );
      }

      obstaclePositions.push(x!);
      return x!;
    };

    // 10 Tents
    for (let i = 0; i < 10; i++) {
      const x = generateObstaclePosition();
      this.obstacleDefinitions.push({
        x,
        y: 540,
        type: "tent",
        isSpawned: false,
      });
    }

    // 5 Mud Pits
    for (let i = 0; i < 5; i++) {
      const x = generateObstaclePosition();
      this.obstacleDefinitions.push({
        x,
        y: 555,
        type: "mud",
        isSpawned: false,
      });
    }
  }

  private updateWorldObjects() {
    const camera = this.cameras.main;
    const worldView = camera.worldView;
    const spawnMargin = 500; // Distance ahead of the camera to spawn objects
    const despawnMargin = 200; // Distance behind the camera to despawn objects

    // Spawn enemies
    this.enemyDefinitions.forEach((def, index) => {
      if (
        !def.isSpawned &&
        def.x < worldView.right + spawnMargin &&
        def.x > worldView.left - spawnMargin
      ) {
        this.spawnEnemy(def.x, def.y, index);
        def.isSpawned = true;
      }
    });

    // Despawn enemies
    this.activeEnemies.getChildren().forEach((enemy) => {
      const enemySprite = enemy as Phaser.Physics.Matter.Sprite;
      if (
        enemySprite.x < worldView.left - despawnMargin ||
        enemySprite.x > worldView.right + despawnMargin
      ) {
        const defIndex = enemySprite.getData("defIndex");
        if (this.enemyDefinitions[defIndex]) {
          this.enemyDefinitions[defIndex].isSpawned = false;
        }
        enemySprite.destroy();
      }
    });

    // Spawn obstacles
    this.obstacleDefinitions.forEach((def, index) => {
      if (
        !def.isSpawned &&
        def.x < worldView.right + spawnMargin &&
        def.x > worldView.left - spawnMargin
      ) {
        this.spawnObstacle(def, index);
        this.obstacleDefinitions[index].isSpawned = true;
      }
    });

    // Despawn obstacles
    this.activeObstacles.getChildren().forEach((obstacle) => {
      const obstacleSprite = obstacle as Phaser.GameObjects.Rectangle;
      if (
        obstacleSprite.x < worldView.left - despawnMargin ||
        obstacleSprite.x > worldView.right + despawnMargin
      ) {
        const defIndex = obstacleSprite.getData("defIndex");
        if (this.obstacleDefinitions[defIndex]) {
          this.obstacleDefinitions[defIndex].isSpawned = false;
        }
        obstacleSprite.destroy();
      }
    });
  }

  private spawnEnemy(x: number, y: number, defIndex: number) {
    const enemy = this.matter.add.sprite(
      x,
      y,
      "enemy_knight_texture",
      undefined,
      {
        label: "enemy_knight",
        friction: 1,
        ignoreGravity: true,
        collisionFilter: {
          category: CAT_ENEMY,
          mask: CAT_PLAYER,
        },
      }
    );

    enemy.setData("defIndex", defIndex);
    enemy.setData("direction", Phaser.Math.RND.pick([-1, 1]));
    enemy.setData(
      "moveUntilX",
      x + Phaser.Math.Between(100, 300) * enemy.getData("direction")
    );
    this.activeEnemies.add(enemy);
  }

  private spawnObstacle(
    def: { x: number; y: number; type: "tent" | "mud" },
    defIndex: number
  ) {
    const width = def.type === "tent" ? 80 : 200;
    const height = def.type === "tent" ? 80 : 10;
    const fillColor = def.type === "tent" ? 0xffffff : 0x654321;

    const obstacle = this.add.rectangle(def.x, def.y, width, height, fillColor);
    this.matter.add.gameObject(obstacle, {
      isStatic: true,
      label: def.type,
      collisionFilter: { category: CAT_OBSTACLE, mask: CAT_PLAYER },
    });

    obstacle.setData("defIndex", defIndex);
    this.activeObstacles.add(obstacle);
  }

  private updateEnemiesAI() {
    this.activeEnemies.getChildren().forEach((gameObject) => {
      const enemy = gameObject as Phaser.Physics.Matter.Sprite;
      const speed = 1.5;
      const direction = enemy.getData("direction");
      const moveUntilX = enemy.getData("moveUntilX");

      enemy.setVelocityX(speed * direction);
      enemy.setVelocityY(0); // Ensure no vertical movement

      if (
        (direction === 1 && enemy.x >= moveUntilX) ||
        (direction === -1 && enemy.x <= moveUntilX)
      ) {
        const newDirection = Phaser.Math.RND.pick([-1, 1]);
        const newDistance = Phaser.Math.Between(100, 300);
        enemy.setData("direction", newDirection);
        enemy.setData("moveUntilX", enemy.x + newDistance * newDirection);
      }
    });
  }

  private handleInput() {
    // State-based input handling
    if (this.isKnightStopped) {
      // STATE: Knight has stopped, waiting for reset
      if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
        this.scene.restart();
      }
    } else if (!this.isKnightLaunched) {
      // STATE: Pre-launch, ready to aim and fire
      if (this.cursors.up.isDown) {
        this.launchAngle = Math.max(-90, this.launchAngle - 1);
      } else if (this.cursors.down.isDown) {
        this.launchAngle = Math.min(0, this.launchAngle + 1);
      }

      if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
        this.isCharging = true;
        this.launchPower = 0;
      }

      if (this.isCharging && this.spacebar.isDown) {
        this.launchPower = Math.min(this.launchPower + 1, this.maxLaunchPower);
      }

      if (Phaser.Input.Keyboard.JustUp(this.spacebar)) {
        if (this.isCharging) {
          this.isCharging = false;
          this.isKnightLaunched = true;
          this.launchKnight();
        }
      }
    }
    // STATE: Knight is launched and in the air. No input is handled.
  }

  private launchKnight() {
    const angleRad = Phaser.Math.DegToRad(this.launchAngle);
    const forceMagnitude = this.launchPower / 300;
    const force = new Phaser.Math.Vector2(
      Math.cos(angleRad),
      Math.sin(angleRad)
    ).scale(forceMagnitude);
    this.knight.applyForce(force);

    // Wait half a second before checking if the knight has stopped
    this.time.delayedCall(500, () => {
      this.canCheckStop = true;
    });

    // Make the camera follow the invisible knight follower
    this.cameras.main.startFollow(this.knightFollower, true, 0.08, 0.08);
  }

  private updateScore() {
    // Calculate horizontal distance from the starting line (100)
    const distance = Math.floor(this.knight.x - 100);
    if (distance > this.maxDistance) {
      this.maxDistance = distance;
      this.scoreText.setText(`Distance: ${distance}`);

      const highScore = this.registry.get("highScore");
      if (distance > highScore) {
        this.registry.set("highScore", distance);
        this.highScoreText.setText(`High Score: ${distance}`);
      }
    }
  }

  private checkKnightStatus() {
    if (this.isKnightStopped || !this.canCheckStop || !this.knight.body) {
      return;
    }

    // The type definitions for MatterJS are inconsistent, so we cast to 'any'
    // to bypass the compiler and access the velocity, which we know exists on a dynamic body.
    const velocity = (this.knight.body as any).velocity;
    if (!velocity) return;

    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const velocityThreshold = 0.1;

    if (speed < velocityThreshold) {
      this.isKnightStopped = true;
      this.resetText.setVisible(true);
    }
  }

  private updateIndicators() {
    if (this.isKnightLaunched) {
      this.launchAngleIndicator.setVisible(false);
      this.powerIndicator.clear();
      return;
    }

    this.launchAngleIndicator.setRotation(
      Phaser.Math.DegToRad(this.launchAngle)
    );

    this.powerIndicator.clear();
    if (this.isCharging) {
      this.powerIndicator.fillStyle(0x00ff00, 1);
      this.powerIndicator.fillRect(
        this.ballista.x - 50,
        this.ballista.y + 20,
        this.launchPower,
        10
      );
    }
  }
}
