import Phaser from "phaser";
import { PlayerData } from "./data/PlayerData";

interface ShopItem {
  name: string;
  imageKey: string;
  stats: string;
  description: string;
}

export class ShopScene extends Phaser.Scene {
  private items: ShopItem[] = [
    {
      name: "Feather-light Tunic",
      imageKey: "item_placeholder",
      stats: "+Speed, -Friction",
      description:
        "A light tunic that lets you glide through the air with ease.",
    },
    {
      name: "Boots of Bouncing",
      imageKey: "item_placeholder",
      stats: "+Bounce",
      description: "These boots are made for bouncing! Reach new heights.",
    },
    {
      name: "Spiked Helmet",
      imageKey: "item_placeholder",
      stats: "+Damage",
      description: "A pointy helmet. Good for breaking things.",
    },
    {
      name: "Greasy Shield",
      imageKey: "item_placeholder",
      stats: "-Friction",
      description: "So slippery, you'll slide for days.",
    },
    {
      name: "Heavy Armor",
      imageKey: "item_placeholder",
      stats: "-Speed, +Weight",
      description: "Slow and steady wins the... wait, does it?",
    },
  ];

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

    let yPos = 120;
    this.items.forEach((item) => {
      this.add.image(100, yPos, item.imageKey).setOrigin(0, 0.5);
      this.add.text(200, yPos - 20, item.stats, {
        fontSize: "24px",
        color: "#0f0",
      });
      this.add.text(200, yPos + 10, item.description, {
        fontSize: "18px",
        color: "#fff",
        wordWrap: { width: 400 },
      });
      yPos += 90;
    });

    // Display player's coins
    const coins = PlayerData.getInstance().getCoins();
    this.add
      .text(this.cameras.main.width - 20, 20, `Coins: ${coins}`, {
        fontSize: "32px",
        color: "#ffd700",
      })
      .setOrigin(1, 0);

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
