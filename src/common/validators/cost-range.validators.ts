import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const read = (args: ValidationArguments, property: string) => (args.object as Record<string, unknown>)[property];



export function IsGreaterOrEqualTo(property: string, options?: ValidationOptions) {
  return (object: object, propertyName: string) => registerDecorator({
    name         : 'isGreaterOrEqualTo',
    target       : object.constructor,
    propertyName,
    constraints  : [property],
    options,
    validator    : {
      validate(value: unknown, args: ValidationArguments) {
        const other = read(args, args.constraints[0] as string);

        return typeof value !== 'number' || typeof other !== 'number' || value >= other;
      },
    },
  });
}



export function IsExclusiveWith(properties: string[], options?: ValidationOptions) {
  return (object: object, propertyName: string) => registerDecorator({
    name         : 'isExclusiveWith',
    target       : object.constructor,
    propertyName,
    constraints  : properties,
    options,
    validator    : {
      validate(value: unknown, args: ValidationArguments) {
        return value === undefined || (args.constraints as string[]).every(property => read(args, property) === undefined);
      },
    },
  });
}