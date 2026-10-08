import { RawGithubCard } from '../interfaces/raw-github-card.interface';
import { CardType } from '../enums/card-type.enum';



export function isLeaderCard(raw: RawGithubCard): boolean {
    const category = (raw.category || raw.type || raw.card_type || '').toLowerCase();
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

    if (type.includes('event'))
        return CardType.EVENT;

    if (type.includes('stage'))
        return CardType.STAGE;

    return CardType.CHARACTER;

}
