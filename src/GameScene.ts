import Phaser from "phaser";
import { CAT_GROUND, CAT_PLAYER, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { UIManager } from "./ui/UIManager";
import { GameObjectManager } from "./game/GameObjectManager";
import { CollisionManager } from "./game/CollisionManager";
import { PlayerManager } from "./game/PlayerManager";
import { ParallaxLayer } from "./layers/ParallaxLayer";

export class GameScene extends Phaser.Scene {
  private uiManager!: UIManager;
  private playerManager!: PlayerManager;
  private gameObjectManager!: GameObjectManager;
  private collisionManager!: CollisionManager;

  private backgroundLayer!: ParallaxLayer;
  private middlegroundLayer!: ParallaxLayer;
  private foregroundLayer!: ParallaxLayer;

  private seed!: string;

  constructor() {
    super({ key: "GameScene" });
  }

  init() {
    this.registry.set("highScore", this.registry.get("highScore") || 0);
    this.seed = Phaser.Math.RND.uuid();
    Phaser.Math.RND.sow([this.seed]);

    if (this.cameras.main) {
      this.cameras.main.stopFollow();
      this.cameras.main.setScroll(0, 0);
    }
  }

  preload() {
    this.load.image("knight", "assets/knight.png");
    this.load.image("tent", "assets/tent.png");

    // Background images
    this.load.image("back1", "assets/background/back1.jpeg");
    this.load.image("back2", "assets/background/back2.jpeg");
    // Middleground
    this.load.image("middle", "assets/middleground/middle.png");
    // Foreground
    this.load.image("grass", "assets/foreground/grass.png");

    // Enemy knight walk animation
    this.load.spritesheet('enemy_knight_walk', 'assets/enemy_knight_walk.png', {
      frameWidth: 42,
      frameHeight: 42,
    });

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 20, 40);
    graphics.generateTexture("enemy_knight_texture", 20, 40);
    graphics.destroy();
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.matter.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#3498db");

    // Parallax layers
    this.backgroundLayer = new ParallaxLayer({
      scene: this,
      imageKeys: ["back1", "back2"],
      scrollFactor: 1,
      y: 600,
      tileWidth: 512,
      tileHeight: 300,
      worldWidth: WORLD_WIDTH,
      depth: -10,
    });
    this.middlegroundLayer = new ParallaxLayer({
      scene: this,
      imageKeys: ["middle"],
      scrollFactor: 0.9,
      y: 600,
      tileWidth: 512,
      tileHeight: 200,
      worldWidth: WORLD_WIDTH,
      depth: -9,
    });
    this.foregroundLayer = new ParallaxLayer({
      scene: this,
      imageKeys: ["grass"],
      scrollFactor: 0.8,
      y: 600,
      tileWidth: 512,
      tileHeight: 100,
      worldWidth: WORLD_WIDTH,
      depth: -8,
    });

    this.matter.add.rectangle(WORLD_WIDTH / 2, 580, WORLD_WIDTH, 40, {
      isStatic: true,
      label: "ground",
      collisionFilter: { category: CAT_GROUND, mask: CAT_PLAYER },
    });

    // Enemy knight walk animation
    if (!this.anims.exists('enemy_knight_walk')) {
      this.anims.create({
        key: 'enemy_knight_walk',
        frames: this.anims.generateFrameNumbers('enemy_knight_walk', { start: 0, end: 7 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    this.uiManager = new UIManager(this);
    this.playerManager = new PlayerManager(this, this.uiManager);
    this.gameObjectManager = new GameObjectManager(this);
    this.collisionManager = new CollisionManager(
      this.playerManager,
      this.gameObjectManager
    );

    this.cameras.main.startFollow(
      this.playerManager.knightFollower,
      true,
      0.08,
      0.08
    );

    this.matter.world.on("collisionstart", (event: any) => {
      this.collisionManager.handleCollision(event);
    });

    this.input.keyboard!.once("keydown", () => {
      if (this.uiManager && this.playerManager) {
        this.uiManager.hidePreGameButtons();
        this.playerManager.isGameStarted = true;
      }
    });
  }

  update() {
    // Update parallax layers first
    this.backgroundLayer.update(this.cameras.main);
    this.middlegroundLayer.update(this.cameras.main);
    this.foregroundLayer.update(this.cameras.main);

    this.playerManager.update();
    this.gameObjectManager.update(this.cameras.main);
  }
}
