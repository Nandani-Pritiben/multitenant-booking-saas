import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @IsOptional()
  @IsUUID()
  business_id?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  business_slug?: string;

  @IsUUID()
  service_id: string;

  @IsOptional()
  @IsUUID()
  provider_id?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}

export class PublicAvailabilityQueryDto {
  @IsUUID()
  service_id: string;

  @IsOptional()
  @IsUUID()
  provider_id?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}