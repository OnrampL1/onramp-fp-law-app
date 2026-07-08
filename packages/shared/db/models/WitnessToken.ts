import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface WitnessTokenAttributes {
  id: string;
  contractId: string;
  createdByUserId?: string;
  tokenHash: string;
  witnessEmail: string;
  witnessName?: string;
  expiresAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WitnessTokenCreationAttributes extends Optional<
  WitnessTokenAttributes,
  "id" | "createdByUserId" | "witnessName" | "usedAt" | "revokedAt"
> {}

export class WitnessToken
  extends Model<WitnessTokenAttributes, WitnessTokenCreationAttributes>
  implements WitnessTokenAttributes
{
  declare id: string;
  declare contractId: string;
  declare createdByUserId: string | undefined;
  declare tokenHash: string;
  declare witnessEmail: string;
  declare witnessName: string | undefined;
  declare expiresAt: Date;
  declare usedAt: Date | undefined;
  declare revokedAt: Date | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isUsed(): boolean {
    return this.usedAt != null;
  }

  get isRevoked(): boolean {
    return this.revokedAt != null;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isUsed && !this.isRevoked;
  }

  static initModel(sequelize: Sequelize): typeof WitnessToken {
    WitnessToken.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        contractId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "contracts", key: "id" },
          onDelete: "CASCADE",
        },
        createdByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        tokenHash: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
        },
        witnessEmail: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: { isEmail: true },
        },
        witnessName: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        usedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        revokedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "witness_tokens",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["contract_id"] },
          { fields: ["witness_email"] },
        ],
      },
    );
    return WitnessToken;
  }
}
