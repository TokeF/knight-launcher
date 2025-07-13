import Phaser from "phaser";

export interface ParallaxLayerConfig {
  scene: Phaser.Scene;
  imageKeys: string[]; // Keys of loaded images
  scrollFactor: number; // 0 = static, 1 = camera speed
  y: number; // y-position of the layer
  tileWidth: number; // width of a single tile
  tileHeight: number; // height of a single tile
  worldWidth: number; // total width of the world
  depth: number; // z-depth (lower = further back)
}

export class ParallaxLayer {
  private scene: Phaser.Scene;
  private imageKeys: string[];
  private scrollFactor: number;
  private y: number;
  private tileWidth: number;
  private tileHeight: number;
  private worldWidth: number;
  private tiles: Phaser.GameObjects.Image[] = [];
  private group: Phaser.GameObjects.Group;
  private depth: number;

  constructor(config: ParallaxLayerConfig) {
    this.scene = config.scene;
    this.imageKeys = config.imageKeys;
    this.scrollFactor = config.scrollFactor;
    this.y = config.y;
    this.tileWidth = config.tileWidth;
    this.tileHeight = config.tileHeight;
    this.worldWidth = config.worldWidth;
    this.depth = config.depth;
    this.group = this.scene.add.group();
  }

  public update(camera: Phaser.Cameras.Scene2D.Camera) {
    // Compute which world coordinates are needed for tiles
    const margin = 2 * this.tileWidth;
    const visibleWorldLeft = camera.scrollX - margin;
    const visibleWorldRight = camera.scrollX + camera.width + margin;
    const firstTileIdx = Math.floor(visibleWorldLeft / this.tileWidth);
    const lastTileIdx = Math.ceil(visibleWorldRight / this.tileWidth);

    // Remove tiles whose worldX is out of the needed world range
    this.tiles = this.tiles.filter(tile => {
      const worldX = tile.getData('worldX');
      if (worldX < visibleWorldLeft || worldX > visibleWorldRight) {
        tile.destroy();
        return false;
      }
      return true;
    });

    // Add tiles if missing
    for (let i = firstTileIdx; i <= lastTileIdx; i++) {
      const worldX = i * this.tileWidth + this.tileWidth / 2;
      if (worldX < 0 || worldX > this.worldWidth) continue;
      // Use a tolerance for floating point errors
      if (!this.tiles.some(tile => Math.abs(tile.getData('worldX') - worldX) < 1)) {
        const key = this.imageKeys[i % this.imageKeys.length];
        const tile = this.scene.add.image(0, this.y, key);
        tile.setOrigin(0.5, 1);
        tile.setDisplaySize(this.tileWidth, this.tileHeight);
        tile.setDepth(this.depth);
        tile.setData('worldX', worldX);
        this.group.add(tile);
        this.tiles.push(tile);
      }
    }

    // Parallax rendering: offset for this layer
    const offset = camera.scrollX * (1 - this.scrollFactor);
    this.tiles.forEach(tile => {
      const worldX = tile.getData('worldX');
      tile.x = worldX - offset;
    });
  }

  public destroy() {
    this.tiles.forEach(tile => tile.destroy());
    this.tiles = [];
    this.group.clear(true, true);
  }
}
