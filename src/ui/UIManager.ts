import Phaser from 'phaser';
import { PlayerData } from '../data/PlayerData';

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private launchAngleIndicator!: Phaser.GameObjects.Line;
  private powerIndicator!: Phaser.GameObjects.Graphics;
  private resetText!: Phaser.GameObjects.Text;
  private mainMenuButton!: Phaser.GameObjects.Text;
  private shopButton!: Phaser.GameObjects.Text;

  private smashShieldText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI() {
    // Smash Shield indicator (initially hidden)
    this.smashShieldText = this.scene.add.text(
      16,
      60,
      'Shield smashes x10',
      {
        fontSize: '28px',
        color: '#00ffff',
        fontStyle: 'bold',
        stroke: '#003355',
        strokeThickness: 4,
      }
    ).setOrigin(0, 0).setScrollFactor(0).setVisible(false);

    // Score and High Score Text
    this.scoreText = this.scene.add
      .text(16, 16, 'Distance: 0', {
        fontSize: '32px',
        color: '#fff',
      })
      .setScrollFactor(0);

    const highScore = PlayerData.getInstance().getHighScore();
    this.highScoreText = this.scene.add
      .text(784, 16, `High Score: ${highScore}`, {
        fontSize: '32px',
        color: '#ffd700',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);

    // Reset Text (initially hidden)
    this.resetText = this.scene.add
      .text(400, 300, 'Press Space to Reset', {
        fontSize: '48px',
        color: '#fff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    // Launch Indicators
    this.launchAngleIndicator = this.scene.add
      .line(100, 540, 0, 0, 100, 0, 0xffffff)
      .setOrigin(0, 0.5);
    this.powerIndicator = this.scene.add.graphics();

    // Pre-game buttons
    this.mainMenuButton = this.scene.add.text(this.scene.cameras.main.width / 2, 250, 'Main Menu', {
      fontSize: '48px',
      color: '#fff',
    }).setOrigin(0.5).setInteractive().setScrollFactor(0);
    this.mainMenuButton.on('pointerdown', () => this.scene.scene.start('MainMenuScene'));

    this.shopButton = this.scene.add.text(this.scene.cameras.main.width / 2, 350, 'Shop', {
      fontSize: '48px',
      color: '#ff0',
    }).setOrigin(0.5).setInteractive().setScrollFactor(0);
    this.shopButton.on('pointerdown', () => this.scene.scene.start('ShopScene'));
  }

  public hidePreGameButtons() {
    this.mainMenuButton.setVisible(false);
    this.shopButton.setVisible(false);
  }

  public updateScore(distance: number) {
    this.scoreText.setText(`Distance: ${distance}`);
    const currentHighScore = PlayerData.getInstance().getHighScore();
    if (distance > currentHighScore) {
      this.highScoreText.setText(`High Score: ${distance}`);
    }
  }

  public showResetText() {
    this.resetText.setVisible(true);
  }

  public updateIndicators(launchAngle: number, launchPower: number, isCharging: boolean, maxLaunchPower: number, ballistaX: number, ballistaY: number) {
    this.launchAngleIndicator.setRotation(Phaser.Math.DegToRad(launchAngle));

    this.powerIndicator.clear();
    if (isCharging) {
      const powerBarWidth = 100; // The max visual width of the power bar
      const currentPowerWidth = (launchPower / maxLaunchPower) * powerBarWidth;

      this.powerIndicator.fillStyle(0x00ff00, 1);
      this.powerIndicator.fillRect(
        ballistaX - 50,
        ballistaY + 20,
        currentPowerWidth,
        10
      );
    }
  }

  public hideLaunchIndicators() {
    this.launchAngleIndicator.setVisible(false);
    this.powerIndicator.clear();
  }

  public showSmashShieldIndicator(count: number) {
    this.smashShieldText.setText(`Shield smashes x${count}`);
    this.smashShieldText.setVisible(true);
  }

  public hideSmashShieldIndicator() {
    this.smashShieldText.setVisible(false);
  }
}
