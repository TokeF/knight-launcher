import Phaser from "phaser";

const CAT_PLAYER = 1 << 0;
const CAT_GROUND = 1 << 1;
const CAT_OBSTACLE = 1 << 2;
const CAT_ENEMY = 1 << 3;

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
  private enemyKnights!: Phaser.GameObjects.Group;
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
    const worldWidth = 3200;
    const worldHeight = 600;

    // Set camera and world bounds
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.matter.world.setBounds(0, 0, 3200, 600);

    this.createEnemyKnights();

    this.cameras.main.setBackgroundColor("#3498db"); // Sky blue

    // Create a much longer ground
    this.matter.add.rectangle(worldWidth / 2, 580, worldWidth, 40, {
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

    // Add obstacles
    this.matter.add.rectangle(1500, 555, 200, 10, {
      isStatic: true,
      label: "mud",
      collisionFilter: { category: CAT_OBSTACLE, mask: CAT_PLAYER },
      render: { fillColor: 0x654321 },
    });
    this.matter.add.rectangle(800, 540, 80, 80, {
      isStatic: true,
      label: "tent",
      collisionFilter: { category: CAT_OBSTACLE, mask: CAT_PLAYER },
      render: { fillColor: 0xffffff },
    });

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

    if (this.isKnightLaunched) {
      // Sync the invisible follower's position with the knight's physics body
      this.knightFollower.setPosition(this.knight.x, this.knight.y);

      this.updateScore();
      this.checkKnightStatus();
      this.updateEnemies();
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
        // Use setVelocity for a more direct and controllable bounce
        this.matter.body.setVelocity(knightBody, {
          x: knightBody.velocity.x * 1.8,
          y: knightBody.velocity.y * -1.8,
        });
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

  private createEnemyKnights() {
    this.enemyKnights = this.add.group();

    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(400, 3100);
      // Spawn enemies on the ground (ground top is 560, enemy height is 40, so center is 540)
      const enemy = this.matter.add.sprite(
        x,
        540,
        "enemy_knight_texture",
        undefined,
        {
          label: "enemy_knight",
          friction: 1,
          ignoreGravity: true,
          collisionFilter: {
            category: CAT_ENEMY,
            mask: CAT_PLAYER, // Only collides with the player
          },
        }
      );

      const direction = Phaser.Math.RND.pick([-1, 1]);
      const distance = Phaser.Math.Between(100, 300);
      enemy.setData("direction", direction);
      enemy.setData("moveUntilX", x + distance * direction);

      this.enemyKnights.add(enemy);
    }
  }

  private updateEnemies() {
    this.enemyKnights.getChildren().forEach((gameObject) => {
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
