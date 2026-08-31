import { AllowNull, BeforeCreate, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { randomUUID } from 'crypto';
import { Application } from './application.model';

@Table({ tableName: 'errors-logs', timestamps: true })
export class ErrorEvent extends Model<ErrorEvent> {
  @PrimaryKey @Column(DataType.UUID) declare id: string;
  @AllowNull(false) @Column(DataType.STRING) declare error: string;
  @AllowNull(true) @Column(DataType.TEXT) declare stack: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare environment: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare framework: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare language: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare runtime: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare level: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare name: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare fingerprint: string | null;
  @AllowNull(true) @Column(DataType.BOOLEAN) declare handled: boolean | null;
  @AllowNull(true) @Column(DataType.DATE) declare timestamp: Date | null;
  @AllowNull(true) @Column(DataType.STRING) declare release: string | null;
  @AllowNull(true) @Column(DataType.TEXT) declare url: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare transaction: string | null;
  @AllowNull(true) @Column(DataType.JSONB) declare user: Record<string, unknown> | null;
  @AllowNull(true) @Column(DataType.JSONB) declare request: Record<string, unknown> | null;
  @AllowNull(true) @Column(DataType.JSONB) declare tags: Record<string, unknown> | null;
  @AllowNull(true) @Column(DataType.JSONB) declare extra: Record<string, unknown> | null;
  @AllowNull(true) @Column(DataType.JSONB) declare breadcrumbs: Record<string, unknown>[] | null;
  @AllowNull(true) @Column(DataType.JSONB) declare contexts: Record<string, unknown> | null;
  @AllowNull(true) @Column(DataType.TEXT) declare additionalData: string | null;
  @AllowNull(true) @Column(DataType.TEXT) declare href: string | null;
  @AllowNull(true) @Column(DataType.STRING) declare client: string | null;
  @Default(1) @Column(DataType.INTEGER) declare repeated: number;
  @ForeignKey(() => Application) @AllowNull(false) @Column(DataType.UUID) declare applicationId: string;

  @BeforeCreate
  static assignId(instance: ErrorEvent) {
    instance.id = randomUUID();
  }
}
