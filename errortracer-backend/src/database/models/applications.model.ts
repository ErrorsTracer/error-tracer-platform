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
  HasMany,
  HasOne,
  Index,
  Scopes,
} from 'sequelize-typescript';
import { Environments } from './environments.model';
import { ApplicationMembership } from './application-membership.model';
import { Errors } from './errors.model';
import { Frameworks } from './frameworks.model';
import { Users } from './users.model';
import { Notifications } from './notifications.model';
import { Usage } from './usage.model';
import {
  ApplicationMembershipStatus,
  ApplicationStatus,
} from '../../common/constants/app.constants';

@Scopes(() => ({
  associatedWithUser: (userId: string) => ({
    include: [
      {
        model: ApplicationMembership,
        attributes: [],
        where: {
          userId,
          status: ApplicationMembershipStatus.ACTIVE,
        },
        required: true,
      },
    ],
  }),
}))
@Table({
  tableName: 'applications',
  timestamps: true,
  paranoid: false,
  defaultScope: {
    where: {
      status: ApplicationStatus.ACTIVE,
    },
  },
})
export class Applications extends Model<Applications> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index({ name: 'applications_owner_name_unique', unique: true })
  @Column(DataType.STRING(120))
  declare name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare about: string | null;

  @Index
  @Column({
    type: DataType.ENUM(ApplicationStatus.ACTIVE, ApplicationStatus.SUSPENDED),
    allowNull: false,
    defaultValue: ApplicationStatus.ACTIVE,
  })
  declare status: ApplicationStatus;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare allowNotifications: boolean;

  declare membershipsCount?: number;
  declare totalErrors?: number;
  declare criticalErrors?: number;
  declare errorsCount?: number;
  declare criticalCount?: number;

  // ======================
  // Relations
  // ======================

  @Index({ name: 'applications_owner_name_unique', unique: true })
  @Index
  @ForeignKey(() => Users)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare ownerId: string;

  @BelongsTo(() => Users, {
    foreignKey: 'ownerId',
    onDelete: 'RESTRICT',
  })
  declare owner: Users;

  @HasOne(() => Environments, {
    onDelete: 'RESTRICT',
  })
  declare environment: Environments;

  @HasMany(() => ApplicationMembership, {
    onDelete: 'RESTRICT',
  })
  declare memberships: ApplicationMembership[];

  @HasMany(() => Notifications, {
    onDelete: 'SET NULL',
  })
  declare notifications: Notifications[];

  @HasMany(() => Errors)
  declare errors: Errors[];

  @HasOne(() => Usage, {
    foreignKey: 'applicationId',
    constraints: false,
  })
  declare usage: Usage | null;

  @Index
  @ForeignKey(() => Frameworks)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare frameworkId: string;

  @BelongsTo(() => Frameworks)
  declare framework: Frameworks;
}
