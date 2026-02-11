from backend.database import Base, engine
from backend import models # Import models to ensure they are registered with Base.metadata

def create_db_tables():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

if __name__ == "__main__":
    create_db_tables()
