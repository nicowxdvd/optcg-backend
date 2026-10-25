import { Body, Controller, Post } from "@nestjs/common";
import { UploadsService } from "./uploads.service";
import { CreateUploadDto } from "./dto/CreateUploadDto";
@Controller({ path: 'uploads', version: '1' })
export class UploadsController {



  constructor(
    private readonly uploads: UploadsService
  ) {}



  @Post()
  create(@Body() dto: CreateUploadDto) {
    return this.uploads.create(dto);
  }

}