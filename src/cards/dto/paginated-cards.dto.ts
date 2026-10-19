import { ApiProperty } from '@nestjs/swagger';
import { CardResponseDto } from './card-response.dto';

export class PaginatedCardsDto {
  @ApiProperty({ type: [CardResponseDto] }) items! : CardResponseDto[];
  @ApiProperty() total!                            : number;
  @ApiProperty() page!                             : number;
  @ApiProperty() totalPages!                       : number;
}
