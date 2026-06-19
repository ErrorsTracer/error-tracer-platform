import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  Default,
  BelongsTo,
  Index,
} from 'sequelize-typescript';
import { Applications } from './applications.model';
import { Users } from './users.model';

@Table({
  tableName: 'usage',
  timestamps: true,
})
export class Usage extends Model<Usage> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Index
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => Users, {
    foreignKey: 'userId',
    constraints: false,
  })
  declare user: Users;

  @Index({ name: 'usage_application_id_unique', unique: true })
  @AllowNull(false)
  @Column(DataType.UUID)
  declare applicationId: string;

  @BelongsTo(() => Applications, {
    foreignKey: 'applicationId',
    constraints: false,
  })
  declare application: Applications | null;

  @Default(0)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare totalErrorBytes: string;

  @Default(0)
  @AllowNull(false)
  @Column(DataType.BIGINT)
  declare totalErrorCount: string;

  @Index
  @Column(DataType.DATE)
  declare createdAt: Date;

  @Column(DataType.DATE)
  declare updatedAt: Date;
}
