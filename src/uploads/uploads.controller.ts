import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
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



  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.uploads.get(id);
  }

}