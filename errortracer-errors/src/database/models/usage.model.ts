import { AllowNull, Column, DataType, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({ tableName: 'usage', timestamps: true })
export class Usage extends Model<Usage> {
  @PrimaryKey @Column(DataType.UUID) declare id: string;
  @AllowNull(false) @Column(DataType.UUID) declare userId: string;
  @AllowNull(false) @Column(DataType.UUID) declare applicationId: string;
  @AllowNull(false) @Column(DataType.BIGINT) declare totalErrorBytes: string;
  @AllowNull(false) @Column(DataType.BIGINT) declare totalErrorCount: string;
}
