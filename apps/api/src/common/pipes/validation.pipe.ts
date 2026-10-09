import { ArgumentMetadata, Injectable, Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidationPipe implements Type<any> {
  async transform(value: any, metadata: ArgumentMetadata) {
    const object = plainToInstance(metadata.metatype as any, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map((err) => {
        return Object.values(err.constraints || {});
      }).flat();

      throw new Error(messages.join(', '));
    }

    return value;
  }

  static whitelist(object: any, whitelist = true) {
    // Placeholder for whitelist logic
    return object;
  }

  static forbidNonWhitelisted(object: any, forbidNonWhitelisted = true) {
    // Placeholder for forbidNonWhitelisted logic
    return object;
  }
}