export class PlayerData {
  private static instance: PlayerData;
  private coins: number;
  private readonly COINS_STORAGE_KEY = 'knight-launcher-coins';

  private constructor() {
    const savedCoins = localStorage.getItem(this.COINS_STORAGE_KEY);
    this.coins = savedCoins ? parseInt(savedCoins, 10) : 0;
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

  private saveCoins(): void {
    localStorage.setItem(this.COINS_STORAGE_KEY, this.coins.toString());
  }
}
