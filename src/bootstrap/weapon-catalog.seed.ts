import { ItemType, PrismaClient, Rarity } from '@prisma/client';

type WeaponSeed = {
  name: string;
  rarity: Rarity;
  baseAttack: number;
  description: string;
  sellPrice: number;
  buyPrice: number;
};

export const WEAPON_ENHANCE_TITLE_TIERS = [
  { minLevel: 0, maxLevel: 4, title: '기본' },
  { minLevel: 5, maxLevel: 9, title: '예리한' },
  { minLevel: 10, maxLevel: 14, title: '균열의' },
  { minLevel: 15, maxLevel: 19, title: '심연의' },
  { minLevel: 20, maxLevel: 20, title: '전설의' },
] as const;

export const WEAPON_CATALOG: WeaponSeed[] = [
  {
    name: '균열 단검',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '빠르게 베어내는 초급 암살자용 단검.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '파수 장검',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '전위 전투에 적합한 균형형 장검.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '용광 도끼',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '무겁지만 한 방이 강력한 양손 도끼.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '월광 창',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '긴 사거리와 안정적인 찌르기를 가진 창.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '폭풍 활',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '연속 타격에 특화된 고속 사격 활.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '심연 지팡이',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '마력 증폭에 특화된 고위 마도구.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '낙뢰 권갑',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '연타와 폭발력을 동시에 갖춘 권갑.',
    sellPrice: 0,
    buyPrice: 0,
  },
  {
    name: '성흔 대검',
    rarity: Rarity.COMMON,
    baseAttack: 20,
    description: '최상위 등급의 파괴력을 가진 대검.',
    sellPrice: 0,
    buyPrice: 0,
  },
];

const NON_WEAPON_EQUIP_TYPES: ItemType[] = [
  ItemType.ARMOR,
  ItemType.GLOVE,
  ItemType.SHOE,
  ItemType.RING,
  ItemType.NECKLACE,
];

export async function purgeNonWeaponEquipment(
  prisma: PrismaClient,
): Promise<{ itemsRemoved: number; inventoryRemoved: number; dropTablesRemoved: number }> {
  const targets = await prisma.item.findMany({
    where: {
      type: { in: NON_WEAPON_EQUIP_TYPES },
    },
    select: { id: true },
  });

  if (targets.length === 0) {
    return { itemsRemoved: 0, inventoryRemoved: 0, dropTablesRemoved: 0 };
  }

  const itemIds = targets.map((item) => item.id);

  const [dropDeleted, inventoryDeleted, itemDeleted] = await prisma.$transaction([
    prisma.dropTable.deleteMany({
      where: { itemId: { in: itemIds } },
    }),
    prisma.inventory.deleteMany({
      where: { itemId: { in: itemIds } },
    }),
    prisma.item.deleteMany({
      where: { id: { in: itemIds } },
    }),
  ]);

  return {
    itemsRemoved: itemDeleted.count,
    inventoryRemoved: inventoryDeleted.count,
    dropTablesRemoved: dropDeleted.count,
  };
}

/**
 * 기존 무기(녹슨 검, 철검, 미스릴 검, 용의 검)를 새 무기로 변환한다.
 * 인벤토리/드랍테이블 참조를 유지한 채 이름/스탯만 업데이트한다.
 */
const OLD_WEAPON_MIGRATION: { oldName: string; newName: string }[] = [
  { oldName: '녹슨 검', newName: '균열 단검' },
  { oldName: '철검', newName: '파수 장검' },
  { oldName: '미스릴 검', newName: '용광 도끼' },
  { oldName: '용의 검', newName: '월광 창' },
];

export async function migrateOldWeapons(prisma: PrismaClient): Promise<{ migrated: number }> {
  let migrated = 0;

  for (const { oldName, newName } of OLD_WEAPON_MIGRATION) {
    const oldItem = await prisma.item.findFirst({ where: { name: oldName } });
    if (!oldItem) continue;

    // 새 이름의 아이템이 이미 존재하면 마이그레이션 스킵 (이미 완료됨)
    const newItemExists = await prisma.item.findFirst({ where: { name: newName } });
    if (newItemExists) continue;

    const newWeaponData = WEAPON_CATALOG.find((w) => w.name === newName);
    if (!newWeaponData) continue;

    await prisma.item.update({
      where: { id: oldItem.id },
      data: {
        name: newWeaponData.name,
        category: '무기',
        type: ItemType.WEAPON,
        rarity: newWeaponData.rarity,
        baseAttack: newWeaponData.baseAttack,
        baseDefense: 0,
        baseHp: 0,
        description: newWeaponData.description,
        sellPrice: newWeaponData.sellPrice,
        buyPrice: newWeaponData.buyPrice,
      },
    });
    migrated += 1;
  }

  return { migrated };
}

export async function seedWeaponCatalog(prisma: PrismaClient): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const weapon of WEAPON_CATALOG) {
    const existing = await prisma.item.findFirst({
      where: {
        name: weapon.name,
      },
    });

    const data = {
      name: weapon.name,
      category: '무기',
      type: ItemType.WEAPON,
      rarity: weapon.rarity,
      baseAttack: weapon.baseAttack,
      baseDefense: 0,
      baseHp: 0,
      description: weapon.description,
      sellPrice: weapon.sellPrice,
      buyPrice: weapon.buyPrice,
    };

    if (existing) {
      await prisma.item.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
      continue;
    }

    await prisma.item.create({ data });
    created += 1;
  }

  return { created, updated };
}
