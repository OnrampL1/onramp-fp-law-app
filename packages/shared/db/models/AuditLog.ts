import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface AuditLogAttributes {
  id: string;
  contractId?: string;
  userId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt?: Date;
}

export interface AuditLogCreationAttributes extends Optional<
  AuditLogAttributes,
  "id" | "contractId" | "userId" | "metadata" | "ipAddress"
> {}

/**
 * Append-only: audit log rows are never updated, so this model has no
 * `updatedAt` column. `contractId`/`userId` use `SET NULL` on delete so
 * entries survive the deletion of the resource or actor they reference.
 */
export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  declare id: string;
  declare contractId: string | undefined;
  declare userId: string | undefined;
  declare action: string;
  declare metadata: Record<string, unknown> | undefined;
  declare ipAddress: string | undefined;
  declare readonly createdAt: Date;

  static initModel(sequelize: Sequelize): typeof AuditLog {
    AuditLog.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        contractId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "contracts", key: "id" },
          onDelete: "SET NULL",
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        action: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING(45),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "audit_logs",
        timestamps: true,
        updatedAt: false,
        underscored: true,
        indexes: [
          { fields: ["contract_id"] },
          { fields: ["user_id"] },
          { fields: ["action"] },
          { fields: ["created_at"] },
        ],
      },
    );
    return AuditLog;
  }
}
