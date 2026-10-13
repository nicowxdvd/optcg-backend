export interface RawGithubCard {
  id?        : string,
  code?      : string;
  name?      : string;
  type?      : string;
  color?     : string | string[];
  cost?      : number | string;
  power?     : number | string;
  counter?   : string | number;
  attribute? : { name?: string; image?: string };
  rarity?    : string;
  family?    : string;
  ability?   : string;
  trigger?   : string;
  images?    : { small?: string; large?: string };
  set?       : { name?: string };
  notes?     : unknown[];
}