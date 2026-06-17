from sqlalchemy import text
from database import engine

def fix_data():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM courses"))
        rows = result.fetchall()
        
        print("Found rows:", len(rows))
        
        for row in rows:
            print(f"Row: {row}")
            old_id = row[0]
            course_code = row[1]
            course_name = row[2]
            teacher = row[3]
            student_count = row[4]
            course_date = row[5]
            start_time = row[6]
            end_time = row[7]
            lab_room = row[8]
            remark = row[9]
            wrong_template_id = row[10]
            wrong_created_at = row[11]
            wrong_updated_at = row[12]
            
            correct_created_at = wrong_template_id
            correct_updated_at = wrong_created_at
            
            print(f"Fixing row {old_id}:")
            print(f"  created_at should be: {correct_created_at}")
            print(f"  updated_at should be: {correct_updated_at}")
            print(f"  template_id should be: NULL")
            
            conn.execute(text("""
                UPDATE courses 
                SET template_id = NULL,
                    created_at = :created_at,
                    updated_at = :updated_at
                WHERE id = :id
            """), {
                'id': old_id,
                'created_at': correct_created_at,
                'updated_at': correct_updated_at
            })
        
        conn.commit()
        print("Data fixed successfully!")

if __name__ == "__main__":
    fix_data()
