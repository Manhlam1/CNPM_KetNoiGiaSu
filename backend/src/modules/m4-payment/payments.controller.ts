import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Audit, AuthUser, CurrentUser, Public, RawResponse, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';
import { AdminPaymentQueryDto, AdminWithdrawalQueryDto, CreatePaymentDto, MockCompleteDto, RejectWithdrawalDto, ReviewWithdrawalDto, WithdrawalRequestDto } from './payment.dto';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';
import { WithdrawalsService } from './withdrawals.service';

@ApiTags('M4 - Thanh toán')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('providers')
  providers() {
    return this.payments.providers();
  }

  /** Học viên bắt đầu thanh toán buổi học -> nhận URL cổng thanh toán */
  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Post('bookings/:bookingId')
  create(@CurrentUser() u: AuthUser, @Param('bookingId', ParseIntPipe) bookingId: number, @Body() dto: CreatePaymentDto, @Req() req: any) {
    return this.payments.createForBooking(u.id, bookingId, dto.provider, String(req.ip || '').replace('::ffff:', ''));
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Get('me')
  mine(@CurrentUser() u: AuthUser, @Query() q: PageQueryDto) {
    return this.payments.listMine(u.id, q);
  }

  // ---- Cổng giả lập
  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Get('mock/:txnRef')
  mockInfo(@CurrentUser() u: AuthUser, @Param('txnRef') txnRef: string) {
    return this.payments.mockInfo(u.id, txnRef);
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Post('mock/:txnRef/complete')
  @HttpCode(200)
  mockComplete(@CurrentUser() u: AuthUser, @Param('txnRef') txnRef: string, @Body() dto: MockCompleteDto) {
    return this.payments.mockComplete(u.id, txnRef, dto.success);
  }

  // ---- VNPay
  /** IPN: VNPay gọi server-to-server, trả đúng định dạng { RspCode, Message } */
  @Public()
  @RawResponse()
  @Get('vnpay/ipn')
  ipn(@Query() q: Record<string, any>) {
    return this.payments.vnpayIpn(q);
  }

  /** Return URL: trình duyệt quay về sau khi thanh toán -> chuyển tới trang kết quả của frontend */
  @Public()
  @RawResponse()
  @Get('vnpay/return')
  async vnpReturn(@Query() q: Record<string, any>, @Res() res: any) {
    res.redirect(await this.payments.vnpayReturn(q));
  }
}

@ApiTags('M4 - Ví')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletService) {}

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.wallets.summary(u.id, u.role);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get('me/transactions')
  txs(@CurrentUser() u: AuthUser, @Query() q: PageQueryDto) {
    return this.wallets.transactions(u.id, q);
  }
}

@ApiTags('M4 - Rút tiền')
@ApiBearerAuth()
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  @Roles(Role.TUTOR)
  @Post()
  request(@CurrentUser() u: AuthUser, @Body() dto: WithdrawalRequestDto) {
    return this.withdrawals.request(u.id, dto);
  }

  @Roles(Role.TUTOR)
  @Get('me')
  mine(@CurrentUser() u: AuthUser, @Query() q: PageQueryDto) {
    return this.withdrawals.mine(u.id, q);
  }
}

@ApiTags('M4 - Admin: dòng tiền')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminFinanceController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly wallets: WalletService,
    private readonly withdrawals: WithdrawalsService,
  ) {}

  /** Số dư ví hệ thống + kiểm tra bất biến tiền */
  @Get('finance/summary')
  async summary() {
    return { balances: await this.wallets.balances(), invariants: await this.wallets.checkInvariants() };
  }

  @Get('payments')
  list(@Query() q: AdminPaymentQueryDto) {
    return this.payments.adminList(q);
  }

  @Get('withdrawals')
  withdrawalsList(@Query() q: AdminWithdrawalQueryDto) {
    return this.withdrawals.adminList(q);
  }

  @Post('withdrawals/:id/approve')
  @HttpCode(200)
  @Audit('WITHDRAWAL_APPROVE')
  approve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewWithdrawalDto) {
    return this.withdrawals.approve(u.id, id, dto.note);
  }

  @Post('withdrawals/:id/reject')
  @HttpCode(200)
  @Audit('WITHDRAWAL_REJECT')
  reject(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RejectWithdrawalDto) {
    return this.withdrawals.reject(u.id, id, dto.note);
  }
}
