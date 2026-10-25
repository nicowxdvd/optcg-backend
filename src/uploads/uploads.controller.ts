import { BadRequestException, Controller, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { UploadsService } from "./uploads.service";
import { FileInterceptor } from "@nestjs/platform-express";

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Controller({ path: 'uploads', version: '1' })
export class UploadsController {

  constructor(
    private readonly uploads: UploadsService
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits     : { fileSize: 5 * 1024 * 1024 },
    fileFilter : (req, file, callback) => ALLOWED_TYPES.includes(file.mimetype) ? callback(null, true) : callback(new BadRequestException('Tipo de archivo no permitido'), false),
  }))
  create(@UploadedFile() file: Express.Multer.File) {
    if (!file) 
        throw new BadRequestException('Falta el archivo');

    return this.uploads.create(file);
  }

}