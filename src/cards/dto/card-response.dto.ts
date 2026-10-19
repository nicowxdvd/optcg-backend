import { ApiProperty } from '@nestjs/swagger';
import { CardType } from '../enums/card-type.enum';

export class CardResponseDto {
  @ApiProperty() externalId!                                    : string;
  @ApiProperty() cardCode!                                      : string;
  @ApiProperty() name!                                          : string;
  @ApiProperty({ enum: CardType }) type!                        : CardType;
  @ApiProperty() rarity!                                        : string;
  @ApiProperty() color!                                         : string;
  @ApiProperty({ type: Number, nullable: true }) cost!          : number | null;
  @ApiProperty({ type: Number, nullable: true }) power!         : number | null;
  @ApiProperty({ type: Number, nullable: true }) counterValue!  : number | null;
  @ApiProperty({ type: String, nullable: true }) attribute!     : string | null;
  @ApiProperty({ type: String, nullable: true }) effect!        : string | null;
  @ApiProperty({ type: String, nullable: true }) triggerEffect! : string | null;
  @ApiProperty() imageUrl!                                      : string;
}
