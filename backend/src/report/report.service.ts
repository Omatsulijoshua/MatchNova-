import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReportDto,
  ResolveReportDto,
  ModerateUserDto,
} from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    if (reporterId === dto.reportedId) {
      throw new BadRequestException('You cannot report your own profile.');
    }

    const reportedUser = await this.prisma.user.findUnique({
      where: { id: dto.reportedId },
    });
    if (!reportedUser) {
      throw new NotFoundException('Reported user not found.');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedId,
        reason: dto.reason,
        details: dto.details,
      },
    });
  }

  async listReports() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, email: true },
        },
        reported: {
          select: { id: true, email: true, status: true },
        },
      },
    });
  }

  async resolveReport(reportId: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Report ticket not found.');
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
    });
  }

  async moderateUser(
    adminId: string,
    targetUserId: string,
    dto: ModerateUserDto,
  ) {
    if (adminId === targetUserId) {
      throw new BadRequestException(
        'You cannot moderate/suspend your own account.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
    });
  }
}
