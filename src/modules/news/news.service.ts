import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsService {
  private readonly newsApiKey: string;

  constructor(private configService: ConfigService) {
    this.newsApiKey =
      this.configService.get<string>('NEWS_API_KEY') ||
      '5ee6801a049547db820850d072b7cbb7';
  }

  async getNews(country: string = 'ar', category?: string, query?: string) {
    try {
      let url = '';

      if (query) {
        // Búsqueda por query
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=es&sortBy=publishedAt&apiKey=${this.newsApiKey}`;
      } else {
        // Top headlines por país y categoría
        url = `https://newsapi.org/v2/top-headlines?country=${country}&language=es`;
        if (category) {
          url += `&category=${category}`;
        }
        url += `&apiKey=${this.newsApiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new HttpException(
          data.message || 'Error al obtener noticias',
          response.status,
        );
      }

      if (!data.articles || data.articles.length === 0) {
        return {
          success: true,
          articles: [],
          totalResults: 0,
          message: 'No se encontraron noticias',
        };
      }

      return {
        success: true,
        articles: data.articles,
        totalResults: data.totalResults,
      };
    } catch (error) {
      console.error('Error fetching news:', error);
      throw new HttpException(
        'Error al obtener noticias desde NewsAPI',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getLocalNews() {
    try {
      const url = `https://newsapi.org/v2/everything?q=Argentina&language=es&sortBy=publishedAt&apiKey=${this.newsApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new HttpException(
          data.message || 'Error al obtener noticias',
          response.status,
        );
      }

      if (!data.articles || data.articles.length === 0) {
        return {
          success: true,
          articles: [],
          message: 'No se encontraron noticias locales',
        };
      }

      // Devolver solo las primeras 5 noticias
      return {
        success: true,
        articles: data.articles.slice(0, 5),
        totalResults: data.totalResults,
      };
    } catch (error) {
      console.error('Error fetching local news:', error);
      throw new HttpException(
        'Error al obtener noticias locales',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
