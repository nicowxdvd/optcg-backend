import { CardType } from "../../cards/enums/card-type.enum";

export interface CardUpsertInput{
    externalId   : string;
    cardCode     : string;
    setId        : number;
    name         : string;
    type         : CardType;
    rarity       : string;
    color        : string;
    cost         : number | null;
    power        : number | null;
    counterValue : number | null;
    attribute    : string | null;
    effect       : string | null;
    triggerEffect: string | null;
    imageUrl     : string;
    traitIds     : number[];
}