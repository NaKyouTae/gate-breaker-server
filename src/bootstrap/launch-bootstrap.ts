import { PrismaClient, ItemType, Rarity } from '@prisma/client';
import {
  enhanceDefaults,
  battleDefaults,
  dungeonDefaults,
  dropDefaults,
  levelupDefaults,
  shopDefaults,
} from '../game-config/defaults';
import { purgeNonWeaponEquipment, migrateOldWeapons, seedWeaponCatalog } from './weapon-catalog.seed';

const prisma = new PrismaClient();

const MARKER_CATEGORY = 'system';
const MARKER_KEY = 'launch_initialized_v2';

async function findOrCreateItem(data: Parameters<typeof prisma.item.create>[0]['data']) {
  const existing = await prisma.item.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.item.create({ data });
}

async function findOrCreateDungeon(data: Parameters<typeof prisma.dungeon.create>[0]['data']) {
  const existing = await prisma.dungeon.findFirst({ where: { name: data.name } });
  if (existing) return existing;
  return prisma.dungeon.create({ data });
}

async function findOrCreateMonster(data: Parameters<typeof prisma.monster.create>[0]['data']) {
  const existing = await prisma.monster.findFirst({
    where: { name: data.name, dungeonId: data.dungeonId },
  });
  if (existing) return existing;
  return prisma.monster.create({ data });
}

