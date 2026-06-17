from sqlalchemy import text
from database import engine

def check_db():
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(courses)"))
        print("Current courses table schema:")
        for row in result:
            print(f"  {row}")
        
        print("\nSample data:")
        result = conn.execute(text("SELECT * FROM courses LIMIT 5"))
        for row in result:
            print(f"  {row}")

if __name__ == "__main__":
    check_db()
