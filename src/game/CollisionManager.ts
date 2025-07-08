import Phaser from "phaser";
import { PlayerManager } from "./PlayerManager";
import { GameObjectManager } from "./GameObjectManager";

export class CollisionManager {
  private playerManager: PlayerManager;
  private gameObjectManager: GameObjectManager;

  constructor(
    playerManager: PlayerManager,
    gameObjectManager: GameObjectManager
  ) {
    this.playerManager = playerManager;
    this.gameObjectManager = gameObjectManager;
  }

  public handleCollision(
    event: Phaser.Physics.Matter.Events.CollisionStartEvent
  ) {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair;

      const knightBody =
        bodyA.label === "knight"
          ? bodyA
          : bodyB.label === "knight"
          ? bodyB
          : null;
      const otherBody = bodyA === knightBody ? bodyB : bodyA;

      if (!knightBody || !otherBody.gameObject) {
        return;
      }

      const knight = this.playerManager.knight;
      const otherLabel = otherBody.label;

      switch (otherLabel) {
        case "ground":
          this.handleKnightGroundCollision(knight);
          break;
        case "tent":
          this.handleKnightTentCollision(knight);
          break;
        case "mud":
          this.handleKnightMudCollision(knight);
          break;
        case "enemy_knight":
          this.handleKnightEnemyCollision(knight, otherBody);
          break;
      }
    });
  }

  private handleKnightGroundCollision(knight: Phaser.Physics.Matter.Sprite) {
    if (!knight.body) return;
    const velocity = knight.body.velocity;
    if (velocity.y > 0.5) {
      knight.setVelocityY(-velocity.y * 0.8);
    }
  }

  private handleKnightTentCollision(knight: Phaser.Physics.Matter.Sprite) {
    if (!knight.body) return;
    const boost = 1.5;
    const velocity = knight.body.velocity;
    let xVelocity = Math.max(Math.abs(velocity.x * boost), 10);
    let yVelocity = Math.max(Math.abs(velocity.y * boost), 15);
    knight.setVelocity(xVelocity, -yVelocity);
  }

  private handleKnightMudCollision(knight: Phaser.Physics.Matter.Sprite) {
    if (!knight.body) return;
    const slowFactor = 0.3;
    knight.setVelocity(
      knight.body.velocity.x * slowFactor,
      knight.body.velocity.y * slowFactor
    );
  }

  private handleKnightEnemyCollision(
    knight: Phaser.Physics.Matter.Sprite,
    enemyBody: MatterJS.BodyType
  ) {
    if (!knight.body) return;
    const boost = 1.4;
    const velocity = knight.body.velocity;
    knight.setVelocity(velocity.x * boost, -Math.abs(velocity.y * boost));
    if (enemyBody.gameObject) {
      this.gameObjectManager.removeEnemy(enemyBody.gameObject);
    }
  }
}
