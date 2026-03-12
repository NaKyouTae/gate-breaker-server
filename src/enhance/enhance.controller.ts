import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { EnhanceService } from './enhance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EnhanceDto } from './dto/enhance.dto';

@Controller('enhance')
@UseGuards(JwtAuthGuard)
export class EnhanceController {
  constructor(private readonly enhanceService: EnhanceService) {}

  @Post()
  async enhance(
    @CurrentUser('userId') userId: string,
    @Body() enhanceDto: EnhanceDto,
  ) {
    return this.enhanceService.enhance(userId, enhanceDto);
  }

  @Get('info/:id')
  async getEnhanceInfo(@Param('id') inventoryId: string) {
    return this.enhanceService.getEnhanceInfo(inventoryId);
  }
}
