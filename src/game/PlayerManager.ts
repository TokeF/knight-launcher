import Phaser from "phaser";
import { UIManager } from "../ui/UIManager";
import { CAT_ENEMY, CAT_GROUND, CAT_OBSTACLE, CAT_PLAYER } from "../constants";

export class PlayerManager {
  private scene: Phaser.Scene;
  private uiManager: UIManager;

  public knight!: Phaser.Physics.Matter.Sprite;
  public ballista!: Phaser.GameObjects.Rectangle;
  public knightFollower!: Phaser.GameObjects.Zone;

  private launchAngle = -45;
  private launchPower = 0;
  private readonly maxLaunchPower = 100;
  private isCharging = false;
  private isKnightLaunched = false;
  private isKnightStopped = false;
  private maxDistance = 0;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spacebar!: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, uiManager: UIManager) {
    this.scene = scene;
    this.uiManager = uiManager;

    this.createPlayer();
    this.setupInput();
  }

  private createPlayer() {
    this.ballista = this.scene.add.rectangle(100, 540, 50, 20, 0x654321);
    this.knight = this.scene.matter.add.sprite(100, 510, "knight", undefined, {
      label: "knight",
      restitution: 0.5,
      friction: 0.01,
      collisionFilter: {
        category: CAT_PLAYER,
        mask: CAT_GROUND | CAT_OBSTACLE | CAT_ENEMY,
      },
    });
    this.knightFollower = this.scene.add.zone(
      this.knight.x,
      this.knight.y,
      30,
      50
    );
  }

  private setupInput() {
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    this.spacebar = this.scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );
  }

  public update() {
    this.handleInput();
    this.updateIndicators();

    if (this.isKnightLaunched) {
      this.knightFollower.setPosition(this.knight.x, this.knight.y);
      this.updateScore();
      this.checkKnightStatus();
    }
  }

  private handleInput() {
    if (this.isKnightStopped) {
      if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
        this.scene.scene.restart();
      }
      return;
    }

    if (this.isKnightLaunched) return;

    if (this.cursors.up.isDown) {
      this.launchAngle = Math.max(-90, this.launchAngle - 1);
    } else if (this.cursors.down.isDown) {
      this.launchAngle = Math.min(0, this.launchAngle + 1);
    }

    if (this.spacebar.isDown && !this.isCharging) {
      this.isCharging = true;
      this.launchPower = 0;
    } else if (this.spacebar.isDown && this.isCharging) {
      this.launchPower = Math.min(this.launchPower + 2, this.maxLaunchPower);
    } else if (!this.spacebar.isDown && this.isCharging) {
      this.launchKnight();
    }
  }

  private launchKnight() {
    this.isCharging = false;
    this.isKnightLaunched = true;

    const angleRad = Phaser.Math.DegToRad(this.launchAngle);
    const power = this.launchPower / 10;
    const velocityX = power * Math.cos(angleRad);
    const velocityY = power * Math.sin(angleRad);

    this.knight.setVelocity(velocityX, velocityY);


  }

  private updateScore() {
    const distance = Math.floor(this.knight.x - 100);
    if (distance > this.maxDistance) {
      this.maxDistance = distance;
      this.uiManager.updateScore(distance);
    }
  }

  private checkKnightStatus() {
    if (this.isKnightStopped || !this.knight.body) {
      return;
    }
    const velocity = (this.knight.body as any).velocity;
    if (!velocity) return;
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    const velocityThreshold = 0.1;

    if (speed < velocityThreshold) {
      this.isKnightStopped = true;
      this.uiManager.showResetText();
    }
  }

  private updateIndicators() {
    if (this.isKnightLaunched) {
      this.uiManager.hideLaunchIndicators();
      return;
    }

    this.uiManager.updateIndicators(
      this.launchAngle,
      this.launchPower,
      this.isCharging,
      this.maxLaunchPower,
      this.ballista.x,
      this.ballista.y
    );
  }


}
