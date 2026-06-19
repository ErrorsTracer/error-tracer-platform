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
import { randomBytes } from 'crypto';
import { Applications } from './applications.model';

@Table({
  tableName: 'environments',
  timestamps: true,
})
export class Environments extends Model<Environments> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Index({ unique: true })
  @Column(DataType.STRING)
  declare appKey: string;

  @Column(DataType.STRING)
  declare envName: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isEnabled: boolean;

  // ======================
  // Relations
  // ======================

  @Index({ unique: true })
  @ForeignKey(() => Applications)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare applicationId: string;

  @BelongsTo(() => Applications, {
    onDelete: 'CASCADE',
  })
  declare application: Applications;

  @BeforeCreate
  static saveAppKey(instance: Environments) {
    if (!instance.appKey) {
      instance.appKey = Environments.generateAppKey();
    }
  }

  private static generateAppKey(length = 26): string {
    const keygen = process.env.APP_KEY_GENERATOR as string;
    const bytes = randomBytes(length);

    return Array.from(bytes, (byte) => keygen[byte % keygen.length]).join('');
  }
}
