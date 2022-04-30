/* eslint-disable max-len */
import {
  Body,
  Controller,
  Get,
  NotAcceptableException,
  Param,
  Post,
  NotFoundException,
  DefaultValuePipe,
  Query,
  ParseIntPipe,
  Patch,
  HttpCode
} from '@nestjs/common';
import {
  ApiBody,
  ApiNotAcceptableResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import Equipment from 'src/entities/equipment.entity';
import EquipmentDTO from 'src/dto/search/equipment.dto';
import EquipmentService from 'src/services/equipment.service';
import { validate } from 'class-validator';
import ParseUUIDPipe from 'src/pipes/parse-uuid.pipe';
import EquipmentUpdate from 'src/dto/update/equipment.update';
import { distanceEarthPoints, getArea } from 'src/utils/functions';
import { Public } from 'src/decorators/public';

@ApiTags('Equipment')
@Controller('equipment')
export default class EquipmentController {
  constructor(private readonly service: EquipmentService) {}

  @Get(':id')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Equipment list',
    type: Equipment,
    isArray: false
  })
  @ApiParam({ type: String, required: true, name: 'id' })
  @ApiNotFoundResponse({ description: 'Not found.' })
  @ApiNotAcceptableResponse({ description: 'The parameter id must a uuid' })
  async getById(@Param('id', new ParseUUIDPipe()) id: Buffer): Promise<Equipment> {
    const equipment = await this.service.findById(id);
    if (!equipment)
      throw new NotFoundException(`No equipment found with id : ${id.toString('base64url')}`);
    return equipment;
  }

  @Post()
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Equipment list',
    type: Equipment,
    isArray: true
  })
  @ApiNotAcceptableResponse({ description: 'Equipment DTO is not valid.' })
  @ApiBody({ type: EquipmentDTO })
  @ApiQuery({ name: 'offset', required: false })
  @ApiNotAcceptableResponse()
  async getUsingDTO(
    @Body() equipmentDTO: EquipmentDTO,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
  ): Promise<Equipment[]> {
    if (offset >= 100)
      throw new NotAcceptableException('Maximum number of object is limited to 100');

    const equipmentParam = equipmentDTO;
    const installationDTO = equipmentDTO.installation;

    if (equipmentParam.name) {
      equipmentParam.name = [...new Set(equipmentParam.name)]
        .flatMap((x) => x.split(' '))
        .filter((str) => str.length > 2);
    }

    if (installationDTO?.name) {
      installationDTO.name = [...new Set(installationDTO.name)]
        .flatMap((x) => x.split(' '))
        .filter((str) => str.length > 2);
    }

    if (installationDTO?.address?.city) {
      if (installationDTO?.address.city.zipcode)
        throw new NotAcceptableException('Zip code is not allowed here');
      if (installationDTO.address.city.ids) {
        installationDTO.address.city.ids = [...new Set(installationDTO.address.city.ids)];
      }
    }

    /* This is important because if latitude and longitude are set then server will calculate distance from equipments
       to user position. If the area is too large there will be a large amount of calculation, so in order to restrict this,
       we delete the user position  but the equipments won't be sorted */

    // Latitude && longitude are set
    if (equipmentParam.latitude && equipmentParam.longitude) {
      if (equipmentDTO.gps_area) {
        // Big area : surface > 200 km2
        if (
          distanceEarthPoints(
            equipmentDTO.gps_area.max_lat,
            equipmentDTO.gps_area.max_lon,
            equipmentDTO.gps_area.min_lat,
            equipmentDTO.gps_area.min_lon
          ) > 200 // 200km
        ) {
          delete equipmentParam.latitude;
          delete equipmentParam.longitude;
          // If user is searching by name in a small area then search within an area of 200km2
        } else if (equipmentParam.name && equipmentParam.name.length > 0) {
          equipmentDTO.gps_area = getArea(equipmentParam.latitude, equipmentParam.longitude, 100);
        }
      } else {
        // If user did not define an area
        equipmentDTO.gps_area = getArea(equipmentParam.latitude, equipmentParam.longitude, 100);
      }
    }

    if (installationDTO !== undefined) equipmentParam.installation = installationDTO;

    return this.service.findUsingDTO(equipmentParam, offset < 0 ? 0 : offset);
  }

  @Patch()
  @HttpCode(201)
  @ApiResponse({
    status: 201,
    description: 'Udapted equipment',
    type: Equipment
  })
  @ApiNotAcceptableResponse({ description: 'Equipment CU is not valid.' })
  @ApiBody({ type: EquipmentUpdate })
  async update(@Body() equipmentU: EquipmentUpdate): Promise<Equipment> {
    if (!equipmentU.id)
      throw new NotAcceptableException('id must be provided in order to update equipment');

    const errors = await validate(equipmentU, {
      skipUndefinedProperties: true
    });

    if (errors.length > 0) throw new NotAcceptableException(errors);

    return this.service.update({
      ...equipmentU,
      id: Buffer.from(equipmentU.id)
    });
  }
}
