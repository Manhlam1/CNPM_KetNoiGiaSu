import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Cấu hình hệ thống dạng key/value (admin sửa được) */
@Entity('system_configs')
export class SystemConfig {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ length: 255 })
  value: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  updatedAt: Date | null;
}
