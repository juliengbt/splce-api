import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty, IsNotEmptyObject, IsOptional, IsString, MaxLength, ValidateNested
} from 'class-validator';
import IsCustomUUID from 'src/validators/uuid.validator';
import DepartmentUpdate from './department.update';

export default class CityUpdate {
  @ApiProperty({ type: String, required: false })
  @Type(() => String)
  @IsCustomUUID()
  @IsOptional()
  @Transform(({ value }) => Buffer.from((value as string), 'base64url'))
  id?: Buffer;

  @ApiProperty({ type: String, required: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  @IsOptional()
  name?: string;

  @ApiProperty({ type: () => DepartmentUpdate, required: false })
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => DepartmentUpdate)
  @IsOptional()
  department?: DepartmentUpdate;
}
