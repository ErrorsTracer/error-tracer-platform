import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class TransactionService {
  constructor(private readonly sequelize: Sequelize) {}

  run<T>(job: (transaction: Transaction) => Promise<T>): Promise<T> {
    return this.sequelize.transaction(job);
  }
}
