import type { Sequelize } from "sequelize";
import { User } from "./User";
import { Session } from "./Session";
import { RefreshToken } from "./RefreshToken";
import { Organization } from "./Organization";
import { Contract } from "./Contract";
import { ContractNote } from "./ContractNote";
import { AuditLog } from "./AuditLog";
import { WitnessToken } from "./WitnessToken";
import { AIAnalysis } from "./AIAnalysis";

export {
  User,
  Session,
  RefreshToken,
  Organization,
  Contract,
  ContractNote,
  AuditLog,
  WitnessToken,
  AIAnalysis,
};

export function initModels(sequelize: Sequelize): void {
  User.initModel(sequelize);
  Session.initModel(sequelize);
  RefreshToken.initModel(sequelize);
  Organization.initModel(sequelize);
  Contract.initModel(sequelize);
  ContractNote.initModel(sequelize);
  AuditLog.initModel(sequelize);
  WitnessToken.initModel(sequelize);
  AIAnalysis.initModel(sequelize);

  // Associations
  User.hasMany(Session, { foreignKey: "userId", as: "sessions" });
  Session.belongsTo(User, { foreignKey: "userId", as: "user" });

  User.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(User, { foreignKey: "userId", as: "user" });

  Session.hasMany(RefreshToken, {
    foreignKey: "sessionId",
    as: "refreshTokens",
  });
  RefreshToken.belongsTo(Session, { foreignKey: "sessionId", as: "session" });

  // Organization
  Organization.hasMany(User, { foreignKey: "organizationId", as: "users" });
  User.belongsTo(Organization, {
    foreignKey: "organizationId",
    as: "organization",
  });

  Organization.hasMany(Contract, {
    foreignKey: "organizationId",
    as: "contracts",
  });
  Contract.belongsTo(Organization, {
    foreignKey: "organizationId",
    as: "organization",
  });

  // Contract
  User.hasMany(Contract, {
    foreignKey: "uploadedByUserId",
    as: "uploadedContracts",
  });
  Contract.belongsTo(User, {
    foreignKey: "uploadedByUserId",
    as: "uploadedBy",
  });

  Contract.hasMany(ContractNote, { foreignKey: "contractId", as: "notes" });
  ContractNote.belongsTo(Contract, {
    foreignKey: "contractId",
    as: "contract",
  });

  Contract.hasMany(AuditLog, { foreignKey: "contractId", as: "auditLogs" });
  AuditLog.belongsTo(Contract, { foreignKey: "contractId", as: "contract" });

  Contract.hasMany(WitnessToken, {
    foreignKey: "contractId",
    as: "witnessTokens",
  });
  WitnessToken.belongsTo(Contract, {
    foreignKey: "contractId",
    as: "contract",
  });

  Contract.hasMany(AIAnalysis, { foreignKey: "contractId", as: "aiAnalyses" });
  AIAnalysis.belongsTo(Contract, {
    foreignKey: "contractId",
    as: "contract",
  });

  // ContractNote (self-referential replies)
  ContractNote.hasMany(ContractNote, {
    foreignKey: "parentNoteId",
    as: "replies",
  });
  ContractNote.belongsTo(ContractNote, {
    foreignKey: "parentNoteId",
    as: "parentNote",
  });

  User.hasMany(ContractNote, { foreignKey: "authorUserId", as: "notes" });
  ContractNote.belongsTo(User, { foreignKey: "authorUserId", as: "author" });

  // AuditLog
  User.hasMany(AuditLog, { foreignKey: "userId", as: "auditLogs" });
  AuditLog.belongsTo(User, { foreignKey: "userId", as: "user" });

  // WitnessToken
  User.hasMany(WitnessToken, {
    foreignKey: "createdByUserId",
    as: "witnessTokens",
  });
  WitnessToken.belongsTo(User, {
    foreignKey: "createdByUserId",
    as: "createdBy",
  });

  // AIAnalysis
  User.hasMany(AIAnalysis, {
    foreignKey: "requestedByUserId",
    as: "aiAnalyses",
  });
  AIAnalysis.belongsTo(User, {
    foreignKey: "requestedByUserId",
    as: "requestedBy",
  });
}
