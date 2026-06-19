import { v4 as uuidv4 } from "uuid";
import { Logger } from "../../utils/Logger";

// 事务状态
enum TransactionStatus {
  ACTIVE = "ACTIVE",
  COMMITTED = "COMMITTED",
  ROLLED_BACK = "ROLLED_BACK",
  FAILED = "FAILED",
}

// 事务类型
interface Transaction {
  id: string;
  status: TransactionStatus;
  startTime: Date;
  endTime?: Date;
  operations: any[];
}

export class TransactionManager {
  private transactions: Map<string, Transaction>;
  private logger: Logger;

  constructor() {
    this.transactions = new Map();
    this.logger = new Logger("TransactionManager");
  }

  beginTransaction(): string {
    const transactionId = uuidv4();

    const transaction: Transaction = {
      id: transactionId,
      status: TransactionStatus.ACTIVE,
      startTime: new Date(),
      operations: [],
    };

    this.transactions.set(transactionId, transaction);
    this.logger.debug("Transaction started", { transactionId });

    return transactionId;
  }

  commit(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== TransactionStatus.ACTIVE) {
      throw new Error(
        `Cannot commit transaction in ${transaction.status} state`
      );
    }

    transaction.status = TransactionStatus.COMMITTED;
    transaction.endTime = new Date();

    this.logger.debug("Transaction committed", {
      transactionId,
      operationCount: transaction.operations.length,
    });

    // 清理已完成的事务（可选）
    // this.transactions.delete(transactionId);
  }

  rollback(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== TransactionStatus.ACTIVE) {
      throw new Error(
        `Cannot rollback transaction in ${transaction.status} state`
      );
    }

    transaction.status = TransactionStatus.ROLLED_BACK;
    transaction.endTime = new Date();

    this.logger.debug("Transaction rolled back", {
      transactionId,
      operationCount: transaction.operations.length,
    });

    // 清理已完成的事务（可选）
    // this.transactions.delete(transactionId);
  }

  addOperation(transactionId: string, operation: any): void {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    if (transaction.status !== TransactionStatus.ACTIVE) {
      throw new Error(
        `Cannot add operation to transaction in ${transaction.status} state`
      );
    }

    transaction.operations.push(operation);
    this.logger.debug("Operation added to transaction", {
      transactionId,
      operationType: operation.type,
    });
  }

  getStatus(transactionId: string): TransactionStatus {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error(`Transaction not found: ${transactionId}`);
    }

    return transaction.status;
  }

  getTransactionInfo(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getAllTransactions(): Transaction[] {
    return Array.from(this.transactions.values());
  }

  getActiveTransactionCount(): number {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.status === TransactionStatus.ACTIVE
    ).length;
  }
}
