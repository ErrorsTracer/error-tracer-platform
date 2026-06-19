import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ErrorsService } from './errors.service';
import { IngestErrorDto } from './errors.dto';

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller({ path: 'errors', version: '0.1' })
export class ErrorsController {
  constructor(private errorsService: ErrorsService) {}

  @Post('/ingest')
  async ingestError(
    @Body() ingestErrorDto: IngestErrorDto,
    @Headers('x-errortracer-key') ingestionKey?: string,
    @Req() request?: RawBodyRequest,
  ) {
    return await this.errorsService.ingestError(
      ingestErrorDto,
      ingestionKey,
      request?.rawBody,
    );
  }
}
