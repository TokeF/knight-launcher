export class PlayerData {
  private static instance: PlayerData;
  private coins: number = 0;
  private highScore: number = 0;
  private purchasedItems: Set<string> = new Set();
  private static readonly PURCHASED_ITEMS_KEY = "purchasedItems";
  private readonly COINS_STORAGE_KEY = 'knight-launcher-coins';
  private readonly HIGHSCORE_STORAGE_KEY = 'knight-launcher-highscore';
  private readonly PURCHASED_ITEMS_STORAGE_KEY = 'knight-launcher-purchased-items';

  private constructor() {
    this.loadCoins();
    this.loadHighScore();
    this.loadPurchasedItems();
  }

  private loadCoins() {
    const savedCoins = localStorage.getItem(this.COINS_STORAGE_KEY);
    this.coins = savedCoins ? parseInt(savedCoins, 10) : 0;
  }

  private loadHighScore() {
    const savedHighScore = localStorage.getItem(this.HIGHSCORE_STORAGE_KEY);
    this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
  }

  private loadPurchasedItems() {
    const savedPurchasedItems = localStorage.getItem(this.PURCHASED_ITEMS_STORAGE_KEY);
    this.purchasedItems = savedPurchasedItems ? new Set(JSON.parse(savedPurchasedItems)) : new Set();
  }




  public static getInstance(): PlayerData {
    if (!PlayerData.instance) {
      PlayerData.instance = new PlayerData();
    }
    return PlayerData.instance;
  }

  public getCoins(): number {
    return this.coins;
  }

  public addCoins(amount: number): void {
    if (amount > 0) {
      this.coins += amount;
      this.saveCoins();
    }
  }

  public spendCoins(amount: number): boolean {
    if (this.coins >= amount) {
      this.coins -= amount;
      this.saveCoins();
      return true;
    }
    return false;
  }

  public getHighScore(): number {
    return this.highScore;
  }

  public updateHighScore(score: number): void {
    if (score > this.highScore) {
      this.highScore = score;
      this.saveHighScore();
    }
  }

  private saveCoins(): void {
    localStorage.setItem(this.COINS_STORAGE_KEY, this.coins.toString());
  }

  private saveHighScore(): void {
    localStorage.setItem(this.HIGHSCORE_STORAGE_KEY, this.highScore.toString());
  }

  public hasPurchased(item: string): boolean {
    return this.purchasedItems.has(item);
  }

  public purchaseItem(item: string): void {
    if (!this.purchasedItems.has(item)) {
      this.purchasedItems.add(item);
      localStorage.setItem(this.PURCHASED_ITEMS_STORAGE_KEY, JSON.stringify(Array.from(this.purchasedItems)));
    }
  }

  private savePurchasedItems(): void {
    localStorage.setItem(this.PURCHASED_ITEMS_STORAGE_KEY, JSON.stringify(this.purchasedItems));
  }
}
