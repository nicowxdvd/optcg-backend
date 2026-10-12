export interface LeaderUpsertInput{
    externalId : string;
    cardCode   : string;
    setId      : number;
    name       : string;
    rarity     : string;
    color      : string;
    life       : number;
    power      : number;
    attribute  : string | null;
    effect     : string | null;
    imageUrl   : string;
    traitIds   : number[];
}