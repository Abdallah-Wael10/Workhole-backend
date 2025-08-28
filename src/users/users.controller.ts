import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto, @Request() req) {
    return this.usersService.create(dto, req.user.role);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user.role);
  }

  @Get()
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user.role);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto, @Request() req) {
    return this.usersService.update(id, dto, req.user.role);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user.role);
  }
}
