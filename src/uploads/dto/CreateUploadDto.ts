import { IsIn, IsInt, Max, Min } from "class-validator";

export class CreateUploadDto {
    @IsIn(['image/jpeg', 'image/png', 'image/webp'])
    contentType: string;

    @IsInt()
    @Max(5 * 1024 * 1024) 
    @Min(1)
    size: number;
}