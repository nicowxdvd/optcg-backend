export interface RawGithubCard {
  id?        : string,
  code?      : string;
  name?      : string;
  type?      : string;
  color?     : string | string[];
  cost?      : number;
  power?     : number;
  life?      : number;
  counter?   : number;
  attribute? : string;
  effect?    : string;
  text?      : string;
  image_url? : string;
  src?       : string;
  sub_type?  : string;
}