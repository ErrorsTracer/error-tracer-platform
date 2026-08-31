import { AllowNull, Column, DataType, HasMany, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Environment } from './environment.model';

@Table({
  tableName: 'applications',
  timestamps: true,
  defaultScope: { where: { status: 'active' } },
})
export class Application extends Model<Application> {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  declare ownerId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare status: string;

  @HasMany(() => Environment)
  declare environments: Environment[];
}
