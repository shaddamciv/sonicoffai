import sqlite3

def create_connection(db_file):
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(e)
    return conn

def create_table(conn):
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        currency TEXT NOT NULL,
        direction TEXT NOT NULL,
        rsi REAL NOT NULL
    );
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except sqlite3.Error as e:
        print(e)

def insert_result(conn, result):
    sql = ''' INSERT INTO results(currency, direction, rsi)
              VALUES(?,?,?) '''
    cur = conn.cursor()
    cur.execute(sql, result)
    conn.commit()
    return cur.lastrowid

def main():
    database = "results.db"

    conn = create_connection(database)
    if conn is not None:
        create_table(conn)
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    main()