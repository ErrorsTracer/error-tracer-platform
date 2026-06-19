import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  HasMany,
  Default,
  Index,
} from 'sequelize-typescript';
import { Applications } from './applications.model';

@Table({
  tableName: 'frameworks',
  timestamps: false,
})
export class Frameworks extends Model<Frameworks> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index({ unique: true })
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  declare name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare about: string;

  // ======================
  // Relations
  // ======================

  @HasMany(() => Applications, {
    foreignKey: 'frameworkId',
  })
  declare applications: Applications[];
}
