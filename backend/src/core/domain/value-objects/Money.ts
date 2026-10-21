/**
 * Value Object: Money (Gestion des montants en FCFA)
 * Immuable et garantissant l'absence de valeurs négatives ou de décimales incohérentes.
 */
export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency = 'FCFA') {
    if (isNaN(amount) || amount < 0) {
      throw new Error(`Montant invalide: ${amount}. Le montant doit être un nombre positif.`);
    }
    // Les montants en FCFA n'ont pas de centimes dans l'usage courant
    this._amount = Math.round(amount);
    this._currency = currency;
  }

  public static zero(): Money {
    return new Money(0);
  }

  public static from(amount: number): Money {
    return new Money(amount);
  }

  public get amount(): number {
    return this._amount;
  }

  public get currency(): string {
    return this._currency;
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other._amount > this._amount) {
      throw new Error(`Solde insuffisant: impossible de déduire ${other._amount} de ${this._amount}`);
    }
    return new Money(this._amount - other._amount, this._currency);
  }

  public percentage(percent: number): Money {
    if (percent < 0 || percent > 100) {
      throw new Error(`Pourcentage invalide: ${percent}`);
    }
    return new Money(Math.round((this._amount * percent) / 100), this._currency);
  }

  public equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  public isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amount > other._amount;
  }

  public format(): string {
    return `${new Intl.NumberFormat('fr-FR').format(this._amount)} ${this._currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Devises incompatibles: ${this._currency} vs ${other._currency}`);
    }
  }
}
