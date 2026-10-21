import { describe, it, expect } from 'vitest';
import { Money } from '../core/domain/value-objects/Money.js';

describe('Value Object: Money', () => {
  it('crée un montant valide en FCFA', () => {
    const m = Money.from(35000);
    expect(m.amount).toBe(35000);
    expect(m.currency).toBe('FCFA');
    expect(m.format()).toBe('35 000 FCFA');
  });

  it('rejette les montants négatifs', () => {
    expect(() => Money.from(-100)).toThrow('Montant invalide');
  });

  it('additionne et soustrait des montants correctement', () => {
    const clothing = Money.from(35000);
    const delivery = Money.from(1500);
    const total = clothing.add(delivery);
    expect(total.amount).toBe(36500);

    const advance = total.percentage(40);
    expect(advance.amount).toBe(14600);

    const balance = total.subtract(advance);
    expect(balance.amount).toBe(21900);
    expect(advance.add(balance).amount).toBe(36500);
  });

  it('interdit de soustraire un montant supérieur', () => {
    const m1 = Money.from(1000);
    const m2 = Money.from(5000);
    expect(() => m1.subtract(m2)).toThrow('Solde insuffisant');
  });
});
