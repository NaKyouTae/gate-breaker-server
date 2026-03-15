import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { DungeonService } from './dungeon.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('dungeon')
@UseGuards(JwtAuthGuard)
export class DungeonController {
  constructor(private readonly dungeonService: DungeonService) {}

  @Get()
  async findAll() {
    return this.dungeonService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dungeonService.findOne(id);
  }

  @Post(':id/enter')
  async enter(
    @CurrentUser('userId') userId: string,
    @Param('id') dungeonId: string,
    @Query('monsterIndex') monsterIndex?: string,
  ) {
    const idx = monsterIndex != null ? parseInt(monsterIndex, 10) : undefined;
    return this.dungeonService.enter(userId, dungeonId, idx);
  }
}
