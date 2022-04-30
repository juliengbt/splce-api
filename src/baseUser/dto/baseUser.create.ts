import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export default class BaseUserCreate {
  @ApiProperty({ type: String, required: true, nullable: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @IsEmail()
  email!: string;

  @ApiProperty({ type: String, required: true, nullable: false })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(100)
  password!: string;

  @ApiProperty({ type: String, required: true, nullable: false })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;
}
