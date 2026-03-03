from sqlalchemy import text, inspect
from database import engine, Base

def migrate():
    # Ensure all tables exist first
    Base.metadata.create_all(bind=engine)

    # Create inspector AFTER create_all, bound to engine (not a connection)
    insp = inspect(engine)

    def column_exists(table, column):
        if not insp.has_table(table):
            print(f"Table '{table}' does not exist yet — skipping column check")
            return True  # skip the ALTER to avoid error
        cols = [c["name"] for c in insp.get_columns(table)]
        return column in cols

    with engine.connect() as conn:
        if not column_exists("topics", "reviewer_content"):
            conn.execute(text("ALTER TABLE topics ADD COLUMN reviewer_content TEXT DEFAULT ''"))
            print("Added reviewer_content to topics")
        else:
            print("reviewer_content already exists, skipping")

        if not column_exists("articles", "pdf_url"):
            conn.execute(text("ALTER TABLE articles ADD COLUMN pdf_url VARCHAR(1000) DEFAULT ''"))
            print("Added pdf_url to articles")
        else:
            print("pdf_url already exists, skipping")

        if not column_exists("topics", "pdf_images"):
            conn.execute(text("ALTER TABLE topics ADD COLUMN pdf_images TEXT DEFAULT ''"))
            print("Added pdf_images to topics")
        else:
            print("pdf_images already exists, skipping")

        conn.commit()

    print("Migration complete.")

if __name__ == '__main__':
    migrate()
