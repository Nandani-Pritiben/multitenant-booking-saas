import { IsIn } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['confirmed', 'cancelled', 'completed', 'no_show'], {
    message: 'status must be one of: confirmed, cancelled, completed, no_show',
  })
  status!: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
}
