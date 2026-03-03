from sqlalchemy import text
from database import engine, Base

def column_exists(conn, table, column):
    from sqlalchemy import inspect
    inspector = inspect(conn)
    cols = [c["name"] for c in inspector.get_columns(table)]
    return column in cols

def migrate():
    # Ensure all tables exist first
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        if not column_exists(conn, "topics", "reviewer_content"):
            conn.execute(text("ALTER TABLE topics ADD COLUMN reviewer_content TEXT DEFAULT ''"))
            print("Added reviewer_content to topics")
        else:
            print("reviewer_content already exists, skipping")

        if not column_exists(conn, "articles", "pdf_url"):
            conn.execute(text("ALTER TABLE articles ADD COLUMN pdf_url VARCHAR(1000) DEFAULT ''"))
            print("Added pdf_url to articles")
        else:
            print("pdf_url already exists, skipping")

        if not column_exists(conn, "topics", "pdf_images"):
            conn.execute(text("ALTER TABLE topics ADD COLUMN pdf_images TEXT DEFAULT ''"))
            print("Added pdf_images to topics")
        else:
            print("pdf_images already exists, skipping")

        conn.commit()

    print("Migration complete.")

if __name__ == '__main__':
    migrate()
