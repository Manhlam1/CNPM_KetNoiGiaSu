import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../../common/timestamped';
import { TutorProfile } from './tutor-profile.entity';

/** Chứng chỉ / bằng cấp gia sư tải lên để admin duyệt */
@Entity('tutor_certificates')
export class TutorCertificate extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tutorProfileId: number;

  @ManyToOne(() => TutorProfile, (p) => p.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutorProfileId' })
  tutorProfile: TutorProfile;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 500 })
  fileUrl: string;

  @Column({ length: 100 })
  mimeType: string;
}
