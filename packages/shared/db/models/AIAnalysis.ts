import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export type AnalysisType = "summary" | "risk" | "chat";

export interface AIAnalysisAttributes {
  id: string;
  contractId: string;
  requestedByUserId?: string;
  type: AnalysisType;
  prompt?: string;
  result: Record<string, unknown>;
  model?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AIAnalysisCreationAttributes extends Optional<
  AIAnalysisAttributes,
  "id" | "requestedByUserId" | "prompt" | "model"
> {}

export class AIAnalysis
  extends Model<AIAnalysisAttributes, AIAnalysisCreationAttributes>
  implements AIAnalysisAttributes
{
  declare id: string;
  declare contractId: string;
  declare requestedByUserId: string | undefined;
  declare type: AnalysisType;
  declare prompt: string | undefined;
  declare result: Record<string, unknown>;
  declare model: string | undefined;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof AIAnalysis {
    AIAnalysis.init(
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
        requestedByUserId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL",
        },
        type: {
          type: DataTypes.ENUM("summary", "risk", "chat"),
          allowNull: false,
        },
        prompt: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        result: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        model: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "ai_analyses",
        timestamps: true,
        underscored: true,
        indexes: [
          { fields: ["contract_id"] },
          { fields: ["type"] },
        ],
      },
    );
    return AIAnalysis;
  }
}
