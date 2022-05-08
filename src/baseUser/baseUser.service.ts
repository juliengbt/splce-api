import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import BaseUser from 'src/baseUser/baseUser.entity';
import { hashString as generatePasswordHash, hashString } from 'src/utils/functions';
import { Repository, SelectQueryBuilder } from 'typeorm';
import BaseUserCreate from './dto/baseUser.create';

@Injectable()
export class BaseUserService {
  constructor(
    @InjectRepository(BaseUser)
    private repo: Repository<BaseUser>
  ) {}

  async findById(id: Buffer): Promise<BaseUser | null> {
    return this.repo.findOne({ where: { id: id } });
  }

  async create(user: BaseUserCreate): Promise<Buffer> {
    user.password = await generatePasswordHash(user.password);
    const userToSave = this.repo.create(user);
    return this.repo.save(userToSave).then((userRes) => userRes.id);
  }

  async updateRefreshToken(userId: Buffer, rt: string | null): Promise<number> {
    const now = new Date();
    return this.repo
      .update(
        {
          id: userId
        },
        {
          refresh_token_hash: rt ? await hashString(rt) : null,
          last_connection: now
        }
      )
      .then((res) => res.raw)
      .catch((err) => {
        console.error(err);
        return 0;
      });
  }

  async confirmEmail(userId: Buffer) {
    return this.repo.update(
      {
        id: userId
      },
      {
        is_email_confirmed: true
      }
    );
  }

  async findByEmail(email: string): Promise<BaseUser | null> {
    const query = this.getFullObjectQuery();

    query.where('BaseUser.email =:user_email', { user_email: email });

    return query.getOne();
  }

  private getFullObjectQuery(): SelectQueryBuilder<BaseUser> {
    return this.repo.createQueryBuilder('BaseUser');
  }
}
