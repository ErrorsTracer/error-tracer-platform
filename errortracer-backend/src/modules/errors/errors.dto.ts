import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export const ERROR_LEVELS = [
  'fatal',
  'error',
  'warning',
  'info',
  'debug',
  'critical',
];
export const ERROR_RUNTIMES = [
  'browser',
  'server',
  'mobile',
  'desktop',
  'worker',
  'unknown',
];

export class IngestErrorDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  framework?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(ERROR_RUNTIMES)
  runtime?: string;

  @IsOptional()
  @IsString()
  @IsIn(ERROR_LEVELS)
  level?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  error?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  fingerprint?: string;

  @IsOptional()
  @IsBoolean()
  handled?: boolean;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  release?: string;

  @IsOptional()
  @IsString()
  serverName?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  transaction?: string;

  @IsOptional()
  @IsObject()
  user?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  request?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  tags?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  breadcrumbs?: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  contexts?: Record<string, unknown>;
}
