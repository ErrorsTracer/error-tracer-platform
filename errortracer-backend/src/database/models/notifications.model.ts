import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { NotificationType } from '../../common/constants/app.constants';
import { Applications } from './applications.model';
import { Users } from './users.model';

@Table({
  tableName: 'notifications',
  timestamps: true,
})
export class Notifications extends Model<Notifications> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.ENUM(NotificationType.APPLICATION_INVITE))
  declare type: NotificationType;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare message: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isRead: boolean;

  @Index
  @ForeignKey(() => Users)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => Users, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
  })
  declare user: Users;

  @Index
  @ForeignKey(() => Applications)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare applicationId: string | null;

  @BelongsTo(() => Applications, {
    foreignKey: 'applicationId',
    onDelete: 'SET NULL',
  })
  declare application: Applications | null;
}
