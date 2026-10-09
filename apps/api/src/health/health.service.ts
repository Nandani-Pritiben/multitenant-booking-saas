import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  async check() {
    return {
      success: true,
      data: {
        status: 'ok',
      },
    };
  }
}