import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ShopService } from './shop.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BuyDto } from './dto/buy.dto';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  async getShopItems() {
    return this.shopService.getShopItems();
  }

  @Post('buy')
  async buy(
    @CurrentUser('userId') userId: string,
    @Body() buyDto: BuyDto,
  ) {
    return this.shopService.buy(userId, buyDto);
  }
}
