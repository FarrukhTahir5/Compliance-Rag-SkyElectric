from sqlalchemy import create_engine

engine = create_engine("mysql+pymysql://root:password@127.0.0.1:3306/skyE")
with engine.connect() as conn:
    from sqlalchemy import text

    result = conn.execute(text("SHOW DATABASES;"))
    for row in result:
        print(row)