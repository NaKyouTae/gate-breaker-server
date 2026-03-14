import { PrismaClient, ItemType, Rarity } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data in order (respect foreign keys)
  await prisma.dropTable.deleteMany();
  await prisma.battleLog.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.monster.deleteMany();
  await prisma.dungeon.deleteMany();
  await prisma.item.deleteMany();

  // ============ ITEMS ============

  // Weapons
  const rustyWord = await prisma.item.create({
    data: {
      name: '녹슨 검',
      category: '무기',
      type: ItemType.WEAPON,
      rarity: Rarity.COMMON,
      baseAttack: 5,
      baseDefense: 0,
      baseHp: 0,
      description: '녹이 슨 낡은 검. 그래도 맨손보단 낫다.',
      sellPrice: 10,
      buyPrice: 50,
    },
  });

  const ironSword = await prisma.item.create({
    data: {
      name: '철검',
      category: '무기',
      type: ItemType.WEAPON,
      rarity: Rarity.RARE,
      baseAttack: 15,
      baseDefense: 0,
      baseHp: 0,
      description: '단단한 철로 만든 검.',
      sellPrice: 100,
      buyPrice: 500,
    },
  });

  const mithrilSword = await prisma.item.create({
    data: {
      name: '미스릴 검',
      category: '무기',
      type: ItemType.WEAPON,
      rarity: Rarity.EPIC,
      baseAttack: 30,
      baseDefense: 0,
      baseHp: 0,
      description: '미스릴로 단조된 명검.',
      sellPrice: 500,
      buyPrice: 2000,
    },
  });

  const dragonSword = await prisma.item.create({
    data: {
      name: '용의 검',
      category: '무기',
      type: ItemType.WEAPON,
      rarity: Rarity.LEGENDARY,
      baseAttack: 60,
      baseDefense: 5,
      baseHp: 0,
      description: '드래곤의 이빨로 만든 전설의 검.',
      sellPrice: 2000,
      buyPrice: null,
    },
  });

  // Armor
  const leatherArmor = await prisma.item.create({
    data: {
      name: '가죽 갑옷',
      category: '방어구',
      type: ItemType.ARMOR,
      rarity: Rarity.COMMON,
      baseAttack: 0,
      baseDefense: 5,
      baseHp: 10,
      description: '가죽으로 만든 기본 갑옷.',
      sellPrice: 10,
      buyPrice: 50,
    },
  });

  const ironArmor = await prisma.item.create({
    data: {
      name: '철갑옷',
      category: '방어구',
      type: ItemType.ARMOR,
      rarity: Rarity.RARE,
      baseAttack: 0,
      baseDefense: 15,
      baseHp: 30,
      description: '단단한 철로 만든 갑옷.',
      sellPrice: 100,
      buyPrice: 500,
    },
  });

  const mithrilArmor = await prisma.item.create({
    data: {
      name: '미스릴 갑옷',
      category: '방어구',
      type: ItemType.ARMOR,
      rarity: Rarity.EPIC,
      baseAttack: 0,
      baseDefense: 30,
      baseHp: 60,
      description: '미스릴로 단조된 갑옷.',
      sellPrice: 500,
      buyPrice: 2000,
    },
  });

  // Consumables
  const hpPotion = await prisma.item.create({
    data: {
      name: 'HP 포션',
      category: '소모품',
      type: ItemType.CONSUMABLE,
      rarity: Rarity.COMMON,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: 'HP를 30 회복한다.',
      sellPrice: 25,
      buyPrice: 50,
    },
  });

  const mpPotion = await prisma.item.create({
    data: {
      name: 'MP 포션',
      category: '소모품',
      type: ItemType.CONSUMABLE,
      rarity: Rarity.COMMON,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: 'MP를 20 회복한다.',
      sellPrice: 25,
      buyPrice: 50,
    },
  });

  const superHpPotion = await prisma.item.create({
    data: {
      name: '고급 HP 포션',
      category: '소모품',
      type: ItemType.CONSUMABLE,
      rarity: Rarity.RARE,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: 'HP를 100 회복한다.',
      sellPrice: 100,
      buyPrice: 200,
    },
  });

  // Materials
  const slimeGel = await prisma.item.create({
    data: {
      name: '슬라임 점액',
      category: '재료',
      type: ItemType.MATERIAL,
      rarity: Rarity.COMMON,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: '슬라임에게서 얻은 끈적한 점액.',
      sellPrice: 5,
      buyPrice: null,
    },
  });

  const goblinTooth = await prisma.item.create({
    data: {
      name: '고블린 이빨',
      category: '재료',
      type: ItemType.MATERIAL,
      rarity: Rarity.COMMON,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: '고블린의 날카로운 이빨.',
      sellPrice: 10,
      buyPrice: null,
    },
  });

  const enhanceStone = await prisma.item.create({
    data: {
      name: '강화석',
      category: '재료',
      type: ItemType.MATERIAL,
      rarity: Rarity.RARE,
      baseAttack: 0,
      baseDefense: 0,
      baseHp: 0,
      description: '장비 강화에 사용되는 마법의 돌.',
      sellPrice: 50,
      buyPrice: 300,
    },
  });

  // ============ DUNGEONS & MONSTERS ============

  // Dungeon 1: 슬라임 숲
  // 보상 범위: 골드 500~3000 / 일반 몬스터 → 보스 순서로 등장
  const slimeForest = await prisma.dungeon.create({
    data: {
      name: '슬라임 숲',
      minLevel: 1,
      maxLevel: 5,
      rewardGoldMin: 500,
      rewardGoldMax: 3000,
      rewardExp: 200,
    },
  });

  // 일반 몬스터 (약함)
  const slime = await prisma.monster.create({
    data: {
      name: '슬라임',
      dungeonId: slimeForest.id,
      hp: 30,
      attack: 5,
      defense: 2,
      expReward: 80,
      goldReward: 500,
    },
  });

  // 보스 (가장 강함 - 마지막 등장)
  const slimeKing = await prisma.monster.create({
    data: {
      name: '슬라임 킹',
      dungeonId: slimeForest.id,
      hp: 80,
      attack: 12,
      defense: 5,
      expReward: 300,
      goldReward: 2000,
    },
  });

  // Dungeon 2: 고블린 동굴
  const goblinCave = await prisma.dungeon.create({
    data: {
      name: '고블린 동굴',
      minLevel: 5,
      maxLevel: 10,
      rewardGoldMin: 1500,
      rewardGoldMax: 8000,
      rewardExp: 600,
    },
  });

  // 일반 몬스터 1
  const goblin = await prisma.monster.create({
    data: {
      name: '고블린',
      dungeonId: goblinCave.id,
      hp: 60,
      attack: 12,
      defense: 5,
      expReward: 200,
      goldReward: 1200,
    },
  });

  // 일반 몬스터 2
  const goblinShaman = await prisma.monster.create({
    data: {
      name: '고블린 샤먼',
      dungeonId: goblinCave.id,
      hp: 50,
      attack: 18,
      defense: 3,
      expReward: 250,
      goldReward: 1500,
    },
  });

  // 보스 (가장 강함 - 마지막 등장)
  const goblinChief = await prisma.monster.create({
    data: {
      name: '고블린 대장',
      dungeonId: goblinCave.id,
      hp: 150,
      attack: 25,
      defense: 10,
      expReward: 700,
      goldReward: 5000,
    },
  });

  // Dungeon 3: 오크 요새
  const orcFortress = await prisma.dungeon.create({
    data: {
      name: '오크 요새',
      minLevel: 10,
      maxLevel: 20,
      rewardGoldMin: 4000,
      rewardGoldMax: 18000,
      rewardExp: 1500,
    },
  });

  // 일반 몬스터 (약함)
  const orc = await prisma.monster.create({
    data: {
      name: '오크',
      dungeonId: orcFortress.id,
      hp: 120,
      attack: 22,
      defense: 12,
      expReward: 500,
      goldReward: 3500,
    },
  });

  // 보스 (가장 강함 - 마지막 등장)
  const orcChief = await prisma.monster.create({
    data: {
      name: '오크 대장',
      dungeonId: orcFortress.id,
      hp: 280,
      attack: 40,
      defense: 20,
      expReward: 2000,
      goldReward: 12000,
    },
  });

  // Dungeon 4: 언데드 묘지
  const undeadGraveyard = await prisma.dungeon.create({
    data: {
      name: '언데드 묘지',
      minLevel: 20,
      maxLevel: 30,
      rewardGoldMin: 10000,
      rewardGoldMax: 45000,
      rewardExp: 4000,
    },
  });

  // 일반 몬스터 (약함)
  const skeleton = await prisma.monster.create({
    data: {
      name: '스켈레톤',
      dungeonId: undeadGraveyard.id,
      hp: 100,
      attack: 28,
      defense: 8,
      expReward: 1200,
      goldReward: 8000,
    },
  });

  // 보스 (가장 강함 - 마지막 등장)
  const lich = await prisma.monster.create({
    data: {
      name: '리치',
      dungeonId: undeadGraveyard.id,
      hp: 450,
      attack: 55,
      defense: 28,
      expReward: 5000,
      goldReward: 30000,
    },
  });

  // Dungeon 5: 드래곤 둥지
  const dragonNest = await prisma.dungeon.create({
    data: {
      name: '드래곤 둥지',
      minLevel: 30,
      maxLevel: 50,
      rewardGoldMin: 25000,
      rewardGoldMax: 100000,
      rewardExp: 10000,
    },
  });

  // 일반 몬스터 (약함)
  const wyvern = await prisma.monster.create({
    data: {
      name: '와이번',
      dungeonId: dragonNest.id,
      hp: 280,
      attack: 48,
      defense: 32,
      expReward: 3000,
      goldReward: 20000,
    },
  });

  // 보스 (가장 강함 - 마지막 등장)
  const dragon = await prisma.monster.create({
    data: {
      name: '드래곤',
      dungeonId: dragonNest.id,
      hp: 800,
      attack: 75,
      defense: 50,
      expReward: 15000,
      goldReward: 80000,
    },
  });

  // ============ DROP TABLES ============

  // Slime drops
  await prisma.dropTable.createMany({
    data: [
      { monsterId: slime.id, itemId: slimeGel.id, dropRate: 0.5 },
      { monsterId: slime.id, itemId: hpPotion.id, dropRate: 0.2 },
      { monsterId: slimeKing.id, itemId: slimeGel.id, dropRate: 0.8 },
      { monsterId: slimeKing.id, itemId: rustyWord.id, dropRate: 0.3 },
      { monsterId: slimeKing.id, itemId: leatherArmor.id, dropRate: 0.2 },
      { monsterId: slimeKing.id, itemId: enhanceStone.id, dropRate: 0.1 },
    ],
  });

  // Goblin drops
  await prisma.dropTable.createMany({
    data: [
      { monsterId: goblin.id, itemId: goblinTooth.id, dropRate: 0.5 },
      { monsterId: goblin.id, itemId: hpPotion.id, dropRate: 0.3 },
      { monsterId: goblinShaman.id, itemId: goblinTooth.id, dropRate: 0.4 },
      { monsterId: goblinShaman.id, itemId: mpPotion.id, dropRate: 0.4 },
      { monsterId: goblinShaman.id, itemId: enhanceStone.id, dropRate: 0.15 },
      { monsterId: goblinChief.id, itemId: ironSword.id, dropRate: 0.2 },
      { monsterId: goblinChief.id, itemId: ironArmor.id, dropRate: 0.15 },
      { monsterId: goblinChief.id, itemId: enhanceStone.id, dropRate: 0.25 },
      { monsterId: goblinChief.id, itemId: superHpPotion.id, dropRate: 0.3 },
    ],
  });

  // Orc drops
  await prisma.dropTable.createMany({
    data: [
      { monsterId: orc.id, itemId: ironSword.id, dropRate: 0.1 },
      { monsterId: orc.id, itemId: ironArmor.id, dropRate: 0.1 },
      { monsterId: orc.id, itemId: enhanceStone.id, dropRate: 0.2 },
      { monsterId: orcChief.id, itemId: mithrilSword.id, dropRate: 0.15 },
      { monsterId: orcChief.id, itemId: mithrilArmor.id, dropRate: 0.1 },
      { monsterId: orcChief.id, itemId: enhanceStone.id, dropRate: 0.35 },
      { monsterId: orcChief.id, itemId: superHpPotion.id, dropRate: 0.4 },
    ],
  });

  // Undead drops
  await prisma.dropTable.createMany({
    data: [
      { monsterId: skeleton.id, itemId: enhanceStone.id, dropRate: 0.25 },
      { monsterId: skeleton.id, itemId: mithrilSword.id, dropRate: 0.05 },
      { monsterId: skeleton.id, itemId: superHpPotion.id, dropRate: 0.3 },
      { monsterId: lich.id, itemId: mithrilSword.id, dropRate: 0.2 },
      { monsterId: lich.id, itemId: mithrilArmor.id, dropRate: 0.15 },
      { monsterId: lich.id, itemId: enhanceStone.id, dropRate: 0.5 },
    ],
  });

  // Dragon drops
  await prisma.dropTable.createMany({
    data: [
      { monsterId: wyvern.id, itemId: mithrilSword.id, dropRate: 0.15 },
      { monsterId: wyvern.id, itemId: mithrilArmor.id, dropRate: 0.1 },
      { monsterId: wyvern.id, itemId: enhanceStone.id, dropRate: 0.4 },
      { monsterId: dragon.id, itemId: dragonSword.id, dropRate: 0.1 },
      { monsterId: dragon.id, itemId: mithrilArmor.id, dropRate: 0.25 },
      { monsterId: dragon.id, itemId: enhanceStone.id, dropRate: 0.6 },
    ],
  });

  // ============ GAME CONFIGS ============
  const {
    enhanceDefaults,
    battleDefaults,
    dungeonDefaults,
    dropDefaults,
    levelupDefaults,
    shopDefaults,
  } = await import('../src/game-config/defaults');

  const allDefaults = [
    { category: 'enhance', items: enhanceDefaults },
    { category: 'battle', items: battleDefaults },
    { category: 'dungeon', items: dungeonDefaults },
    { category: 'drop', items: dropDefaults },
    { category: 'levelup', items: levelupDefaults },
    { category: 'shop', items: shopDefaults },
  ];

  for (const { category, items } of allDefaults) {
    for (const item of items) {
      await prisma.gameConfig.upsert({
        where: { category_key: { category, key: item.key } },
        update: {},
        create: {
          category,
          key: item.key,
          value: item.value,
          description: item.description,
        },
      });
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
