import { ApiProperty } from '@nestjs/swagger';
import { LeaderResponseDto } from './leader-response.dto';

export class PaginatedLeadersDto {
  @ApiProperty({ type: [LeaderResponseDto] }) items! : LeaderResponseDto[];
  @ApiProperty() total!                              : number;
  @ApiProperty() page!                               : number;
  @ApiProperty() totalPages!                         : number;
}
