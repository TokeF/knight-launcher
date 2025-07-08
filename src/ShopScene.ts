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
      description:
        "A light tunic that lets you glide through the air with ease.",
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
    {
      name: "Smash Shield",
      cost: 250,
      imageKey: "shield", // Make sure to add an appropriate image asset
      stats: "+Y Boost (1x per launch)",
      description:
        "Press Space after launching to smash downward with great force.",
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

    // --- Scrollable Panel ---
    const scrollAreaY = 120;
    const scrollAreaHeight = 420;
    const itemsContainer = this.add.container(0, 0);

    let yPos = 50; // Start y position within the container, with padding

    this.items.forEach((item) => {
      const itemGroup = this.add.container(0, yPos);

      const image = this.add.image(100, 0, item.imageKey).setOrigin(0.5, 0.5);
      const name = this.add.text(200, -35, item.name, {
        fontSize: "28px",
        color: "#fff",
      });
      const stats = this.add.text(200, -5, item.stats, {
        fontSize: "24px",
        color: "#0f0",
      });
      const desc = this.add.text(200, 20, item.description, {
        fontSize: "18px",
        color: "#fff",
        wordWrap: { width: 350 },
      });
      const cost = this.add
        .text(650, -15, `Cost: ${item.cost}`, {
          fontSize: "24px",
          color: "#ffd700",
        })
        .setOrigin(0.5, 0);
      const buyButton = this.add
        .text(650, 15, "Buy", {
          fontSize: "28px",
          color: "#0f0",
          backgroundColor: "#555",
        })
        .setOrigin(0.5, 0)
        .setPadding(10)
        .setInteractive();
      itemGroup.add([image, name, stats, desc, cost, buyButton]);
      itemsContainer.add(itemGroup);

      if (playerData.hasPurchased(item.name)) {
        buyButton
          .setText("Bought")
          .disableInteractive()
          .setBackgroundColor("#333")
          .setColor("#888");
      } else {
        buyButton.on("pointerdown", () => {
          if (playerData.spendCoins(item.cost)) {
            playerData.purchaseItem(item.name);
            buyButton
              .setText("Bought")
              .disableInteractive()
              .setBackgroundColor("#333")
              .setColor("#888");
            this.coinsText.setText(`Coins: ${playerData.getCoins()}`);
            // Optionally, auto-refresh the scene or equip logic
          }
        });
      }
      yPos += 100;
    });

    const totalHeight = yPos;
    itemsContainer.setSize(this.cameras.main.width, totalHeight);
    itemsContainer.setPosition(0, scrollAreaY);

    const maskShape = this.make.graphics();
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      0,
      scrollAreaY,
      this.cameras.main.width,
      scrollAreaHeight
    );
    itemsContainer.mask = new Phaser.Display.Masks.GeometryMask(
      this,
      maskShape
    );

    const maxScroll = 0;
    const minScroll =
      -(itemsContainer.height - scrollAreaHeight) +
      (itemsContainer.height > scrollAreaHeight ? 20 : 0);

    // --- Scrollbar ---
    const scrollbar = this.add.graphics();
    const scrollbarHeight =
      scrollAreaHeight * (scrollAreaHeight / itemsContainer.height);
    const updateScrollbar = () => {
      if (itemsContainer.height <= scrollAreaHeight) return;
      const scrollPercentage =
        (itemsContainer.y - (minScroll + scrollAreaY)) /
        (maxScroll + scrollAreaY - (minScroll + scrollAreaY));
      const scrollbarY =
        scrollAreaY +
        (scrollAreaHeight - scrollbarHeight) * (1 - scrollPercentage);
      scrollbar
        .clear()
        .fillStyle(0x888888, 0.8)
        .fillRect(780, scrollbarY, 8, scrollbarHeight);
    };

    this.input.on(
      "wheel",
      (_pointer: any, _gameObjects: any, _deltaX: any, deltaY: any) => {
        if (itemsContainer.height > scrollAreaHeight) {
          let newY = itemsContainer.y - deltaY * 0.5;
          itemsContainer.y = Phaser.Math.Clamp(
            newY,
            minScroll + scrollAreaY,
            maxScroll + scrollAreaY
          );
          updateScrollbar();
        }
      }
    );

    updateScrollbar();

    // --- Scroll Buttons ---
    const scrollStep = 40;
    const upButton = this.add
      .text(750, scrollAreaY, "▲", { fontSize: "48px", color: "#fff" })
      .setOrigin(0.5, 0)
      .setInteractive();
    const downButton = this.add
      .text(750, scrollAreaY + scrollAreaHeight, "▼", {
        fontSize: "48px",
        color: "#fff",
      })
      .setOrigin(0.5, 1)
      .setInteractive();

    upButton.on("pointerdown", () => {
      if (itemsContainer.height > scrollAreaHeight) {
        let newY = itemsContainer.y + scrollStep;
        itemsContainer.y = Phaser.Math.Clamp(
          newY,
          minScroll + scrollAreaY,
          maxScroll + scrollAreaY
        );
        updateScrollbar();
      }
    });

    downButton.on("pointerdown", () => {
      if (itemsContainer.height > scrollAreaHeight) {
        let newY = itemsContainer.y - scrollStep;
        itemsContainer.y = Phaser.Math.Clamp(
          newY,
          minScroll + scrollAreaY,
          maxScroll + scrollAreaY
        );
        updateScrollbar();
      }
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
