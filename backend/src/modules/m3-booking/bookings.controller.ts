import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { AvailabilityService } from './availability.service';
import { AdminBookingQueryDto, BookingQueryDto, CancelBookingDto, CreateBookingDto, CreateRuleDto, SlotRangeDto } from './booking.dto';
import { BookingsService } from './bookings.service';

@ApiTags('M3 - Lịch trống')
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /** Slot còn trống của một gia sư (công khai) */
  @Public()
  @Get('tutors/:id/slots')
  publicSlots(@Param('id', ParseIntPipe) id: number, @Query() q: SlotRangeDto) {
    return this.availability.publicSlots(id, q.from, q.to);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Get('availability/rules')
  rules(@CurrentUser() u: AuthUser) {
    return this.availability.listRules(u.id);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Post('availability/rules')
  createRule(@CurrentUser() u: AuthUser, @Body() dto: CreateRuleDto) {
    return this.availability.createRule(u.id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Delete('availability/rules/:id')
  deleteRule(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.availability.deleteRule(u.id, id);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Get('availability/slots')
  mySlots(@CurrentUser() u: AuthUser, @Query() q: SlotRangeDto) {
    return this.availability.tutorSlots(u.id, q.from, q.to);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Delete('availability/slots/:id')
  cancelSlot(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.availability.cancelSlot(u.id, id);
  }
}

@ApiTags('M3 - Buổi học')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  /** Học viên chọn slot -> giữ chỗ, chờ thanh toán */
  @Roles(Role.STUDENT)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateBookingDto) {
    return this.bookings.create(u, dto);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get('me')
  mine(@CurrentUser() u: AuthUser, @Query() q: BookingQueryDto) {
    return this.bookings.listMine(u, q);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get('me/counts')
  counts(@CurrentUser() u: AuthUser) {
    return this.bookings.statusCounts(u.role === Role.TUTOR ? { tutorUserId: u.id } : { studentId: u.id });
  }

  @Get(':id')
  detail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bookings.detail(u, id);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CancelBookingDto) {
    return this.bookings.cancel(u, id, dto.reason);
  }

  @Roles(Role.TUTOR)
  @Post(':id/mark-taught')
  @HttpCode(200)
  markTaught(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bookings.markTaught(u, id);
  }

  @Roles(Role.STUDENT)
  @Post(':id/confirm')
  @HttpCode(200)
  confirm(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.bookings.confirm(u, id);
  }
}

@ApiTags('M3 - Admin: buổi học')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  list(@Query() q: AdminBookingQueryDto) {
    return this.bookings.adminList(q);
  }

  @Get('counts')
  counts() {
    return this.bookings.statusCounts();
  }
}
