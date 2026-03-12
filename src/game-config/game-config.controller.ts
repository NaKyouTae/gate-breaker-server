import { Controller, Get, Put, Post, Param, Body, Query } from '@nestjs/common';
import { GameConfigService } from './game-config.service';
import { UpdateConfigDto } from './dto/update-config.dto';

@Controller('config')
export class GameConfigController {
  constructor(private readonly gameConfigService: GameConfigService) {}

  @Get()
  getAllConfigs(@Query('category') category?: string) {
    return this.gameConfigService.getAllConfigs(category);
  }

  @Get(':category')
  getConfigsByCategory(@Param('category') category: string) {
    return this.gameConfigService.getConfigsByCategory(category);
  }

  @Get(':category/:key')
  getConfig(@Param('category') category: string, @Param('key') key: string) {
    return this.gameConfigService.getConfig(category, key);
  }

  @Put(':category/:key')
  updateConfig(
    @Param('category') category: string,
    @Param('key') key: string,
    @Body() dto: UpdateConfigDto,
  ) {
    return this.gameConfigService.updateConfig(category, key, dto.value, dto.description);
  }

  @Post('seed')
  seedDefaults() {
    return this.gameConfigService.seedDefaults();
  }
}
