import Phaser from 'phaser';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    this.add
      .text(this.cameras.main.width / 2, 150, 'Knight Launcher', {
        fontSize: '64px',
        color: '#fff',
      })
      .setOrigin(0.5);

    const playButton = this.add
      .text(this.cameras.main.width / 2, 300, 'Play', {
        fontSize: '48px',
        color: '#0f0',
      })
      .setOrigin(0.5)
      .setInteractive();

    playButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    const shopButton = this.add
      .text(this.cameras.main.width / 2, 400, 'Shop', {
        fontSize: '48px',
        color: '#ff0',
      })
      .setOrigin(0.5)
      .setInteractive();

    shopButton.on('pointerdown', () => {
      this.scene.start('ShopScene');
    });
  }
}
