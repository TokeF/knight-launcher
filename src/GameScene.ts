import Phaser from "phaser";

export class GameScene extends Phaser.Scene {
  private knight!: MatterJS.BodyType;
  private ballista!: Phaser.GameObjects.Rectangle;
  private launchAngle = -45;
  private launchPower = 0;
  private readonly maxLaunchPower = 200;
  private isCharging = false;
  private isKnightLaunched = false;
  private isKnightStopped = false;
  private canCheckStop = false;
  private isFirstUpdate = true;
  private knightFollower!: Phaser.GameObjects.Zone;

  private maxDistance = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private resetText!: Phaser.GameObjects.Text;

  private launchAngleIndicator!: Phaser.GameObjects.Line;
  private powerIndicator!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spacebar!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: "GameScene" });
  }

  init() {
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
    // No assets to preload yet
  }

  create() {
    const worldWidth = 3200;
    const worldHeight = 600;

    // Set camera and world bounds
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.matter.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBackgroundColor("#3498db"); // Sky blue

    // Create a much longer ground
    this.matter.add.rectangle(worldWidth / 2, 580, worldWidth, 40, {
      isStatic: true,
      label: "ground",
    });
    this.ballista = this.add.rectangle(100, 540, 100, 20, 0x666666);
    this.knight = this.matter.add.rectangle(100, 520, 30, 50, {
      label: "knight",
      restitution: 0.95, // Make the knight bouncy
      friction: 0.1, // Add some friction
    });

    // Create an invisible follower game object for the camera to track
    this.knightFollower = this.add.zone(
      this.knight.position.x,
      this.knight.position.y,
      30,
      50
    );

    // Add obstacles
    this.matter.add.rectangle(450, 570, 150, 20, {
      isStatic: true,
      label: "mud",
      render: { fillColor: 0x654321 },
    });
    this.matter.add.rectangle(650, 540, 100, 20, {
      isStatic: true,
      label: "tent",
      angle: Phaser.Math.DegToRad(-15),
      render: { fillColor: 0xffffff },
      restitution: 1.2, // Make the tent extra bouncy
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
      this.knightFollower.setPosition(
        this.knight.position.x,
        this.knight.position.y
      );

      this.updateScore();
      this.checkKnightStatus();
    }
  }

  private handleCollision(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent
  ) {
    event.pairs.forEach((pair) => {
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
        this.matter.body.setVelocity(this.knight, {
          x: this.knight.velocity.x * 0.5,
          y: this.knight.velocity.y,
        });
      } else if (otherLabel === "tent") {
        // The bounce is now handled by the tent's restitution property
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
    const forceMagnitude = this.launchPower / 2000;
    const force = new Phaser.Math.Vector2(
      Math.cos(angleRad),
      Math.sin(angleRad)
    ).scale(forceMagnitude);
    this.matter.applyForce(this.knight, force);

    // Wait half a second before checking if the knight has stopped
    this.time.delayedCall(500, () => {
      this.canCheckStop = true;
    });

    // Make the camera follow the invisible knight follower
    this.cameras.main.startFollow(this.knightFollower, true, 0.08, 0.08);
  }

  private updateScore() {
    const distance = Math.floor(this.knight.position.x - this.ballista.x);
    if (distance > this.maxDistance) {
      this.maxDistance = distance;
      this.scoreText.setText(`Distance: ${this.maxDistance}`);
    }
  }

  private checkKnightStatus() {
    if (this.isKnightStopped || !this.canCheckStop) return;

    const speed = this.knight.speed;
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
