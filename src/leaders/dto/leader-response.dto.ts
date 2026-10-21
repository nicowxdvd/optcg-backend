import { ApiProperty } from '@nestjs/swagger';

export class LeaderResponseDto {
  @ApiProperty() externalId!                                    : string;
  @ApiProperty() cardCode!                                      : string;
  @ApiProperty() name!                                          : string;
  @ApiProperty() rarity!                                        : string;
  @ApiProperty() color!                                         : string;
  @ApiProperty() life!                                          : number | null;
  @ApiProperty() power!                                         : number | null;
  @ApiProperty({ type: String, nullable: true }) attribute!     : string | null;
  @ApiProperty({ type: String, nullable: true }) effect!        : string | null;
  @ApiProperty() imageUrl!                                      : string;
  @ApiProperty() set!                                           : string;
  @ApiProperty({ type: [String] }) traits!                      : string[];
}