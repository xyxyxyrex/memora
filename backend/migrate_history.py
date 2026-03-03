import sqlite3

def migrate_history():
    conn = sqlite3.connect('learning_companion.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reviewer_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id INTEGER,
                content TEXT DEFAULT "",
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(topic_id) REFERENCES topics(id)
            )
        """)
        print("Created reviewer_history table")
    except sqlite3.OperationalError as e:
        print(f"reviewer_history table creation failed: {e}")
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate_history()
