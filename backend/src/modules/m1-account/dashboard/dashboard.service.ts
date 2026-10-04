import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Số liệu tổng quan cho admin. Đọc thẳng các bảng của M2-M5 bằng SQL
 * (chỉ đọc) để M1 không phụ thuộc vòng vào các module khác.
 */
@Injectable()
export class DashboardService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async one(sql: string, params: any[] = []) {
    const [row] = await this.ds.query(sql, params);
    return row || {};
  }

  async admin() {
    const users = await this.ds.query(`SELECT role, COUNT(*) n FROM users WHERE deletedAt IS NULL GROUP BY role`);
    const bookings = await this.ds.query(`SELECT status, COUNT(*) n FROM bookings GROUP BY status`);
    const wallets = await this.ds.query(`SELECT code, balance FROM wallets WHERE code IN ('ESCROW','PLATFORM')`);
    const paid = await this.one(`SELECT COALESCE(SUM(amount),0) s, COUNT(*) n FROM payments WHERE status = 'SUCCESS'`);
    const pendingTutors = await this.one(`SELECT COUNT(*) n FROM tutor_profiles WHERE status = 'PENDING'`);
    const openDisputes = await this.one(`SELECT COUNT(*) n FROM disputes WHERE status = 'OPEN'`);
    const pendingWithdrawals = await this.one(`SELECT COUNT(*) n, COALESCE(SUM(amount),0) s FROM withdrawals WHERE status = 'PENDING'`);

    // 6 tháng gần nhất theo giờ Việt Nam
    const months: string[] = [];
    const now = new Date(Date.now() + 7 * 3600_000);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push(d.toISOString().slice(0, 7));
    }
    const ym = (col: string) => `DATE_FORMAT(CONVERT_TZ(${col}, '+00:00', '+07:00'), '%Y-%m')`;
    const revenue = await this.ds.query(
      `SELECT ${ym('createdAt')} m, SUM(amount) s FROM wallet_transactions WHERE type = 'COMMISSION' GROUP BY m`,
    );
    const gmv = await this.ds.query(`SELECT ${ym('paidAt')} m, SUM(amount) s FROM payments WHERE status = 'SUCCESS' GROUP BY m`);
    const completed = await this.ds.query(`SELECT ${ym('completedAt')} m, COUNT(*) n FROM bookings WHERE status = 'COMPLETED' GROUP BY m`);
    const pick = (rows: any[], m: string, key = 's') => Number(rows.find((r) => r.m === m)?.[key] || 0);

    const recent = await this.ds.query(
      `SELECT b.id, b.code, b.status, b.price, b.startAt, s.fullName student, u.fullName tutor
       FROM bookings b JOIN users s ON s.id = b.studentId JOIN users u ON u.id = b.tutorUserId
       ORDER BY b.id DESC LIMIT 6`,
    );

    const toMap = (rows: any[], k: string) => Object.fromEntries(rows.map((r) => [r[k], Number(r.n)]));
    return {
      users: toMap(users, 'role'),
      bookings: toMap(bookings, 'status'),
      balances: Object.fromEntries(wallets.map((w: any) => [w.code, Number(w.balance)])),
      totalPaid: Number(paid.s || 0),
      paymentCount: Number(paid.n || 0),
      pendingTutors: Number(pendingTutors.n || 0),
      openDisputes: Number(openDisputes.n || 0),
      pendingWithdrawals: { count: Number(pendingWithdrawals.n || 0), amount: Number(pendingWithdrawals.s || 0) },
      monthly: months.map((m) => ({ month: m, commission: pick(revenue, m), gmv: pick(gmv, m), completedLessons: pick(completed, m, 'n') })),
      recentBookings: recent.map((r: any) => ({ ...r, price: Number(r.price) })),
    };
  }
}
