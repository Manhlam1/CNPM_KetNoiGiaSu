import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Môn học (dữ liệu hệ thống, tạo sẵn khi khởi động) */
@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  @Column({ length: 100 })
  slug: string;

  /** Nhóm môn: Phổ thông, Ngoại ngữ, Tin học, Năng khiếu */
  @Column({ length: 50 })
  groupName: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
