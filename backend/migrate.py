import sqlite3

def migrate():
    conn = sqlite3.connect('learning_companion.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE topics ADD COLUMN reviewer_content TEXT DEFAULT ''")
        print("Added reviewer_content to topics")
    except sqlite3.OperationalError as e:
        print(f"topics migration skipped/failed: {e}")
        
    try:
        cursor.execute("ALTER TABLE articles ADD COLUMN pdf_url VARCHAR(1000) DEFAULT ''")
        print("Added pdf_url to articles")
    except sqlite3.OperationalError as e:
        print(f"articles migration skipped/failed: {e}")

    try:
        cursor.execute("ALTER TABLE topics ADD COLUMN pdf_images TEXT DEFAULT ''")
        print("Added pdf_images to topics")
    except sqlite3.OperationalError as e:
        print(f"pdf_images migration skipped/failed: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
