from alembic import op
import sqlalchemy as sa

revision = "26be9f628187"
down_revision = "1c6b9bb848ad"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tx_id", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="NEW"),
        sa.Column("severity", sa.String(length=10), nullable=False, server_default="ORANGE"),
        sa.Column("assigned_to", sa.String(length=255), nullable=True),
        sa.Column("decision", sa.String(length=10), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["tx_id"], ["transactions.tx_id"], ondelete="CASCADE"),
    )

    op.create_index("ix_cases_id", "cases", ["id"])
    op.create_index("ix_cases_tx_id", "cases", ["tx_id"])
    op.create_index("ix_cases_assigned_to", "cases", ["assigned_to"])

    # notes.case_id column
    op.add_column("notes", sa.Column("case_id", sa.Integer(), nullable=True))
    op.create_index("ix_notes_case_id", "notes", ["case_id"])
    op.create_foreign_key("fk_notes_case_id", "notes", "cases", ["case_id"], ["id"], ondelete="CASCADE")


def downgrade():
    op.drop_constraint("fk_notes_case_id", "notes", type_="foreignkey")
    op.drop_index("ix_notes_case_id", table_name="notes")
    op.drop_column("notes", "case_id")

    op.drop_index("ix_cases_assigned_to", table_name="cases")
    op.drop_index("ix_cases_tx_id", table_name="cases")
    op.drop_index("ix_cases_id", table_name="cases")
    op.drop_table("cases")
