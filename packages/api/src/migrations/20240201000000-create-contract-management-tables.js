"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("organizations", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      domain: { type: Sequelize.STRING(255), allowNull: true, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Extend the existing users.role enum with the new Contract Management roles.
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS \'lawyer\';',
    );
    await queryInterface.sequelize.query(
      'ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS \'paralegal\';',
    );

    await queryInterface.addColumn("users", "organization_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: "organizations", key: "id" },
      onDelete: "SET NULL",
    });

    await queryInterface.createTable("contracts", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "organizations", key: "id" },
        onDelete: "CASCADE",
      },
      uploaded_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      counterparty: { type: Sequelize.STRING(255), allowNull: false },
      contract_type: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM("draft", "active", "expired", "terminated"),
        defaultValue: "draft",
        allowNull: false,
      },
      effective_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiration_date: { type: Sequelize.DATEONLY, allowNull: true },
      file_key: { type: Sequelize.STRING(500), allowNull: true },
      file_name: { type: Sequelize.STRING(255), allowNull: true },
      file_size: { type: Sequelize.INTEGER, allowNull: true },
      file_mime_type: { type: Sequelize.STRING(100), allowNull: true },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
        defaultValue: [],
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("contracts", ["organization_id"]);
    await queryInterface.addIndex("contracts", ["status"]);
    await queryInterface.addIndex("contracts", ["uploaded_by_user_id"]);

    await queryInterface.createTable("contract_notes", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      contract_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "contracts", key: "id" },
        onDelete: "CASCADE",
      },
      author_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      parent_note_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "contract_notes", key: "id" },
        onDelete: "CASCADE",
      },
      body: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("contract_notes", ["contract_id"]);
    await queryInterface.addIndex("contract_notes", ["parent_note_id"]);

    await queryInterface.createTable("witness_tokens", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      contract_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "contracts", key: "id" },
        onDelete: "CASCADE",
      },
      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      witness_email: { type: Sequelize.STRING, allowNull: false },
      witness_name: { type: Sequelize.STRING(255), allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("witness_tokens", ["contract_id"]);
    await queryInterface.addIndex("witness_tokens", ["witness_email"]);

    await queryInterface.createTable("ai_analyses", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      contract_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "contracts", key: "id" },
        onDelete: "CASCADE",
      },
      requested_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      type: {
        type: Sequelize.ENUM("summary", "risk", "chat"),
        allowNull: false,
      },
      prompt: { type: Sequelize.TEXT, allowNull: true },
      result: { type: Sequelize.JSONB, allowNull: false },
      model: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("ai_analyses", ["contract_id"]);
    await queryInterface.addIndex("ai_analyses", ["type"]);

    await queryInterface.createTable("audit_logs", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        primaryKey: true,
      },
      contract_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "contracts", key: "id" },
        onDelete: "SET NULL",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      action: { type: Sequelize.STRING(255), allowNull: false },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["contract_id"]);
    await queryInterface.addIndex("audit_logs", ["user_id"]);
    await queryInterface.addIndex("audit_logs", ["action"]);
    await queryInterface.addIndex("audit_logs", ["created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
    await queryInterface.dropTable("ai_analyses");
    await queryInterface.dropTable("witness_tokens");
    await queryInterface.dropTable("contract_notes");
    await queryInterface.dropTable("contracts");
    await queryInterface.removeColumn("users", "organization_id");
    // Postgres cannot drop values from an existing enum type without
    // recreating it; the added 'lawyer'/'paralegal' role values are left in
    // place on down-migration.
    await queryInterface.dropTable("organizations");
  },
};
