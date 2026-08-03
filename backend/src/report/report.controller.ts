import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReportService } from './report.service';
import {
  CreateReportDto,
  ResolveReportDto,
  ModerateUserDto,
} from './dto/report.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserStatusGuard } from '../auth/guards/user-status.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), UserStatusGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  async fileReport(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReportDto,
  ) {
    return await this.reportService.createReport(req.user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async getReports() {
    return await this.reportService.listReports();
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  async resolveTicket(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return await this.reportService.resolveReport(id, dto);
  }

  @Post('moderate/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async moderateUser(
    @Request() req: { user: { id: string } },
    @Param('userId') userId: string,
    @Body() dto: ModerateUserDto,
  ) {
    return await this.reportService.moderateUser(req.user.id, userId, dto);
  }
}
