import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    let message: string;
    if (typeof body === 'string') {
      message = body;
    } else if (typeof body === 'object' && body !== null && 'message' in body) {
      const m = (body as { message: string | string[] }).message;
      message = Array.isArray(m) ? m.join('; ') : m;
    } else {
      message = exception.message;
    }

    const code = HttpExceptionFilter.statusToCode(status);

    res.status(status).json({ code, message });
  }

  private static statusToCode(status: number): string {
    const map: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
