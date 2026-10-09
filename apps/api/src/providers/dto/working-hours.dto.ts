import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsInt, Max, Min, Matches, ValidateNested } from 'class-validator';

export class WorkingHourItemDto {
  @IsInt()
  @Min(0)
  @Max(6)
  day_of_week: number;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time: string;
}

export class WorkingHoursDto {
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique((item: WorkingHourItemDto) => item.day_of_week)
  @ValidateNested({ each: true })
  @Type(() => WorkingHourItemDto)
  hours: WorkingHourItemDto[];
}