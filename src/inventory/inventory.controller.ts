import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EquipDto } from './dto/equip.dto';
import { SellDto } from './dto/sell.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventory(@CurrentUser('userId') userId: string) {
    return this.inventoryService.findAll(userId);
  }

  @Post('equip')
  async equip(
    @CurrentUser('userId') userId: string,
    @Body() equipDto: EquipDto,
  ) {
    return this.inventoryService.equip(userId, equipDto);
  }

  @Post('unequip')
  async unequip(
    @CurrentUser('userId') userId: string,
    @Body() equipDto: EquipDto,
  ) {
    return this.inventoryService.unequip(userId, equipDto);
  }

  @Post('sell')
  async sell(
    @CurrentUser('userId') userId: string,
    @Body() sellDto: SellDto,
  ) {
    return this.inventoryService.sell(userId, sellDto);
  }

  @Post('restore')
  async restore(
    @CurrentUser('userId') userId: string,
    @Body() equipDto: EquipDto,
  ) {
    return this.inventoryService.restore(userId, equipDto.inventoryId);
  }

  @Delete(':id')
  async discard(
    @CurrentUser('userId') userId: string,
    @Param('id') inventoryId: string,
  ) {
    return this.inventoryService.discard(userId, inventoryId);
  }
}
