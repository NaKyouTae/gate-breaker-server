import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EquipDto } from './dto/equip.dto';
import { SellDto } from './dto/sell.dto';
import { ItemType, EquipSlot } from '@prisma/client';

const ITEM_TYPE_TO_EQUIP_SLOT: Partial<Record<ItemType, EquipSlot>> = {
  [ItemType.WEAPON]: EquipSlot.WEAPON,
  [ItemType.ARMOR]: EquipSlot.ARMOR,
  [ItemType.GLOVE]: EquipSlot.GLOVE,
  [ItemType.SHOE]: EquipSlot.SHOE,
  [ItemType.RING]: EquipSlot.RING,
  [ItemType.NECKLACE]: EquipSlot.NECKLACE,
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: { userId },
      include: { item: true },
      orderBy: { createdAt: 'desc' },
    });

    return inventories.map((inv) => ({
      ...inv,
      item: {
        ...inv.item,
        type: inv.item.type.toLowerCase(),
        rarity: inv.item.rarity.toLowerCase(),
      },
    }));
  }

  async equip(userId: string, equipDto: EquipDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: equipDto.inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 장착할 수 있습니다.');
    }

    const slot = ITEM_TYPE_TO_EQUIP_SLOT[inventory.item.type];
    if (!slot) {
      throw new BadRequestException('장착할 수 없는 아이템입니다.');
    }

    // Unequip any item currently in the same slot
    await this.prisma.inventory.updateMany({
      where: { userId, equippedSlot: slot, isEquipped: true },
      data: { isEquipped: false, equippedSlot: null },
    });

    // Equip the new item
    const updated = await this.prisma.inventory.update({
      where: { id: equipDto.inventoryId },
      data: { isEquipped: true, equippedSlot: slot },
      include: { item: true },
    });

    return updated;
  }

  async unequip(userId: string, equipDto: EquipDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: equipDto.inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 해제할 수 있습니다.');
    }

    if (!inventory.isEquipped) {
      throw new BadRequestException('장착되지 않은 아이템입니다.');
    }

    const updated = await this.prisma.inventory.update({
      where: { id: equipDto.inventoryId },
      data: { isEquipped: false, equippedSlot: null },
      include: { item: true },
    });

    return updated;
  }

  async sell(userId: string, sellDto: SellDto) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: sellDto.inventoryId },
      include: { item: true },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 판매할 수 있습니다.');
    }

    if (inventory.isEquipped) {
      throw new BadRequestException('장착 중인 아이템은 판매할 수 없습니다.');
    }

    const quantity = sellDto.quantity ?? inventory.quantity;

    if (quantity > inventory.quantity) {
      throw new BadRequestException('보유 수량이 부족합니다.');
    }

    const totalGold = inventory.item.sellPrice * quantity;

    if (quantity >= inventory.quantity) {
      await this.prisma.inventory.delete({
        where: { id: sellDto.inventoryId },
      });
    } else {
      await this.prisma.inventory.update({
        where: { id: sellDto.inventoryId },
        data: { quantity: { decrement: quantity } },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: totalGold } },
    });

    return { soldQuantity: quantity, goldEarned: totalGold };
  }

  async discard(userId: string, inventoryId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventory) {
      throw new NotFoundException('인벤토리 아이템을 찾을 수 없습니다.');
    }

    if (inventory.userId !== userId) {
      throw new ForbiddenException('본인의 아이템만 버릴 수 있습니다.');
    }

    if (inventory.isEquipped) {
      throw new BadRequestException('장착 중인 아이템은 버릴 수 없습니다.');
    }

    await this.prisma.inventory.delete({
      where: { id: inventoryId },
    });

    return { message: '아이템이 삭제되었습니다.' };
  }
}
