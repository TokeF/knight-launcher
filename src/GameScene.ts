import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    private knight!: MatterJS.BodyType;
    private ballista!: Phaser.GameObjects.Rectangle;
    private launchAngle = -45;
    private launchPower = 0;
    private readonly maxLaunchPower = 100;
    private isCharging = false;
    private isKnightLaunched = false;

    private launchAngleIndicator!: Phaser.GameObjects.Line;
    private powerIndicator!: Phaser.GameObjects.Graphics;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private spacebar!: Phaser.Input.Keyboard.Key;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // No assets to preload yet
    }

    create() {
        this.matter.add.rectangle(400, 580, 800, 40, { isStatic: true, label: 'ground' });
        this.ballista = this.add.rectangle(100, 540, 100, 20, 0x666666);
        this.knight = this.matter.add.rectangle(100, 520, 30, 50, { label: 'knight' });

        // Add obstacles
        this.matter.add.rectangle(450, 570, 150, 20, { isStatic: true, label: 'mud', render: { fillColor: 0x654321 } });
        this.matter.add.rectangle(650, 540, 100, 20, { isStatic: true, label: 'tent', angle: Phaser.Math.DegToRad(-15), render: { fillColor: 0xffffff } });

        this.launchAngleIndicator = this.add.line(this.ballista.x, this.ballista.y, 0, 0, 100, 0, 0xffffff).setOrigin(0, 0.5);
        this.powerIndicator = this.add.graphics();

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.spacebar = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.matter.world.on('collisionstart', this.handleCollision, this);
    }

    update() {
        this.handleInput();
        this.updateIndicators();
    }

    private handleCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
        event.pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;

            const knightBody = bodyA.label === 'knight' ? bodyA : (bodyB.label === 'knight' ? bodyB : null);
            if (!knightBody) return;

            const otherLabel = bodyA.label === 'knight' ? bodyB.label : bodyA.label;

            if (otherLabel === 'mud') {
                this.matter.body.setVelocity(this.knight, { x: this.knight.velocity.x * 0.5, y: this.knight.velocity.y });
            } else if (otherLabel === 'tent') {
                this.matter.applyForce(this.knight, { x: 0, y: -0.02 });
            }
        });
    }

    private handleInput() {
        if (this.isKnightLaunched) return;

        if (this.cursors.up.isDown) {
            this.launchAngle = Math.max(-90, this.launchAngle - 1);
        } else if (this.cursors.down.isDown) {
            this.launchAngle = Math.min(0, this.launchAngle + 1);
        }

        if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
            this.isCharging = true;
            this.launchPower = 0;
        }

        if (this.isCharging && this.spacebar.isDown) {
            this.launchPower = Math.min(this.launchPower + 1, this.maxLaunchPower);
        }

        if (Phaser.Input.Keyboard.JustUp(this.spacebar)) {
            this.isCharging = false;
            this.isKnightLaunched = true;
            this.launchKnight();
        }
    }

    private launchKnight() {
        const angleRad = Phaser.Math.DegToRad(this.launchAngle);
        const forceMagnitude = this.launchPower / 2000;
        const force = new Phaser.Math.Vector2(Math.cos(angleRad), Math.sin(angleRad)).scale(forceMagnitude);
        this.matter.applyForce(this.knight, force);
    }

    private updateIndicators() {
        if (this.isKnightLaunched) {
            this.launchAngleIndicator.setVisible(false);
            this.powerIndicator.clear();
            return;
        }

        this.launchAngleIndicator.setRotation(Phaser.Math.DegToRad(this.launchAngle));

        this.powerIndicator.clear();
        this.powerIndicator.fillStyle(0x00ff00, 1);
        this.powerIndicator.fillRect(this.ballista.x - 50, this.ballista.y + 20, this.launchPower, 10);
    }
}
