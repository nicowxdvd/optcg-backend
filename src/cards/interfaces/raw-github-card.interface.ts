export interface RawGithubCard {
  code?: string;
  card_code?: string;
  name?: string;
  card_name?: string;
  category?: string;
  type?: string;
  card_type?: string;
  color?: string | string[];
  card_color?: string | string[];
  cost?: number;
  power?: number;
  life?: number;
  counter?: number;
  counter_value?: number;
  attribute?: string;
  effect?: string;
  text?: string;
  image_url?: string;
  src?: string;
  sub_type?: string;
  attribute_type?: string;
}