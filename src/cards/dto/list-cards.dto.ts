import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ListCardsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor o igual a $constraint1' })
  page: number = 1;



  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor o igual a $constraint1' })
  @Max(500, { message: 'limit debe ser menor o igual a $constraint1' })
  limit: number = 20;



  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined)
  @IsString({ message: 'name debe ser un texto' })
  @MaxLength(100, { message: 'name debe tener como máximo $constraint1 caracteres' })
  name?: string;

}