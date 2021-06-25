import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty, IsOptional, IsString, Length, MaxLength
} from 'class-validator';
import IsCustomUUID from 'src/validators/uuid.validator';

export default class DepartmentUpdate {
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

  @ApiProperty()
  @ApiProperty({ type: String, required: false })
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  @IsOptional()
  num?: string;
}
