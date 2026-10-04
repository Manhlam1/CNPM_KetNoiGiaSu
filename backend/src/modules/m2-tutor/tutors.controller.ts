import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { badRequest } from '../../common/app.exception';
import { Audit, AuthUser, CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { publicUrl, uploadOptions } from '../../common/upload';
import { AdminTutorQueryDto, CertificateDto, RejectTutorDto, SearchTutorsDto, UpdateTutorProfileDto } from './tutor.dto';
import { TutorsService } from './tutors.service';

@ApiTags('M2 - Danh mục')
@Controller('meta')
export class MetaController {
  constructor(private readonly tutors: TutorsService) {}

  /** Môn học, cấp học, thành phố/khu vực cho bộ lọc */
  @Public()
  @Get()
  meta() {
    return this.tutors.meta();
  }
}

@ApiTags('M2 - Tìm gia sư')
@Controller('tutors')
export class TutorsController {
  constructor(private readonly tutors: TutorsService) {}

  @Public()
  @Get()
  search(@Query() q: SearchTutorsDto) {
    return this.tutors.search(q);
  }

  @Public()
  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @CurrentUser() viewer?: AuthUser) {
    return this.tutors.detail(id, viewer);
  }
}

@ApiTags('M2 - Hồ sơ gia sư (của tôi)')
@ApiBearerAuth()
@Roles(Role.TUTOR)
@Controller('tutor-profile')
export class TutorProfileController {
  constructor(private readonly tutors: TutorsService) {}

  @Get()
  mine(@CurrentUser() u: AuthUser) {
    return this.tutors.mine(u.id);
  }

  @Put()
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateTutorProfileDto) {
    return this.tutors.updateMine(u.id, dto);
  }

  @Post('submit')
  @HttpCode(200)
  submit(@CurrentUser() u: AuthUser) {
    return this.tutors.submitMine(u.id);
  }

  @Post('certificates')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadOptions('certificates')))
  addCert(@CurrentUser() u: AuthUser, @Body() dto: CertificateDto, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw badRequest('NO_FILE', 'Chưa chọn file chứng chỉ');
    return this.tutors.addCertificate(u.id, dto.title, publicUrl('certificates', file.filename), file.mimetype);
  }

  @Delete('certificates/:id')
  removeCert(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tutors.removeCertificate(u.id, id);
  }
}

@ApiTags('M2 - Admin: duyệt gia sư')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/tutors')
export class AdminTutorsController {
  constructor(private readonly tutors: TutorsService) {}

  @Get()
  list(@Query() q: AdminTutorQueryDto) {
    return this.tutors.adminList(q);
  }

  @Get('counts')
  counts() {
    return this.tutors.adminCounts();
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Audit('TUTOR_APPROVE')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.tutors.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Audit('TUTOR_REJECT')
  reject(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectTutorDto) {
    return this.tutors.reject(id, dto.reason);
  }
}
