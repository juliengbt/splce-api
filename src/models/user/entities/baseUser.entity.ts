import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform, Exclude } from 'class-transformer';
import Equipment from 'src/models/equipment/equipment.entity';
import Sport from 'src/models/sport/sport.entity';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryColumn
} from 'typeorm';
import { v4 } from 'uuid';
import Token from '../../token/token.entity';

export enum Role {
  REGULAR = 'regular',
  PRO = 'professional',
  ADMIN = 'admin'
}

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

  @ApiProperty({ type: Boolean, nullable: false, default: false })
  @Column({ type: 'bit' })
  @Transform(({ value: buf }) => (buf ? !!(buf as Buffer).readUIntBE(0, 1) : buf))
  is_email_confirmed!: boolean;

  @ApiProperty({ type: () => Sport, isArray: true })
  @ManyToMany(() => Sport, (s) => s.code, { cascade: true })
  @JoinTable({
    name: 'BaseUser_Sport',
    inverseJoinColumn: { name: 'code_sport' },
    joinColumn: { name: 'id_user' }
  })
  sports!: Sport[];

  @ApiProperty({ type: () => Equipment, isArray: true })
  @ManyToMany(() => Equipment, (e) => e.id, { cascade: false, eager: true })
  @JoinTable({
    name: 'BaseUser_Equipment',
    inverseJoinColumn: { name: 'id_equipment' },
    joinColumn: { name: 'id_user' }
  })
  equipments!: Equipment[];

  @Exclude()
  @OneToMany(() => Token, (token) => token.user, { cascade: false, lazy: false, eager: true })
  tokens!: Token[];

  @Exclude()
  @Column({ type: 'enum', enum: Role, default: Role.REGULAR })
  role!: Role;

  @Exclude()
  @Transform(({ value: buf }) => (buf ? !!(buf as Buffer).readUIntBE(0, 1) : buf))
  @Column({ type: 'bit' })
  is_deleted!: boolean;
}