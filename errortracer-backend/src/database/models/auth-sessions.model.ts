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
import { createHash } from 'crypto';
import { Users } from './users.model';

@Table({
  tableName: 'auth_sessions',
  timestamps: true,
})
export class AuthSessions extends Model<AuthSessions> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Index
  @ForeignKey(() => Users)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare userId: string;

  @Index({ unique: true })
  @AllowNull(false)
  @Column(DataType.STRING)
  declare refreshTokenHash: string;

  @Column(DataType.DATE)
  declare revokedAt: Date | null;

  @AllowNull(false)
  @Column(DataType.DATE)
  declare expiresAt: Date;

  @BelongsTo(() => Users, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
  })
  declare user: Users;

  static hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }
}
