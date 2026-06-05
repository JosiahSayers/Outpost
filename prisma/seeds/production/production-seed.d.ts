export interface ProductionSeed {
  run: () => Promise<any>;
  name: string;
}
