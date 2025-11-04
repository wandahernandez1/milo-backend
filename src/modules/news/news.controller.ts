import { Controller, Get, Query } from '@nestjs/common';
import { NewsService } from '../news/news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getNews(
    @Query('country') country: string = 'ar',
    @Query('category') category?: string,
    @Query('q') query?: string,
  ) {
    return this.newsService.getNews(country, category, query);
  }

  @Get('local')
  async getLocalNews() {
    return this.newsService.getLocalNews();
  }
}
