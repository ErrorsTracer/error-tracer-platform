import { AllowNull, BelongsTo, Column, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';
import { Application } from './application.model';

@Table({ tableName: 'environments', timestamps: true })
export class Environment extends Model<Environment> {
  @PrimaryKey
  @Column(DataType.UUID)
  declare id: string;

  @Column(DataType.STRING)
  declare appKey: string;

  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isEnabled: boolean;

  @ForeignKey(() => Application)
  @AllowNull(false)
  @Column(DataType.UUID)
  declare applicationId: string;

  @BelongsTo(() => Application)
  declare application: Application;
}
