import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  getTasks(@Req() req) {
    return this.tasksService.findAllByUser(req.user.id);
  }

  @Post()
  createTask(@Body() dto: CreateTaskDto, @Req() req) {
    return this.tasksService.create(dto, req.user.id);
  }

  @Patch(':id')
  updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto, @Req() req) {
    return this.tasksService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  deleteTask(@Param('id') id: string, @Req() req) {
    return this.tasksService.remove(id, req.user.id);
  }
}
