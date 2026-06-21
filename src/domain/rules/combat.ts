export const resolveAttack = (
  attacker: { attack: number },
  targetHp: number
): { damage: number; targetHpAfter: number; destroyed: boolean } => {
  const damage = attacker.attack;
  const targetHpAfter = Math.max(0, targetHp - damage);
  return { damage, targetHpAfter, destroyed: targetHpAfter === 0 };
};
