import Phaser from 'phaser';

export class UIManager {
  private scene: Phaser.Scene;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private resetText!: Phaser.GameObjects.Text;
  private launchAngleIndicator!: Phaser.GameObjects.Line;
  private powerIndicator!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI() {
    // Score and High Score Text
    this.scoreText = this.scene.add
      .text(16, 16, 'Distance: 0', {
        fontSize: '32px',
        color: '#fff',
      })
      .setScrollFactor(0);

    const highScore = this.scene.registry.get('highScore') || 0;
    this.highScoreText = this.scene.add
      .text(784, 16, `High Score: ${highScore}`, {
        fontSize: '32px',
        color: '#fff',
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
  }

  public updateScore(distance: number) {
    this.scoreText.setText(`Distance: ${distance}`);
    const currentHighScore = this.scene.registry.get('highScore');
    if (distance > currentHighScore) {
      this.scene.registry.set('highScore', distance);
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
}
