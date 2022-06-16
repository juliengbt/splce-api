/* eslint-disable max-len */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import EquipmentSearch from 'src/models/equipment/dto/equipment.search';
import Equipment from 'src/models/equipment/equipment.entity';
import { Brackets, DeepPartial, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export default class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private repo: Repository<Equipment>
  ) {}

  async findUsingDTO(equipmentDTO: EquipmentSearch, offset: number): Promise<Equipment[]> {
    const query = this.getFullObjectQuery();
    // Sports
    if (equipmentDTO.sports && equipmentDTO.sports.length > 0) {
      query.where('Equipment_sports.code_sport IN (:...sports_code)').setParameters({
        sports_code: equipmentDTO.sports.map((s) => s.code).filter((s) => s)
      });
    }

    // Position
    if (equipmentDTO.gps_area) {
      query
        .andWhere('Equipment.latitude <= :max_lat', {
          max_lat: equipmentDTO.gps_area.max_lat
        })
        .andWhere('Equipment.latitude >= :min_lat', {
          min_lat: equipmentDTO.gps_area.min_lat
        })
        .andWhere('Equipment.longitude <= :max_lon', {
          max_lon: equipmentDTO.gps_area.max_lon
        })
        .andWhere('Equipment.longitude >= :min_lon', {
          min_lon: equipmentDTO.gps_area.min_lon
        });

      if (equipmentDTO.gps_area.previous_area) {
        // A drawing worth 1000 words
        if (equipmentDTO.gps_area.previous_area.max_lat <= equipmentDTO.gps_area.max_lat) {
          query.andWhere('Equipment.latitude > :prev_max_lat', {
            max_lat: equipmentDTO.gps_area.previous_area.max_lat
          });
        }
        if (equipmentDTO.gps_area.previous_area.min_lat >= equipmentDTO.gps_area.min_lat) {
          query.andWhere('Equipment.latitude < :prev_min_lat', {
            min_lat: equipmentDTO.gps_area.previous_area.min_lat
          });
        }
        if (equipmentDTO.gps_area.previous_area.max_lon <= equipmentDTO.gps_area.max_lon) {
          query.andWhere('Equipment.longitude > :prev_max_lon', {
            max_lon: equipmentDTO.gps_area.previous_area.max_lon
          });
        }
        if (equipmentDTO.gps_area.previous_area.min_lon >= equipmentDTO.gps_area.min_lon) {
          query.andWhere('Equipment.longitude < :prev_min_lon', {
            min_lon: equipmentDTO.gps_area.previous_area.min_lon
          });
        }
      }
    } else if (equipmentDTO.installation?.address?.city?.ids) {
      query.andWhere('city.id in (:...id_city)', {
        id_city: equipmentDTO.installation.address.city.ids.map((id) =>
          Buffer.from(id, 'base64url')
        )
      });
    }

    // Distance
    if (equipmentDTO.latitude && equipmentDTO.longitude) {
      query
        .addSelect(
          'get_distance(:lat,:lon,Equipment.latitude, Equipment.longitude)',
          'Equipment_distance'
        )
        .andWhere('Equipment.latitude is not null')
        .andWhere('Equipment.longitude is not null')
        .setParameters({
          lat: (equipmentDTO.latitude * Math.PI) / 180,
          lon: (equipmentDTO.longitude * Math.PI) / 180
        })
        .addOrderBy('Equipment_distance', 'ASC');
    }

    // Boolean parameters
    if (equipmentDTO.open_access)
      query.andWhere('Equipment.open_access is :open_access', {
        open_access: equipmentDTO.open_access
      });
    if (equipmentDTO.lighting)
      query.andWhere('Equipment.lighting is :lighting', {
        lighting: equipmentDTO.lighting
      });
    if (equipmentDTO.locker)
      query.andWhere('Equipment.locker is :locker', {
        locker: equipmentDTO.locker
      });
    if (equipmentDTO.shower)
      query.andWhere('Equipment.shower is :shower', {
        shower: equipmentDTO.shower
      });
    if (equipmentDTO.installation?.car_park)
      query.andWhere('installation.car_park is :car_park', {
        car_park: equipmentDTO.installation.car_park
      });
    if (equipmentDTO.installation?.disabled_access)
      query.andWhere('installation.disabled_access is :disabled_access', {
        disabled_access: equipmentDTO.installation.disabled_access
      });

    // List parameters
    if (equipmentDTO.soil_type && equipmentDTO.soil_type.length > 0) {
      query.andWhere('soil_type.code in (:...soil_types)', {
        soil_types: equipmentDTO.soil_type.filter((s) => s.code !== undefined).map((s) => s.code)
      });
    }
    if (equipmentDTO.owner && equipmentDTO.owner.length > 0) {
      query.andWhere('owner.code in (:...owners)', {
        owners: equipmentDTO.owner.filter((s) => s.code !== undefined).map((s) => s.code)
      });
    }
    if (equipmentDTO.equipment_level && equipmentDTO.equipment_level.length > 0) {
      query.andWhere('equipment_level.code in (:...equipment_levels)', {
        equipment_levels: equipmentDTO.equipment_level
          .filter((s) => s.code !== undefined)
          .map((s) => s.code)
      });
    }
    if (equipmentDTO.equipment_nature && equipmentDTO.equipment_nature.length > 0) {
      query.andWhere('equipment_nature.code in (:...equipment_natures)', {
        equipment_natures: equipmentDTO.equipment_nature
          .filter((s) => s.code !== undefined)
          .map((s) => s.code)
      });
    }
    if (equipmentDTO.equipment_type && equipmentDTO.equipment_type.length > 0) {
      query.andWhere('equipment_type.code in (:...equipment_types)', {
        equipment_types: equipmentDTO.equipment_type
          .filter((s) => s.code !== undefined)
          .map((s) => s.code)
      });
    }

    // Keyword research
    if (equipmentDTO.name || equipmentDTO.installation?.name) {
      query.andWhere(
        new Brackets(() => {
          const equipmentClause = 'MATCH(Equipment.name) AGAINST (:e_name IN BOOLEAN MODE)';
          const installationClause = 'MATCH(installation.name) AGAINST (:i_name IN BOOLEAN MODE)';

          const useClauses = [];

          if (equipmentDTO.name) {
            query.setParameter('e_name', '*' + equipmentDTO.name.join('*') + '*');
            useClauses.push(equipmentClause);
          }
          if (equipmentDTO.installation?.name) {
            query.setParameter('i_name', '*' + equipmentDTO.installation.name.join('*') + '*');

            useClauses.push(installationClause);
          }
          query
            .addSelect(`(${useClauses.join(' + ')})`, 'keyword_rank')
            .having('keyword_rank > 0')
            .addOrderBy('keyword_rank', 'DESC');
        })
      );
    }

    return query.skip(offset).take(50).getMany();
  }

  async findById(id: Buffer): Promise<Equipment | null> {
    return this.getFullObjectQuery()
      .where('Equipment.id = :id_equipment')
      .setParameters({ id_equipment: id })
      .getOne();
  }

  async insert(equipment: Equipment): Promise<Partial<Equipment>> {
    return this.repo
      .createQueryBuilder()
      .insert()
      .into(Equipment)
      .values(equipment as QueryDeepPartialEntity<Equipment>)
      .execute()
      .then((res) => res.identifiers[0]);
  }

  async update(equipment: DeepPartial<Equipment>): Promise<Equipment> {
    const res = await this.repo.save(equipment);
    return this.findById(res.id).then((e) => {
      if (!e) throw new InternalServerErrorException();
      return e;
    });
  }

  private getFullObjectQuery(): SelectQueryBuilder<Equipment> {
    return this.repo
      .createQueryBuilder('Equipment')
      .leftJoinAndMapOne('Equipment.installation', 'Equipment.installation', 'installation')
      .leftJoinAndMapOne('installation.address', 'installation.address', 'address')
      .leftJoinAndMapOne('address.zipcode', 'address.zipcode', 'zipcode')
      .leftJoinAndMapOne('zipcode.city', 'zipcode.city', 'city')
      .leftJoinAndMapOne('city.department', 'city.department', 'department')
      .leftJoinAndMapOne('Equipment.owner', 'Equipment.owner', 'owner')
      .leftJoinAndMapOne('Equipment.soil_type', 'Equipment.soil_type', 'soil_type')
      .leftJoinAndMapOne(
        'Equipment.equipment_nature',
        'Equipment.equipment_nature',
        'equipment_nature'
      )
      .leftJoinAndMapOne('Equipment.equipment_type', 'Equipment.equipment_type', 'equipment_type')
      .leftJoinAndMapOne(
        'Equipment.equipment_level',
        'Equipment.equipment_level',
        'equipment_level'
      )
      .leftJoinAndMapMany('Equipment.sports', 'Equipment.sports', 'sports')
      .leftJoinAndMapOne('sports.category', 'sports.category', 'category')
      .leftJoinAndMapMany('Equipment.pictures', 'Equipment.pictures', 'pictures');
  }
}