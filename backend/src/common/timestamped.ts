import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

/**
 * createdAt/updatedAt do ứng dụng gán (giờ UTC), không dùng CURRENT_TIMESTAMP của MySQL
 * để tránh lệch múi giờ giữa máy chủ DB và ứng dụng.
 */
export abstract class Timestamped {
  @Column({ type: 'datetime', precision: 3 })
  createdAt: Date;

  @Column({ type: 'datetime', precision: 3 })
  updatedAt: Date;

  @BeforeInsert()
  protected setCreatedAt() {
    const now = new Date();
    if (!this.createdAt) this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  protected setUpdatedAt() {
    this.updatedAt = new Date();
  }
}
