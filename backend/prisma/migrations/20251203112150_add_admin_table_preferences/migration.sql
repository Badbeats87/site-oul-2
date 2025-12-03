-- CreateTable
CREATE TABLE "admin_table_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "table_name" VARCHAR(100) NOT NULL,
    "visible_columns" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "admin_table_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_table_preferences_user_id_idx" ON "admin_table_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_table_preferences_user_id_table_name_key" ON "admin_table_preferences"("user_id", "table_name");

-- AddForeignKey
ALTER TABLE "admin_table_preferences" ADD CONSTRAINT "admin_table_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
