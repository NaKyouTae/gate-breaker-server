import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { UploadService } from '../upload/upload.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CreateDungeonDto } from './dto/create-dungeon.dto';
import { UpdateDungeonDto } from './dto/update-dungeon.dto';
import { CreateMonsterDto } from './dto/create-monster.dto';
import { UpdateMonsterDto } from './dto/update-monster.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateDropTableDto } from './dto/create-drop-table.dto';
import { UpdateDropTableDto } from './dto/update-drop-table.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly uploadService: UploadService,
  ) {}

  // ============ DASHBOARD ============

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ============ USERS ============

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.getUsers(search, page, limit);
  }

  @Get('users/:id')
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/ban')
  toggleBanUser(@Param('id') id: string) {
    return this.adminService.toggleBanUser(id);
  }

  // ============ BATTLE LOGS ============

  @Get('logs')
  getBattleLogs(
    @Query('result') result?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.getBattleLogs(result, page, limit);
  }

  // ============ DUNGEONS ============

  @Get('dungeons')
  getDungeons() {
    return this.adminService.getDungeons();
  }

  @Post('dungeons')
  createDungeon(@Body() dto: CreateDungeonDto) {
    return this.adminService.createDungeon(dto);
  }

  @Patch('dungeons/:id')
  updateDungeon(@Param('id') id: string, @Body() dto: UpdateDungeonDto) {
    return this.adminService.updateDungeon(id, dto);
  }

  @Delete('dungeons/:id')
  deleteDungeon(@Param('id') id: string) {
    return this.adminService.deleteDungeon(id);
  }

  // ============ MONSTERS ============

  @Get('monsters')
  getMonsters() {
    return this.adminService.getMonsters();
  }

  @Post('monsters')
  createMonster(@Body() dto: CreateMonsterDto) {
    return this.adminService.createMonster(dto);
  }

  @Patch('monsters/:id')
  updateMonster(@Param('id') id: string, @Body() dto: UpdateMonsterDto) {
    return this.adminService.updateMonster(id, dto);
  }

  @Delete('monsters/:id')
  deleteMonster(@Param('id') id: string) {
    return this.adminService.deleteMonster(id);
  }

  @Post('monsters/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMonsterImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const monster = await this.adminService.getMonsterById(id);
    if (monster?.imageUrl) {
      await this.uploadService.deleteImage(monster.imageUrl);
    }
    const imageUrl = await this.uploadService.uploadImage(file, 'monsters');
    return this.adminService.updateMonsterImage(id, imageUrl);
  }

  @Delete('monsters/:id/image')
  async deleteMonsterImage(@Param('id') id: string) {
    const monster = await this.adminService.getMonsterById(id);
    if (monster?.imageUrl) {
      await this.uploadService.deleteImage(monster.imageUrl);
    }
    return this.adminService.updateMonsterImage(id, null);
  }

  // ============ ITEMS ============

  @Get('items')
  getItems() {
    return this.adminService.getItems();
  }

  @Post('items')
  createItem(@Body() dto: CreateItemDto) {
    return this.adminService.createItem(dto);
  }

  @Patch('items/:id')
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    return this.adminService.updateItem(id, dto);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    const item = await this.adminService.getItemById(id);
    if (item?.imageUrl) {
      await this.uploadService.deleteImage(item.imageUrl);
    }
    return this.adminService.deleteItem(id);
  }

  @Post('items/:id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadItemImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const item = await this.adminService.getItemById(id);
    if (item?.imageUrl) {
      await this.uploadService.deleteImage(item.imageUrl);
    }
    const imageUrl = await this.uploadService.uploadImage(file, 'items');
    return this.adminService.updateItemImage(id, imageUrl);
  }

  @Delete('items/:id/image')
  async deleteItemImage(@Param('id') id: string) {
    const item = await this.adminService.getItemById(id);
    if (item?.imageUrl) {
      await this.uploadService.deleteImage(item.imageUrl);
    }
    return this.adminService.updateItemImage(id, null);
  }

  // ============ SHOP ============

  @Get('shop')
  getShopItems() {
    return this.adminService.getShopItems();
  }

  @Patch('shop/:id')
  updateShopItem(@Param('id') id: string, @Body() dto: UpdateShopDto) {
    return this.adminService.updateShopItem(id, dto);
  }

  // ============ DROP TABLES ============

  @Get('drop-tables')
  getDropTables() {
    return this.adminService.getDropTables();
  }

  @Post('drop-tables')
  createDropTable(@Body() dto: CreateDropTableDto) {
    return this.adminService.createDropTable(dto);
  }

  @Patch('drop-tables/:id')
  updateDropTable(@Param('id') id: string, @Body() dto: UpdateDropTableDto) {
    return this.adminService.updateDropTable(id, dto);
  }

  @Delete('drop-tables/:id')
  deleteDropTable(@Param('id') id: string) {
    return this.adminService.deleteDropTable(id);
  }
}
