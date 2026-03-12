import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChannelService } from './channel.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('channel')
@UseGuards(JwtAuthGuard)
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Get()
  getChannels() {
    return this.channelService.getChannels();
  }

  @Get('search')
  searchChannels(@Query('name') name: string) {
    return this.channelService.searchChannels(name || '');
  }

  @Get('me')
  getMyChannel(@CurrentUser('userId') userId: string) {
    return this.channelService.getUserChannel(userId);
  }

  @Get(':id')
  getChannel(@Param('id') id: string) {
    return this.channelService.getChannel(id);
  }

  @Post()
  createChannel(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelService.createChannel(userId, dto);
  }

  @Post(':id/join')
  joinChannel(
    @Param('id') channelId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelService.joinChannel(channelId, userId);
  }

  @Post(':id/leave')
  leaveChannel(
    @Param('id') channelId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.channelService.leaveChannel(channelId, userId);
  }

  @Get(':id/chat')
  getChatHistory(@Param('id') channelId: string) {
    return this.channelService.getChatHistory(channelId);
  }
}
