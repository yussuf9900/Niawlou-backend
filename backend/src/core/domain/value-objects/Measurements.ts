/**
 * Value Object: Measurements (Mensurations de couture)
 * Utilisé pour le carnet de mesures personnel et pour l'instantané figé de commande.
 */
export interface MeasurementValues {
  tourPoitrine?: number;    // en cm
  tourTaille?: number;      // en cm
  tourBassin?: number;      // en cm
  longueurTotale?: number;  // en cm
  carrureEpaule?: number;   // en cm
  longueurManche?: number;  // en cm
  tourCou?: number;         // en cm
  notesParticulieres?: string;
}

export class Measurements {
  private readonly _values: Readonly<MeasurementValues>;
  private readonly _recordedAt: Date;

  constructor(values: MeasurementValues, recordedAt = new Date()) {
    // Validation des valeurs physiques réalistes
    for (const [key, val] of Object.entries(values)) {
      if (typeof val === 'number') {
        if (val <= 0 || val > 300) {
          throw new Error(`Mesure anormale pour '${key}': ${val} cm. La valeur doit être comprise entre 1 et 300 cm.`);
        }
      }
    }
    this._values = Object.freeze({ ...values });
    this._recordedAt = recordedAt;
  }

  public get values(): Readonly<MeasurementValues> {
    return this._values;
  }

  public get recordedAt(): Date {
    return this._recordedAt;
  }

  public toJSON(): Record<string, unknown> {
    return {
      ...this._values,
      recordedAt: this._recordedAt.toISOString()
    };
  }

  public static fromJSON(json: Record<string, unknown>): Measurements {
    const { recordedAt, ...rest } = json;
    const date = recordedAt ? new Date(recordedAt as string) : new Date();
    return new Measurements(rest as MeasurementValues, date);
  }
}
