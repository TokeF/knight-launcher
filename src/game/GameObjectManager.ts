import Phaser from 'phaser';
import {
  CAT_ENEMY,
  CAT_OBSTACLE,
  CAT_PLAYER,
  MAX_OBSTACLE_ATTEMPTS,
  MIN_SPAWN_X,
  SPAWN_MARGIN,
  WORLD_WIDTH,
} from '../constants';

export class GameObjectManager {
  private scene: Phaser.Scene;
  private enemyDefinitions: { x: number; y: number; isSpawned: boolean }[] = [];
  private obstacleDefinitions: {
    x: number;
    y: number;
    type: 'tent' | 'mud';
    isSpawned: boolean;
  }[] = [];
  private activeEnemies: Phaser.GameObjects.Group;
  private activeObstacles: Phaser.GameObjects.Group;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.activeEnemies = this.scene.add.group();
    this.activeObstacles = this.scene.add.group();
    this.initializeEnemyDefinitions();
    this.initializeObstacleDefinitions();
  }

  private initializeEnemyDefinitions() {
    const numEnemies = 20;
    for (let i = 0; i < numEnemies; i++) {
      const x = Phaser.Math.Between(400, WORLD_WIDTH - 100);
      const y = 540; // Ground level
      this.enemyDefinitions.push({ x, y, isSpawned: false });
    }
  }

  private initializeObstacleDefinitions() {
    const minObstacleDistance = 150;
    const obstaclePositions: number[] = [];

    const generateObstaclePosition = () => {
      let x;
      let isValidPosition = false;
      let attempts = 0;
      const maxAttempts = MAX_OBSTACLE_ATTEMPTS;

      while (!isValidPosition && attempts < maxAttempts) {
        x = Phaser.Math.RND.between(MIN_SPAWN_X, WORLD_WIDTH - SPAWN_MARGIN);
        isValidPosition = true;
        for (const pos of obstaclePositions) {
          if (Math.abs(x - pos) < minObstacleDistance) {
            isValidPosition = false;
            break;
          }
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.warn(
          `Could not find a valid position for an obstacle after ${maxAttempts} attempts.`
        );
      }

      obstaclePositions.push(x!);
      return x!;
    };

    for (let i = 0; i < 10; i++) {
      const x = generateObstaclePosition();
      this.obstacleDefinitions.push({ x, y: 540, type: 'tent', isSpawned: false });
    }

    for (let i = 0; i < 5; i++) {
      const x = generateObstaclePosition();
      this.obstacleDefinitions.push({ x, y: 555, type: 'mud', isSpawned: false });
    }
  }

  public update(camera: Phaser.Cameras.Scene2D.Camera) {
    const worldView = camera.worldView;
    const spawnMargin = 500;
    const despawnMargin = 200;

    this.updateEnemies(worldView, spawnMargin, despawnMargin);
    this.updateObstacles(worldView, spawnMargin, despawnMargin);
    this.updateEnemiesAI();
  }

  private updateEnemies(worldView: Phaser.Geom.Rectangle, spawnMargin: number, despawnMargin: number) {
    this.enemyDefinitions.forEach((def, index) => {
      if (!def.isSpawned && def.x < worldView.right + spawnMargin && def.x > worldView.left - spawnMargin) {
        this.spawnEnemy(def.x, def.y, index);
        this.enemyDefinitions[index].isSpawned = true;
      }
    });

    this.activeEnemies.getChildren().forEach(enemy => {
      const enemySprite = enemy as Phaser.Physics.Matter.Sprite;
      if (enemySprite.x < worldView.left - despawnMargin || enemySprite.x > worldView.right + despawnMargin) {
        const defIndex = enemySprite.getData('defIndex');
        if (this.enemyDefinitions[defIndex]) {
          this.enemyDefinitions[defIndex].isSpawned = false;
        }
        enemySprite.destroy();
      }
    });
  }

  private updateObstacles(worldView: Phaser.Geom.Rectangle, spawnMargin: number, despawnMargin: number) {
    this.obstacleDefinitions.forEach((def, index) => {
      if (!def.isSpawned && def.x < worldView.right + spawnMargin && def.x > worldView.left - spawnMargin) {
        this.spawnObstacle(def, index);
        this.obstacleDefinitions[index].isSpawned = true;
      }
    });

    this.activeObstacles.getChildren().forEach(obstacle => {
      const obstacleSprite = obstacle as Phaser.GameObjects.Rectangle;
      if (obstacleSprite.x < worldView.left - despawnMargin || obstacleSprite.x > worldView.right + despawnMargin) {
        const defIndex = obstacleSprite.getData('defIndex');
        if (this.obstacleDefinitions[defIndex]) {
          this.obstacleDefinitions[defIndex].isSpawned = false;
        }
        obstacleSprite.destroy();
      }
    });
  }

  public removeEnemy(enemy: Phaser.GameObjects.GameObject) {
    const enemySprite = enemy as Phaser.Physics.Matter.Sprite;
    const defIndex = enemySprite.getData('defIndex');
    if (defIndex !== undefined && this.enemyDefinitions[defIndex]) {
      this.enemyDefinitions[defIndex].isSpawned = false;
    }
    this.activeEnemies.remove(enemySprite, true, true);
  }

  private spawnEnemy(x: number, y: number, defIndex: number) {
    const enemy = this.scene.matter.add.sprite(x, y, 'enemy_knight_texture', undefined, {
      label: 'enemy_knight',
      friction: 1,
      ignoreGravity: true,
      collisionFilter: {
        category: CAT_ENEMY,
        mask: CAT_PLAYER,
      },
    });

    enemy.setData('defIndex', defIndex);
    enemy.setData('direction', Phaser.Math.RND.pick([-1, 1]));
    enemy.setData('moveUntilX', x + Phaser.Math.Between(100, 300) * enemy.getData('direction'));
    this.activeEnemies.add(enemy);
  }

  private spawnObstacle(def: { x: number; y: number; type: 'tent' | 'mud' }, defIndex: number) {
    const width = def.type === 'tent' ? 80 : 200;
    const height = def.type === 'tent' ? 80 : 10;
    const fillColor = def.type === 'tent' ? 0xffffff : 0x654321;

    const obstacle = this.scene.add.rectangle(def.x, def.y, width, height, fillColor);
    this.scene.matter.add.gameObject(obstacle, {
      isStatic: true,
      label: def.type,
      collisionFilter: { category: CAT_OBSTACLE, mask: CAT_PLAYER },
    });

    obstacle.setData('defIndex', defIndex);
    this.activeObstacles.add(obstacle);
  }

  private updateEnemiesAI() {
    this.activeEnemies.getChildren().forEach(gameObject => {
      const enemy = gameObject as Phaser.Physics.Matter.Sprite;
      const speed = 1.5;
      const direction = enemy.getData('direction');
      const moveUntilX = enemy.getData('moveUntilX');

      enemy.setVelocityX(speed * direction);
      enemy.setVelocityY(0);

      if ((direction === 1 && enemy.x >= moveUntilX) || (direction === -1 && enemy.x <= moveUntilX)) {
        const newDirection = Phaser.Math.RND.pick([-1, 1]);
        const newDistance = Phaser.Math.Between(100, 300);
        enemy.setData('direction', newDirection);
        enemy.setData('moveUntilX', enemy.x + newDistance * newDirection);
      }
    });
  }
}
