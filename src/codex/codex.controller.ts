import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CodexService } from './codex.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('codex')
@UseGuards(JwtAuthGuard)
export class CodexController {
  constructor(private readonly codexService: CodexService) {}

  @Get('items')
  async getItems(@CurrentUser('userId') userId: string) {
    return this.codexService.getItems(userId);
  }

  @Get('items/:id')
  async getItemDetail(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.codexService.getItemDetail(userId, id);
  }

  @Get('monsters')
  async getMonsters(@CurrentUser('userId') userId: string) {
    return this.codexService.getMonsters(userId);
  }

  @Get('monsters/:id')
  async getMonsterDetail(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.codexService.getMonsterDetail(userId, id);
  }
}
