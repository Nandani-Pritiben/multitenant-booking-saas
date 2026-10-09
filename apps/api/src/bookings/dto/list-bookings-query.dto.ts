import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ListBookingsQueryDto {
  /** Filter by a single calendar date: YYYY-MM-DD */
  @IsOptional()
  @IsDateString()
  date?: string;

  /** Lower bound (inclusive) for start_at: ISO 8601 date or datetime */
  @IsOptional()
  @IsString()
  start_date?: string;

  /** Upper bound (inclusive) for start_at: ISO 8601 date or datetime */
  @IsOptional()
  @IsString()
  end_date?: string;

  /** Filter by provider UUID */
  @IsOptional()
  @IsUUID()
  provider_id?: string;

  /** Filter by booking status */
  @IsOptional()
  @IsIn(['confirmed', 'cancelled', 'completed', 'no_show'])
  status?: string;

  /** Full-text customer search: matches customer_name or customer_email (case-insensitive) */
  @IsOptional()
  @IsString()
  search?: string;
}
