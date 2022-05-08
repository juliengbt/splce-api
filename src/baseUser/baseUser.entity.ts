import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform, Exclude } from 'class-transformer';
import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { v4 } from 'uuid';

@Entity('BaseUser')
export default class BaseUser {
  @ApiProperty({ type: String, readOnly: true })
  @Type(() => String)
  @Transform(({ value }) => (value as Buffer).toString('base64url'))
  @PrimaryColumn({ type: 'varbinary', length: 16 })
  id!: Buffer;

  @BeforeInsert()
  uuidToBin() {
    this.id = Buffer.from(v4().replace(/-/g, ''), 'hex');
  }

  @ApiProperty({ type: String, required: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password!: string;

  /**
   * Name or organization, or firstname of basic user
   */
  @ApiProperty({ type: String, required: true })
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @ApiProperty({ type: Date, required: true })
  @Column({ type: 'datetime' })
  creation_date!: Date;

  @ApiProperty({ type: Date, required: true })
  @Column({ type: 'datetime' })
  last_connection!: Date;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  refresh_token_hash!: string | null;

  @ApiProperty({ type: Boolean, nullable: false, default: false })
  @Column({ type: 'bit' })
  @Transform(({ value: buf }) => (buf ? !!(buf as Buffer).readUIntBE(0, 1) : buf))
  is_email_confirmed!: boolean;
}
