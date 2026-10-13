import { RawGithubCard } from '../interfaces/raw-github-card.interface';
import { CardType } from '../enums/card-type.enum';
import { CardUpsertInput } from '../interfaces/card-upsert-input.interface';
import { LeaderUpsertInput } from '../interfaces/leader-upsert-input.interface';



export function isLeaderCard(raw: RawGithubCard): boolean {
    const category = (raw.type || '').toLowerCase();
    return category === 'leader';

}



export function parseColor(color: string | string[] | undefined): string {
    if (Array.isArray(color))
        return color.join('/');

    return color || 'Colorless';

}



export function parseTraits(rawTraitString: string | undefined): string[] {
    if (!rawTraitString)
        return [];

    return rawTraitString.split('/').map((t) => t.trim()).filter((t) => t.length > 0);

}



export function mapCardType(rawType: string | undefined): CardType {
    const type = (rawType || '').toLowerCase();

    if (type.includes('leader'))
        return CardType.LEADER;

    if (type.includes('event'))
        return CardType.EVENT;

    if (type.includes('stage'))
        return CardType.STAGE;

    return CardType.CHARACTER;

}



export function parseSetCode(setName: string | undefined): string | null {
    const match = (setName || '').match(/\[(.+?)\]/);
    return match ? match[1] : null;
}



export function parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '')
        return null;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}



export function requireNumber(value: string | number | null | undefined, field: string, raw: RawGithubCard): number {
    const parsed = parseNumber(value);

    if (parsed === null)
        throw new Error(`Carta ${raw.id} sin ${field}`);

    return parsed;
}



export function toCardInput(raw: RawGithubCard, setId: number, traitIdByName: Map<string, number>): CardUpsertInput {
    return {
        externalId    : raw.id!,
        cardCode      : raw.code!,
        setId,
        name          : raw.name!,
        type          : mapCardType(raw.type),
        rarity        : raw.rarity!,
        color         : parseColor(raw.color),
        cost          : parseNumber(raw.cost),
        power         : parseNumber(raw.power),
        counterValue  : parseNumber(raw.counter),
        attribute     : raw.attribute?.name ?? null,
        effect        : raw.ability || null,
        triggerEffect : raw.trigger || null,
        imageUrl      : parseImageUrl(raw),
        traitIds      : resolveTraitIds(raw.family, traitIdByName),
    };
}



export function toLeaderInput(raw: RawGithubCard, setId: number, traitIdByName: Map<string, number>): LeaderUpsertInput {
    return {
        externalId : raw.id!,
        cardCode   : raw.code!,
        setId,
        name       : raw.name!,
        rarity     : raw.rarity!,
        color      : parseColor(raw.color),
        life       : requireNumber(raw.cost, 'life', raw),
        power      : requireNumber(raw.power, 'power', raw),
        attribute  : raw.attribute?.name ?? null,
        effect     : raw.ability || null,
        imageUrl   : parseImageUrl(raw),
        traitIds   : resolveTraitIds(raw.family, traitIdByName),
    };
}



export function resolveTraitIds(family:string | undefined, traitIdByName: Map<string, number>  ){
    return  parseTraits(family).map((n) => traitIdByName.get(n)).filter((id) => id !== undefined)
}



export function parseImageUrl(raw: RawGithubCard): string {
    const url = raw.images?.large || raw.images?.small;

    if (!url)
        throw new Error(`Carta ${raw.id} sin imagen`);

    return url;
}

