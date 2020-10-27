import {
  ClassSerializerInterceptor, Controller, Get, UseInterceptors
} from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import Category from 'src/entities/category.entity';
import CategoryService from 'src/services/category.service';

@Controller('categories')
export default class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiResponse({
    status: 200,
    description: 'Categories list',
    type: Category,
    isArray: true
  })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get()
  getCategories(): Promise<Category[]> {
    return this.categoryService.findAll();
  }
}
