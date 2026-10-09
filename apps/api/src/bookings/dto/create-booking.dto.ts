import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  service_id: string;

  @IsUUID()
  provider_id: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i)
  start_at: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  customer_name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(254)
  customer_email: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(/^\+?(?=.*\d)[0-9()\-\s]{7,20}$/)
  customer_phone: string;
}