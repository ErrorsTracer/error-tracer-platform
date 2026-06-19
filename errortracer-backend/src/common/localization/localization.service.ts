import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import {
  DEFAULT_LOCALE,
  ERROR_MESSAGES,
  SUPPORTED_LOCALES,
  SupportedLocale,
} from './locales';

@Injectable()
export class LocalizationService {
  getLocaleFromRequest(request: Request): SupportedLocale {
    const requestedLanguage =
      this.getHeaderValue(request, 'x-language') ??
      this.getHeaderValue(request, 'language') ??
      this.getHeaderValue(request, 'lang') ??
      this.getHeaderValue(request, 'accept-language');

    return this.normalizeLocale(requestedLanguage);
  }

  translate(key: string, locale: SupportedLocale): string {
    return (
      (ERROR_MESSAGES[locale] as Record<string, string>)[key] ??
      (ERROR_MESSAGES[DEFAULT_LOCALE] as Record<string, string>)[key] ??
      key
    );
  }

  isTranslationKey(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      value.startsWith('errors.') &&
      Boolean((ERROR_MESSAGES[DEFAULT_LOCALE] as Record<string, string>)[value])
    );
  }

  private getHeaderValue(
    request: Request,
    headerName: string,
  ): string | undefined {
    const value = request.headers[headerName];

    return Array.isArray(value) ? value[0] : value;
  }

  private normalizeLocale(value?: string): SupportedLocale {
    const languageCode = value?.split(',')[0]?.trim().split('-')[0];

    if (SUPPORTED_LOCALES.includes(languageCode as SupportedLocale)) {
      return languageCode as SupportedLocale;
    }

    return DEFAULT_LOCALE;
  }
}
