import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // A streaming response (video range requests, torrent piping, etc.) may
    // already have written status/headers and started sending bytes before
    // this error occurred. Calling response.json(...) at that point throws
    // ERR_HTTP_HEADERS_SENT, which crashes the process. In that situation the
    // client already owns the connection — the best we can do is log it and
    // close the socket, never attempt to write a new body.
    if (response.headersSent) {
      this.logger.warn(
        `Exception occurred after headers were sent for ${request.method} ${request.url}: ${exception instanceof Error ? exception.message : String(exception)
        }`,
      );
      response.destroy();
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      exceptionResponse && typeof exceptionResponse === 'object'
        ? (exceptionResponse as any).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}