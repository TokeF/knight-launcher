import Phaser from 'phaser';
import { GameScene } from './GameScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    scene: [GameScene],
    physics: {
        default: 'matter',
        matter: {
            gravity: { x: 0, y: 0.9 },
            debug: true
        }
    }
};

new Phaser.Game(config);
