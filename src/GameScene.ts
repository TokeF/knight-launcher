import Phaser from "phaser";
import { CAT_GROUND, CAT_PLAYER, WORLD_HEIGHT, WORLD_WIDTH } from "./constants";
import { UIManager } from "./ui/UIManager";
import { GameObjectManager } from "./game/GameObjectManager";
import { CollisionManager } from "./game/CollisionManager";
import { PlayerManager } from "./game/PlayerManager";

export class GameScene extends Phaser.Scene {
  private uiManager!: UIManager;
  private playerManager!: PlayerManager;
  private gameObjectManager!: GameObjectManager;
  private collisionManager!: CollisionManager;

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

    this.matter.add.rectangle(WORLD_WIDTH / 2, 580, WORLD_WIDTH, 40, {
      isStatic: true,
      label: "ground",
      collisionFilter: { category: CAT_GROUND, mask: CAT_PLAYER },
    });

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
    this.playerManager.update();
    this.gameObjectManager.update(this.cameras.main);
  }
}