async function seedBaselineContent() {
  console.log('[bootstrap] Seeding launch baseline content (v2 - DUNGEON_1_100_DESIGN)...');

  // ============ ITEMS ============

  // 기존 무기 마이그레이션 + 카탈로그 시드
  const migration = await migrateOldWeapons(prisma);
  console.log(`[bootstrap] Old weapons migrated: ${migration.migrated}`);

  const weaponSeed = await seedWeaponCatalog(prisma);
  console.log(`[bootstrap] Weapon catalog: created=${weaponSeed.created}, updated=${weaponSeed.updated}`);

  // 드랍테이블용 무기 참조
  const crackDagger = await prisma.item.findFirstOrThrow({ where: { name: '균열 단검' } });
  const guardSword = await prisma.item.findFirstOrThrow({ where: { name: '파수 장검' } });
  const blazeAxe = await prisma.item.findFirstOrThrow({ where: { name: '용광 도끼' } });
  const moonSpear = await prisma.item.findFirstOrThrow({ where: { name: '월광 창' } });
  const stormBow = await prisma.item.findFirstOrThrow({ where: { name: '폭풍 활' } });
  const abyssStaff = await prisma.item.findFirstOrThrow({ where: { name: '심연 지팡이' } });
  const thunderGauntlet = await prisma.item.findFirstOrThrow({ where: { name: '낙뢰 권갑' } });
  const holyGreatsword = await prisma.item.findFirstOrThrow({ where: { name: '성흔 대검' } });

  const hpPotion = await findOrCreateItem({
    name: 'HP 포션',
    category: '소모품',
    type: ItemType.CONSUMABLE,
    rarity: Rarity.COMMON,
    description: 'HP를 30 회복한다.',
    sellPrice: 25,
    buyPrice: 50,
  });

  await findOrCreateItem({
    name: 'MP 포션',
    category: '소모품',
    type: ItemType.CONSUMABLE,
    rarity: Rarity.COMMON,
    description: 'MP를 20 회복한다.',
    sellPrice: 25,
    buyPrice: 50,
  });

  const superHpPotion = await findOrCreateItem({
    name: '고급 HP 포션',
    category: '소모품',
    type: ItemType.CONSUMABLE,
    rarity: Rarity.RARE,
    description: 'HP를 100 회복한다.',
    sellPrice: 100,
    buyPrice: 200,
  });

  const slimeGel = await findOrCreateItem({
    name: '슬라임 점액',
    category: '재료',
    type: ItemType.MATERIAL,
    rarity: Rarity.COMMON,
    description: '슬라임에게서 얻은 끈적한 점액.',
    sellPrice: 5,
    buyPrice: null,
  });

  const goblinTooth = await findOrCreateItem({
    name: '고블린 이빨',
    category: '재료',
    type: ItemType.MATERIAL,
    rarity: Rarity.COMMON,
    description: '고블린의 날카로운 이빨.',
    sellPrice: 10,
    buyPrice: null,
  });

  // ============ DUNGEONS & MONSTERS ============
  // DUNGEON_1_100_DESIGN.md 기준

  // Dungeon 1: 균열의 숲 (Lv 1~20)
  const crackForest = await findOrCreateDungeon({
    name: '균열의 숲',
    minLevel: 1,
    maxLevel: 20,
    rewardGoldMin: 500,
    rewardGoldMax: 3000,
    rewardExp: 200,
  });

  const mossSlime = await findOrCreateMonster({
    name: '이끼 슬라임',
    dungeonId: crackForest.id,
    hp: 30,
    attack: 5,
    defense: 2,
    expReward: 80,
    goldReward: 500,
    isBoss: false,
    sortOrder: 1,
  });

  const crackGoblin = await findOrCreateMonster({
    name: '균열 고블린',
    dungeonId: crackForest.id,
    hp: 50,
    attack: 8,
    defense: 3,
    expReward: 150,
    goldReward: 900,
    isBoss: false,
    sortOrder: 2,
  });

  const forestGuardian = await findOrCreateMonster({
    name: '숲의 파수대장',
    dungeonId: crackForest.id,
    hp: 120,
    attack: 18,
    defense: 8,
    expReward: 500,
    goldReward: 2500,
    isBoss: true,
    sortOrder: 3,
  });

  // Dungeon 2: 폐허의 광산 (Lv 21~40)
  const ruinMine = await findOrCreateDungeon({
    name: '폐허의 광산',
    minLevel: 21,
    maxLevel: 40,
    rewardGoldMin: 1500,
    rewardGoldMax: 8000,
    rewardExp: 600,
  });

  const mineOrc = await findOrCreateMonster({
    name: '광산 오크',
    dungeonId: ruinMine.id,
    hp: 120,
    attack: 22,
    defense: 10,
    expReward: 400,
    goldReward: 2000,
    isBoss: false,
    sortOrder: 1,
  });

  const rockSpider = await findOrCreateMonster({
    name: '암석 거미',
    dungeonId: ruinMine.id,
    hp: 100,
    attack: 28,
    defense: 7,
    expReward: 500,
    goldReward: 2500,
    isBoss: false,
    sortOrder: 2,
  });

  const mineSupervisor = await findOrCreateMonster({
    name: '광산 감독관',
    dungeonId: ruinMine.id,
    hp: 320,
    attack: 45,
    defense: 20,
    expReward: 1500,
    goldReward: 7000,
    isBoss: true,
    sortOrder: 3,
  });

  // Dungeon 3: 심연의 성채 (Lv 41~60)
  const abyssFortress = await findOrCreateDungeon({
    name: '심연의 성채',
    minLevel: 41,
    maxLevel: 60,
    rewardGoldMin: 4000,
    rewardGoldMax: 18000,
    rewardExp: 1500,
  });

  const shadowKnight = await findOrCreateMonster({
    name: '그림자 기사',
    dungeonId: abyssFortress.id,
    hp: 250,
    attack: 40,
    defense: 18,
    expReward: 1000,
    goldReward: 5000,
    isBoss: false,
    sortOrder: 1,
  });

  const fortressExecutor = await findOrCreateMonster({
    name: '성채 집행자',
    dungeonId: abyssFortress.id,
    hp: 300,
    attack: 50,
    defense: 22,
    expReward: 1200,
    goldReward: 6000,
    isBoss: false,
    sortOrder: 2,
  });

  const abyssCommander = await findOrCreateMonster({
    name: '심연의 지휘관',
    dungeonId: abyssFortress.id,
    hp: 700,
    attack: 80,
    defense: 38,
    expReward: 4000,
    goldReward: 17000,
    isBoss: true,
    sortOrder: 3,
  });

  // Dungeon 4: 망자의 대성당 (Lv 61~80)
  const deadCathedral = await findOrCreateDungeon({
    name: '망자의 대성당',
    minLevel: 61,
    maxLevel: 80,
    rewardGoldMin: 10000,
    rewardGoldMax: 45000,
    rewardExp: 4000,
  });

  const cursedPriest = await findOrCreateMonster({
    name: '저주받은 사제',
    dungeonId: deadCathedral.id,
    hp: 400,
    attack: 65,
    defense: 28,
    expReward: 2500,
    goldReward: 12000,
    isBoss: false,
    sortOrder: 1,
  });

  const tombGuardian = await findOrCreateMonster({
    name: '무덤 수호자',
    dungeonId: deadCathedral.id,
    hp: 500,
    attack: 80,
    defense: 35,
    expReward: 3000,
    goldReward: 15000,
    isBoss: false,
    sortOrder: 2,
  });

  const deathBishop = await findOrCreateMonster({
    name: '사멸의 주교',
    dungeonId: deadCathedral.id,
    hp: 1200,
    attack: 120,
    defense: 55,
    expReward: 9000,
    goldReward: 40000,
    isBoss: true,
    sortOrder: 3,
  });

  // Dungeon 5: 용왕의 균열핵 (Lv 81~100)
  const dragonCore = await findOrCreateDungeon({
    name: '용왕의 균열핵',
    minLevel: 81,
    maxLevel: 100,
    rewardGoldMin: 25000,
    rewardGoldMax: 100000,
    rewardExp: 10000,
  });

  const crackWyvern = await findOrCreateMonster({
    name: '균열 와이번',
    dungeonId: dragonCore.id,
    hp: 700,
    attack: 100,
    defense: 50,
    expReward: 6000,
    goldReward: 30000,
    isBoss: false,
    sortOrder: 1,
  });

  const lavaDragon = await findOrCreateMonster({
    name: '용암 파편룡',
    dungeonId: dragonCore.id,
    hp: 900,
    attack: 120,
    defense: 60,
    expReward: 7500,
    goldReward: 38000,
    isBoss: false,
    sortOrder: 2,
  });

  const dragonKing = await findOrCreateMonster({
    name: '용왕 네메시스',
    dungeonId: dragonCore.id,
    hp: 2500,
    attack: 180,
    defense: 90,
    expReward: 22000,
    goldReward: 90000,
    isBoss: true,
    sortOrder: 3,
  });

  // ============ DROP TABLES ============

  const dropTableEntries = [
    // 균열의 숲 - 기본 무기
    { monsterId: mossSlime.id, itemId: slimeGel.id, dropRate: 0.5 },
    { monsterId: mossSlime.id, itemId: hpPotion.id, dropRate: 0.2 },
    { monsterId: crackGoblin.id, itemId: goblinTooth.id, dropRate: 0.5 },
    { monsterId: crackGoblin.id, itemId: hpPotion.id, dropRate: 0.3 },
    { monsterId: forestGuardian.id, itemId: crackDagger.id, dropRate: 0.3 },
    { monsterId: forestGuardian.id, itemId: guardSword.id, dropRate: 0.2 },
    // 폐허의 광산
    { monsterId: mineOrc.id, itemId: blazeAxe.id, dropRate: 0.1 },
    { monsterId: rockSpider.id, itemId: moonSpear.id, dropRate: 0.1 },
    { monsterId: mineSupervisor.id, itemId: blazeAxe.id, dropRate: 0.2 },
    { monsterId: mineSupervisor.id, itemId: stormBow.id, dropRate: 0.15 },
    { monsterId: mineSupervisor.id, itemId: superHpPotion.id, dropRate: 0.3 },
    // 심연의 성채
    { monsterId: shadowKnight.id, itemId: moonSpear.id, dropRate: 0.1 },
    { monsterId: shadowKnight.id, itemId: stormBow.id, dropRate: 0.1 },
    { monsterId: fortressExecutor.id, itemId: abyssStaff.id, dropRate: 0.05 },
    { monsterId: abyssCommander.id, itemId: abyssStaff.id, dropRate: 0.15 },
    { monsterId: abyssCommander.id, itemId: thunderGauntlet.id, dropRate: 0.1 },
    { monsterId: abyssCommander.id, itemId: superHpPotion.id, dropRate: 0.4 },
    // 망자의 대성당
    { monsterId: cursedPriest.id, itemId: thunderGauntlet.id, dropRate: 0.05 },
    { monsterId: cursedPriest.id, itemId: superHpPotion.id, dropRate: 0.3 },
    { monsterId: tombGuardian.id, itemId: abyssStaff.id, dropRate: 0.1 },
    { monsterId: deathBishop.id, itemId: thunderGauntlet.id, dropRate: 0.2 },
    { monsterId: deathBishop.id, itemId: holyGreatsword.id, dropRate: 0.1 },
    // 용왕의 균열핵
    { monsterId: crackWyvern.id, itemId: thunderGauntlet.id, dropRate: 0.15 },
    { monsterId: crackWyvern.id, itemId: holyGreatsword.id, dropRate: 0.08 },
    { monsterId: lavaDragon.id, itemId: holyGreatsword.id, dropRate: 0.1 },
    { monsterId: dragonKing.id, itemId: holyGreatsword.id, dropRate: 0.15 },
  ];

  for (const entry of dropTableEntries) {
    const existing = await prisma.dropTable.findFirst({
      where: { monsterId: entry.monsterId, itemId: entry.itemId },
    });
    if (!existing) {
      await prisma.dropTable.create({ data: entry });
    }
  }

  // Remove legacy 강화석 data (강화는 골드 전용)
  const legacyEnhanceStone = await prisma.item.findFirst({
    where: { name: '강화석' },
    select: { id: true },
  });
  if (legacyEnhanceStone) {
    await prisma.dropTable.deleteMany({ where: { itemId: legacyEnhanceStone.id } });
    await prisma.inventory.deleteMany({ where: { itemId: legacyEnhanceStone.id } });
    await prisma.item.delete({ where: { id: legacyEnhanceStone.id } });
  }

  // ============ GAME CONFIGS ============

  const allDefaults: { category: string; items: { key: string; value: any; description: string }[] }[] = [
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

  const cleanup = await purgeNonWeaponEquipment(prisma);
  console.log(
    `[bootstrap] Removed non-weapon equipment (items: ${cleanup.itemsRemoved}, inventory: ${cleanup.inventoryRemoved}, drops: ${cleanup.dropTablesRemoved})`,
  );
}

async function main() {
  const marker = await prisma.gameConfig.findUnique({
    where: {
      category_key: {
        category: MARKER_CATEGORY,
        key: MARKER_KEY,
      },
    },
  });

  if (marker) {
    console.log('[bootstrap] Launch baseline already initialized (v2). Skip.');
    return;
  }

  await seedBaselineContent();

  await prisma.gameConfig.upsert({
    where: {
      category_key: {
        category: MARKER_CATEGORY,
        key: MARKER_KEY,
      },
    },
    update: {
      value: {
        doneAt: new Date().toISOString(),
        note: 'Launch baseline v2 - DUNGEON_1_100_DESIGN',
      },
      description: 'One-time launch bootstrap marker (v2)',
    },
    create: {
      category: MARKER_CATEGORY,
      key: MARKER_KEY,
      value: {
        doneAt: new Date().toISOString(),
        note: 'Launch baseline v2 - DUNGEON_1_100_DESIGN',
      },
      description: 'One-time launch bootstrap marker (v2)',
    },
  });

  console.log('[bootstrap] Launch baseline v2 initialization complete.');
}

main()
  .catch((error) => {
    console.error('[bootstrap] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
