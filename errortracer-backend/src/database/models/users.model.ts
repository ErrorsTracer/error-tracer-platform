import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  Default,
  Unique,
  HasMany,
  BeforeCreate,
  Index,
} from 'sequelize-typescript';
import { ApplicationMembership } from './application-membership.model';
import bcrypt from 'bcrypt';
import { UserProvider } from '../../common/constants/app.constants';
import { Notifications } from './notifications.model';
import { Usage } from './usage.model';

@Table({
  tableName: 'users',
  timestamps: true,
  defaultScope: {
    attributes: { exclude: ['password'] },
  },
  scopes: {
    withPassword: {
      attributes: { include: ['password'] },
    },
  },
})
export class Users extends Model<Users> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare firstName: string | null;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare lastName: string | null;

  @Default('default.png')
  @AllowNull(false)
  @Column(DataType.STRING)
  declare avatar: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  declare password: string | null;

  @Column({
    type: DataType.ENUM(
      UserProvider.LOCAL,
      UserProvider.GOOGLE,
      UserProvider.GITHUB,
    ),
    allowNull: false,
    defaultValue: UserProvider.LOCAL,
  })
  declare provider: UserProvider;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isSuspended: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  @Index
  declare isVerified: boolean;

  // ======================
  // Relations
  // ======================

  @HasMany(() => ApplicationMembership, 'userId')
  declare applicationMemberships: ApplicationMembership[];

  @HasMany(() => Notifications, 'userId')
  declare notifications: Notifications[];

  @HasMany(() => Usage, {
    foreignKey: 'userId',
    constraints: false,
  })
  declare usage: Usage[];

  // hooks to normalize email and handle UUID generation
  @BeforeCreate
  static normalizeEmail(instance: Users) {
    instance.email = instance.email.toLowerCase().trim();
  }

  @BeforeCreate
  static async hashPassword(instance: Users) {
    if (instance.password) {
      instance.password = await bcrypt.hash(instance.password, 10);
    }
  }
}
