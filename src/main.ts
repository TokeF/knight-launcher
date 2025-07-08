import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { MainMenuScene } from './MainMenuScene';
import { ShopScene } from './ShopScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 600,
    parent: 'game-container',
    scene: [MainMenuScene, GameScene, ShopScene],
    physics: {
        default: 'matter',
        matter: {
            gravity: { x: 0, y: 0.9 },
            debug: true
        }
    }
};

new Phaser.Game(config);
