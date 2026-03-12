import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BattleService } from './battle.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('battle')
@UseGuards(JwtAuthGuard)
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('attack')
  async attack(@CurrentUser('userId') userId: string) {
    return this.battleService.attack(userId);
  }

  @Post('skill')
  async skill(@CurrentUser('userId') userId: string) {
    return this.battleService.skill(userId);
  }

  @Post('item')
  async useItem(@CurrentUser('userId') userId: string) {
    return this.battleService.useItem(userId);
  }

  @Post('escape')
  async escape(@CurrentUser('userId') userId: string) {
    return this.battleService.escape(userId);
  }

  @Get('status')
  async status(@CurrentUser('userId') userId: string) {
    return this.battleService.getStatus(userId);
  }

  @Post('confirm')
  async confirmResult(@CurrentUser('userId') userId: string) {
    return this.battleService.confirmResult(userId);
  }
}
