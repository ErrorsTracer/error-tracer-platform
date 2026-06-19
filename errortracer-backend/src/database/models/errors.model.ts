import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  Default,
  ForeignKey,
  BelongsTo,
  BeforeCreate,
  Index,
} from 'sequelize-typescript';
import { v4 as uuid } from 'uuid';
import { Applications } from './applications.model';

@Table({
  tableName: 'errors-logs',
  timestamps: true,
})
export class Errors extends Model<Errors> {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare error: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare stack: string;

  @Index
  @AllowNull(true)
  @Column(DataType.STRING)
  declare environment: string | null;

  @Index
  @AllowNull(true)
  @Column(DataType.STRING)
  declare framework: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare language: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare runtime: string | null;

  @Index
  @AllowNull(true)
  @Column(DataType.STRING)
  declare level: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare name: string | null;

  @Index
  @AllowNull(true)
  @Column(DataType.STRING)
  declare fingerprint: string | null;

  @AllowNull(true)
  @Column(DataType.BOOLEAN)
  declare handled: boolean | null;

  @Index
  @AllowNull(true)
  @Column(DataType.DATE)
  declare timestamp: Date | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare release: string | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare url: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare transaction: string | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare user: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare request: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare tags: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare extra: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare breadcrumbs: Record<string, unknown>[] | null;

  @AllowNull(true)
  @Column(DataType.JSONB)
  declare contexts: Record<string, unknown> | null;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare additionalData: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare href: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare host: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare client: string;

  @Default(1)
  @Column(DataType.INTEGER)
  declare repeated: number;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare clientAgent: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare clientPlatform: string;

  // ======================
  // Relations
  // ======================

  @ForeignKey(() => Applications)
  @Index
  @AllowNull(false)
  @Column(DataType.UUID)
  declare applicationId: string;

  @BelongsTo(() => Applications)
  declare application: Applications;

  // ======================
  // Hooks
  // ======================

  @BeforeCreate
  static beforeCreateHook(instance: Errors) {
    instance.id = uuid();
  }
}
