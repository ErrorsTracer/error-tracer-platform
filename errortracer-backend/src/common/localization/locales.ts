import { ErrorKey, ERROR_KEYS } from './error-keys';

export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'ar'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const ERROR_MESSAGES: Record<
  SupportedLocale,
  Record<ErrorKey, string>
> = {
  en: {
    [ERROR_KEYS.CURRENT_PASSWORD_INCORRECT]: 'Current password is incorrect!',
    [ERROR_KEYS.PASSWORD_CONFIRMATION_MISMATCH]:
      'New password confirmation does not match!',
    [ERROR_KEYS.SESSION_NOT_FOUND]: 'Session not found!',
    [ERROR_KEYS.APP_ALREADY_EXISTS]: 'This app already exists!',
    [ERROR_KEYS.APP_CREATE_FORBIDDEN]:
      'You do not have permissions to create apps for this organization!',
    [ERROR_KEYS.APP_DELETE_FORBIDDEN]:
      'Only the application owner can delete this application!',
    [ERROR_KEYS.APP_INVITE_FORBIDDEN]:
      'Only the application owner can invite people to this application!',
    [ERROR_KEYS.APP_KEY_INVALID]: 'Application key is invalid!',
    [ERROR_KEYS.APP_NOT_FOUND]: 'Application not found!',
    [ERROR_KEYS.APP_ORGANIZATION_MISMATCH]:
      'Make sure the application belongs to the same organization!',
    [ERROR_KEYS.APP_PRODUCTION_DISABLED]:
      'Production mode is disabled for this credential!',
    [ERROR_KEYS.APP_STATUS_FORBIDDEN]:
      'Only the application owner can change this application status!',
    [ERROR_KEYS.APP_UNAVAILABLE]:
      'Application associated with this key is not available!',
    [ERROR_KEYS.APP_TYPE_NOT_FOUND]: 'There is no app type with the given id!',
    [ERROR_KEYS.AUTH_REQUIRED]: 'Authentication is required!',
    [ERROR_KEYS.CREDENTIAL_NOT_FOUND]: 'Credential not found!',
    [ERROR_KEYS.EMAIL_ALREADY_EXISTS]: 'This email already exists!',
    [ERROR_KEYS.INCORRECT_CREDENTIALS]: 'Incorrect credentials!',
    [ERROR_KEYS.INVALID_REFRESH_TOKEN]: 'Invalid or expired refresh token!',
    [ERROR_KEYS.INVALID_TOKEN]: 'Invalid token or expired, please login again!',
    [ERROR_KEYS.INVALID_TOKEN_PAYLOAD]: 'Invalid token payload!',
    [ERROR_KEYS.MEMBERSHIP_INVITATION_NOT_FOUND]:
      'Membership invitation not found!',
    [ERROR_KEYS.NO_REFRESH_TOKEN]: 'No refresh token provided!',
    [ERROR_KEYS.NOTIFICATION_NOT_FOUND]: 'Notification not found!',
    [ERROR_KEYS.ORGANIZATION_KEY_INVALID]: 'Organization key is invalid!',
    [ERROR_KEYS.ORGANIZATION_UNAVAILABLE]:
      'Organization associated with this key is not available!',
    [ERROR_KEYS.USER_NOT_FOUND]: 'User not found!',
    [ERROR_KEYS.VALIDATION_FAILED]: 'Validation failed!',
  },
  ar: {
    [ERROR_KEYS.CURRENT_PASSWORD_INCORRECT]: 'Current password is incorrect!',
    [ERROR_KEYS.PASSWORD_CONFIRMATION_MISMATCH]:
      'New password confirmation does not match!',
    [ERROR_KEYS.SESSION_NOT_FOUND]: 'Session not found!',
    [ERROR_KEYS.APP_ALREADY_EXISTS]: 'هذا التطبيق موجود بالفعل!',
    [ERROR_KEYS.APP_CREATE_FORBIDDEN]:
      'ليس لديك صلاحية إنشاء تطبيقات لهذه المنظمة!',
    [ERROR_KEYS.APP_DELETE_FORBIDDEN]:
      'يمكن لمالك التطبيق فقط حذف هذا التطبيق!',
    [ERROR_KEYS.APP_INVITE_FORBIDDEN]:
      'يمكن لمالك التطبيق فقط دعوة أشخاص إلى هذا التطبيق!',
    [ERROR_KEYS.APP_KEY_INVALID]: 'مفتاح التطبيق غير صالح!',
    [ERROR_KEYS.APP_NOT_FOUND]: 'التطبيق غير موجود!',
    [ERROR_KEYS.APP_ORGANIZATION_MISMATCH]:
      'تأكد أن التطبيق ينتمي إلى نفس المنظمة!',
    [ERROR_KEYS.APP_PRODUCTION_DISABLED]:
      'وضع الإنتاج غير مفعل لبيانات الاعتماد هذه!',
    [ERROR_KEYS.APP_STATUS_FORBIDDEN]:
      'يمكن لمالك التطبيق فقط تغيير حالة هذا التطبيق!',
    [ERROR_KEYS.APP_UNAVAILABLE]: 'التطبيق المرتبط بهذا المفتاح غير متاح!',
    [ERROR_KEYS.APP_TYPE_NOT_FOUND]: 'لا يوجد نوع تطبيق بهذا المعرف!',
    [ERROR_KEYS.AUTH_REQUIRED]: 'المصادقة مطلوبة!',
    [ERROR_KEYS.CREDENTIAL_NOT_FOUND]: 'بيانات الاعتماد غير موجودة!',
    [ERROR_KEYS.EMAIL_ALREADY_EXISTS]: 'هذا البريد الإلكتروني موجود بالفعل!',
    [ERROR_KEYS.INCORRECT_CREDENTIALS]: 'بيانات تسجيل الدخول غير صحيحة!',
    [ERROR_KEYS.INVALID_REFRESH_TOKEN]:
      'رمز التحديث غير صالح أو انتهت صلاحيته!',
    [ERROR_KEYS.INVALID_TOKEN]:
      'الرمز غير صالح أو انتهت صلاحيته، يرجى تسجيل الدخول مرة أخرى!',
    [ERROR_KEYS.INVALID_TOKEN_PAYLOAD]: 'بيانات الرمز غير صالحة!',
    [ERROR_KEYS.MEMBERSHIP_INVITATION_NOT_FOUND]:
      'Membership invitation not found!',
    [ERROR_KEYS.NO_REFRESH_TOKEN]: 'لم يتم إرسال رمز التحديث!',
    [ERROR_KEYS.NOTIFICATION_NOT_FOUND]: 'Notification not found!',
    [ERROR_KEYS.ORGANIZATION_KEY_INVALID]: 'مفتاح المنظمة غير صالح!',
    [ERROR_KEYS.ORGANIZATION_UNAVAILABLE]:
      'المنظمة المرتبطة بهذا المفتاح غير متاحة!',
    [ERROR_KEYS.USER_NOT_FOUND]: 'المستخدم غير موجود!',
    [ERROR_KEYS.VALIDATION_FAILED]: 'فشل التحقق من البيانات!',
  },
};
