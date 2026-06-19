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
  Index,
} from 'sequelize-typescript';
import { Users } from './users.model';
import { Applications } from './applications.model';
import {
  ApplicationMembershipRole,
  ApplicationMembershipStatus,
} from '../../common/constants/app.constants';

@Table({
  tableName: 'application_memberships',
  timestamps: true,
  paranoid: false,
  scopes: {
    active: {
      where: { status: ApplicationMembershipStatus.ACTIVE },
    },
  },
})
export class ApplicationMembership extends Model<ApplicationMembership> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.ENUM(
      ApplicationMembershipStatus.ACTIVE,
      ApplicationMembershipStatus.INVITED,
      ApplicationMembershipStatus.SUSPENDED,
      ApplicationMembershipStatus.REVOKED,
      ApplicationMembershipStatus.LEFT,
    ),
    allowNull: false,
    defaultValue: ApplicationMembershipStatus.ACTIVE,
  })
  declare status: ApplicationMembershipStatus;

  @Column({
    type: DataType.ENUM(
      ApplicationMembershipRole.OWNER,
      ApplicationMembershipRole.ADMIN,
      ApplicationMembershipRole.MEMBER,
    ),
    allowNull: false,
    defaultValue: ApplicationMembershipRole.MEMBER,
  })
  declare role: ApplicationMembershipRole;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare joinedAt: Date | null;

  @Index
  @ForeignKey(() => Applications)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare applicationId: string;

  @BelongsTo(() => Applications, {
    foreignKey: 'applicationId',
    onDelete: 'RESTRICT',
  })
  declare application: Applications;

  @Index
  @ForeignKey(() => Users)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @BelongsTo(() => Users, {
    foreignKey: 'userId',
  })
  declare user: Users;

  @Index
  @ForeignKey(() => Users)
  @AllowNull(true)
  @Column(DataType.UUID)
  declare invitedBy: string | null;

  @BelongsTo(() => Users, {
    foreignKey: 'invitedBy',
    onDelete: 'SET NULL',
  })
  declare invitedByUser: Users;
}
