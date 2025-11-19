import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Log completo del error para debugging en producción
    console.error('🚨 ERROR CAPTURADO POR FILTRO GLOBAL:');
    console.error('📍 Ruta:', request.url);
    console.error(
      '🔍 Tipo de excepción:',
      exception?.constructor?.name || 'Unknown',
    );

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
      console.error('📊 Status HTTP:', status);
      console.error('💬 Mensaje:', message);
    } else if (exception instanceof Error) {
      // Loguear error no-HTTP
      console.error('❌ Error no-HTTP:', exception.message);
      console.error('📚 Stack:', exception.stack);
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
    } else {
      console.error('⚠️ Excepción desconocida:', exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
