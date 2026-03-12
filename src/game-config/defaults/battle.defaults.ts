export const battleDefaults = [
  { key: 'damage_formula', value: { baseVariance: 3, critMultiplier: 1.5, minDamage: 1 }, description: '데미지 계산 공식' },
  { key: 'defeat_penalty', value: { goldLossRate: 0.1 }, description: '패배 시 골드 손실률' },
  { key: 'escape_rate', value: { base: 0.5, perSpeedDiff: 0.05 }, description: '도망 확률' },
];
