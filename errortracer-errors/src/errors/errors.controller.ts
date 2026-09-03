import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { IngestErrorDto } from './errors.dto';
import { ErrorsService } from './errors.service';

@Controller({ path: 'errors', version: '0.1' })
export class ErrorsController {
  constructor(private readonly errors: ErrorsService) {}

  @Post('/ingest')
  ingest(@Body() body: IngestErrorDto, @Headers('x-errortracer-key') key?: string, @Req() request?: Request & { rawBody?: Buffer }) {
    
    return this.errors.ingest(body, key, request?.rawBody);
  }
}
