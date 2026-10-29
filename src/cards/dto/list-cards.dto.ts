import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const toOptionalInt = ({ value }: { value: unknown }) => typeof value === 'string' ? (value.trim() === '' ? undefined : Number(value)) : value;

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
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? (value.trim() || undefined) : value)
  @IsString({ message: 'name debe ser un texto' })
  @MaxLength(100, { message: 'name debe tener como máximo $constraint1 caracteres' })
  name?: string;



  @ApiPropertyOptional({ maxLength: 20, example: 'OP01-001' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? (value.trim().toUpperCase() || undefined) : value)
  @IsString({ message: 'code debe ser un texto' })
  @MaxLength(20, { message: 'code debe tener como máximo $constraint1 caracteres' })
  code?: string;



  @ApiPropertyOptional({ minimum: 0, example: 3 })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt({ message: 'cost debe ser un número entero' })
  @Min(0, { message: 'cost debe ser mayor o igual a $constraint1' })
  cost?: number;



  @ApiPropertyOptional({ minimum: 0, example: 2 })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt({ message: 'costMin debe ser un número entero' })
  @Min(0, { message: 'costMin debe ser mayor o igual a $constraint1' })
  costMin?: number;



  @ApiPropertyOptional({ minimum: 0, example: 5 })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt({ message: 'costMax debe ser un número entero' })
  @Min(0, { message: 'costMax debe ser mayor o igual a $constraint1' })
  costMax?: number;

}