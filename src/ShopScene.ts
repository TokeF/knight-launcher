import Phaser from "phaser";
import { PlayerData } from "./data/PlayerData";

interface ShopItem {
  name: string;
  imageKey: string;
  stats: string;
  description: string;
  cost: number;
}

export class ShopScene extends Phaser.Scene {
  private coinsText!: Phaser.GameObjects.Text;
  private items: ShopItem[] = [
    {
      name: "Greasy Shield",
      imageKey: "item_placeholder",
      stats: "-Friction",
      description: "So slippery, you'll slide for days.",
      cost: 50,
    },
    {
      name: "Feather-light Tunic",
      imageKey: "item_placeholder",
      stats: "+Speed, -Friction",
      description: "A light tunic that lets you glide through the air with ease.",
      cost: 100,
    },
    {
      name: "Spiked Helmet",
      imageKey: "item_placeholder",
      stats: "+Damage",
      description: "A pointy helmet. Good for breaking things.",
      cost: 150,
    },
    {
      name: "Boots of Bouncing",
      imageKey: "item_placeholder",
      stats: "+Bounce",
      description: "These boots are made for bouncing! Reach new heights.",
      cost: 200,
    },
    {
      name: "Heavy Armor",
      imageKey: "item_placeholder",
      stats: "-Speed, +Weight",
      description: "Slow and steady wins the... wait, does it?",
      cost: 250,
    },
  ].sort((a, b) => a.cost - b.cost);

  constructor() {
    super({ key: "ShopScene" });
  }

  preload() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xcccccc, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture("item_placeholder", 64, 64);
    graphics.destroy();
  }

  create() {
    this.add
      .text(this.cameras.main.width / 2, 50, "Shop", {
        fontSize: "48px",
        color: "#fff",
      })
      .setOrigin(0.5);

    const playerData = PlayerData.getInstance();

    // Display player's coins
    const coins = playerData.getCoins();
    this.coinsText = this.add
      .text(this.cameras.main.width - 20, 20, `Coins: ${coins}`, {
        fontSize: "32px",
        color: "#ffd700",
      })
      .setOrigin(1, 0);

    let yPos = 150;
    this.items.forEach((item) => {
      this.add.image(100, yPos, item.imageKey);
      this.add.text(200, yPos - 30, item.name, { fontSize: "28px", color: "#fff" });
      this.add.text(200, yPos, item.stats, { fontSize: "24px", color: "#0f0" });
      this.add.text(200, yPos + 25, item.description, { fontSize: "18px", color: "#fff", wordWrap: { width: 400 } });

      // Cost and Buy Button
      this.add.text(600, yPos - 15, `Cost: ${item.cost}`, { fontSize: "24px", color: "#ffd700" });
      const buyButton = this.add.text(600, yPos + 15, 'Buy', { fontSize: "28px", color: "#0f0", backgroundColor: "#555" }).setPadding(10).setInteractive();

      if (playerData.hasPurchased(item.name)) {
        buyButton.setText('Bought').disableInteractive().setBackgroundColor("#333").setColor("#888");
      } else {
        buyButton.on('pointerdown', () => {
          if (playerData.spendCoins(item.cost)) {
            playerData.purchaseItem(item.name);
            buyButton.setText('Bought').disableInteractive().setBackgroundColor("#333").setColor("#888");
            this.coinsText.setText(`Coins: ${playerData.getCoins()}`);
          }
        });
      }

      yPos += 100;
    });

    const backButton = this.add
      .text(
        this.cameras.main.width - 100,
        this.cameras.main.height - 50,
        "Back",
        {
          fontSize: "32px",
          color: "#ff0",
        }
      )
      .setOrigin(0.5)
      .setInteractive();

    backButton.on("pointerdown", () => {
      this.scene.start("MainMenuScene");
    });
  }
}
