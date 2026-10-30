export const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');



export const traitExists = (alias: string, joinTable: string, fk: string, param: string) =>
  `EXISTS (SELECT 1 FROM ${joinTable} jt INNER JOIN traits t ON t.id = jt.trait_id WHERE jt.${fk} = ${alias}.id AND t.name LIKE :${param})`;