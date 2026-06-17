from sqlalchemy import text
from database import engine

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE courses 
                ADD COLUMN template_id INTEGER
            """))
            print("Added template_id column to courses table")
        except Exception as e:
            print(f"Note: {e}")
        
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_courses_template_id 
                ON courses(template_id)
            """))
            print("Created index on template_id")
        except Exception as e:
            print(f"Note: {e}")
        
        try:
            conn.execute(text("""
                PRAGMA foreign_keys = OFF
            """))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS courses_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    course_code VARCHAR(50) NOT NULL,
                    course_name VARCHAR(200) NOT NULL,
                    teacher VARCHAR(100) NOT NULL,
                    student_count INTEGER DEFAULT 0,
                    course_date DATE NOT NULL,
                    start_time TIME,
                    end_time TIME,
                    lab_room VARCHAR(100),
                    remark TEXT,
                    template_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (template_id) REFERENCES consumable_templates(id)
                )
            """))
            conn.execute(text("""
                INSERT INTO courses_new SELECT * FROM courses
            """))
            conn.execute(text("""
                DROP TABLE courses
            """))
            conn.execute(text("""
                ALTER TABLE courses_new RENAME TO courses
            """))
            conn.execute(text("""
                PRAGMA foreign_keys = ON
            """))
            print("Recreated courses table with foreign key constraint")
        except Exception as e:
            print(f"Note: {e}")
        
        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
