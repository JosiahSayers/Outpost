export interface ConversionConfig<Unit extends string> {
  order: Unit[];
  labels: Record<Unit, string>;
  // 1 unit of Unit = multipliers[Unit] canonical units (e.g. ml, grams).
  multipliers: Record<Unit, number>;
}
