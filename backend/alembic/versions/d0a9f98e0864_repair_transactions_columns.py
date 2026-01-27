from alembic import op

# IMPORTANT:
# - Keep "revision" as whatever Alembic generated for you.
# - Only set down_revision exactly to the current head below.

revision = "<KEEP_YOURS_FROM_GENERATED_FILE>"
down_revision = "26be9f628187"
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns safely (Postgres supports IF NOT EXISTS)
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS risk DOUBLE PRECISION')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS label INTEGER')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS explanation TEXT')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS shap_top JSONB')

    # If your code ever referenced these, add them too (won’t hurt if already exists)
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(8)')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS velocity INTEGER')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS device_new BOOLEAN')
    op.execute('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)')


def downgrade():
    # Optional: You can leave downgrade empty for MVP.
    # If you want strict reversibility, you can DROP COLUMN here.
    pass
