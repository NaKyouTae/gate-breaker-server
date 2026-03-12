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
  const slimeForest = await prisma.dungeon.create({
    data: {
      name: '슬라임 숲',
      minLevel: 1,
      maxLevel: 5,
      rewardGoldMin: 10,
      rewardGoldMax: 30,
      rewardExp: 20,
    },
  });

  const slime = await prisma.monster.create({
    data: {
      name: '슬라임',
      dungeonId: slimeForest.id,
      hp: 30,
      attack: 5,
      defense: 2,
      expReward: 15,
      goldReward: 10,
      isBoss: false,
    },
  });

  const slimeKing = await prisma.monster.create({
    data: {
      name: '슬라임 킹',
      dungeonId: slimeForest.id,
      hp: 80,
      attack: 12,
      defense: 5,
      expReward: 50,
      goldReward: 40,
      isBoss: true,
    },
  });

  // Dungeon 2: 고블린 동굴
  const goblinCave = await prisma.dungeon.create({
    data: {
      name: '고블린 동굴',
      minLevel: 5,
      maxLevel: 10,
      rewardGoldMin: 30,
      rewardGoldMax: 60,
      rewardExp: 50,
    },
  });

  const goblin = await prisma.monster.create({
    data: {
      name: '고블린',
      dungeonId: goblinCave.id,
      hp: 50,
      attack: 10,
      defense: 5,
      expReward: 30,
      goldReward: 20,
      isBoss: false,
    },
  });

  const goblinShaman = await prisma.monster.create({
    data: {
      name: '고블린 샤먼',
      dungeonId: goblinCave.id,
      hp: 40,
      attack: 15,
      defense: 3,
      expReward: 35,
      goldReward: 25,
      isBoss: false,
    },
  });

  const goblinChief = await prisma.monster.create({
    data: {
      name: '고블린 대장',
      dungeonId: goblinCave.id,
      hp: 120,
      attack: 20,
      defense: 10,
      expReward: 100,
      goldReward: 80,
      isBoss: true,
    },
  });

  // Dungeon 3: 오크 요새
  const orcFortress = await prisma.dungeon.create({
    data: {
      name: '오크 요새',
      minLevel: 10,
      maxLevel: 20,
      rewardGoldMin: 60,
      rewardGoldMax: 120,
      rewardExp: 100,
    },
  });

  const orc = await prisma.monster.create({
    data: {
      name: '오크',
      dungeonId: orcFortress.id,
      hp: 100,
      attack: 20,
      defense: 12,
      expReward: 60,
      goldReward: 50,
      isBoss: false,
    },
  });

  const orcChief = await prisma.monster.create({
    data: {
      name: '오크 대장',
      dungeonId: orcFortress.id,
      hp: 200,
      attack: 35,
      defense: 20,
      expReward: 200,
      goldReward: 150,
      isBoss: true,
    },
  });

  // Dungeon 4: 언데드 묘지
  const undeadGraveyard = await prisma.dungeon.create({
    data: {
      name: '언데드 묘지',
      minLevel: 20,
      maxLevel: 30,
      rewardGoldMin: 120,
      rewardGoldMax: 250,
      rewardExp: 200,
    },
  });

  const skeleton = await prisma.monster.create({
    data: {
      name: '스켈레톤',
      dungeonId: undeadGraveyard.id,
      hp: 80,
      attack: 25,
      defense: 8,
      expReward: 100,
      goldReward: 80,
      isBoss: false,
    },
  });

  const lich = await prisma.monster.create({
    data: {
      name: '리치',
      dungeonId: undeadGraveyard.id,
      hp: 300,
      attack: 45,
      defense: 25,
      expReward: 400,
      goldReward: 300,
      isBoss: true,
    },
  });

  // Dungeon 5: 드래곤 둥지
  const dragonNest = await prisma.dungeon.create({
    data: {
      name: '드래곤 둥지',
      minLevel: 30,
      maxLevel: 50,
      rewardGoldMin: 250,
      rewardGoldMax: 500,
      rewardExp: 500,
    },
  });

  const wyvern = await prisma.monster.create({
    data: {
      name: '와이번',
      dungeonId: dragonNest.id,
      hp: 200,
      attack: 40,
      defense: 30,
      expReward: 250,
      goldReward: 200,
      isBoss: false,
    },
  });

  const dragon = await prisma.monster.create({
    data: {
      name: '드래곤',
      dungeonId: dragonNest.id,
      hp: 500,
      attack: 60,
      defense: 40,
      expReward: 1000,
      goldReward: 800,
      isBoss: true,
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
