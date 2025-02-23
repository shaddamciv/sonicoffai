import sqlite3
from datetime import datetime

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
        rsi REAL NOT NULL,
        date TEXT NOT NULL
    );
    """
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except sqlite3.Error as e:
        print(e)

def insert_result(conn, result):
    sql = ''' INSERT INTO results(currency, direction, rsi, date)
              VALUES(?,?,?,?) '''
    cur = conn.cursor()
    cur.execute(sql, result)
    conn.commit()
    return cur.lastrowid

def get_latest_direction(conn, currency):
    cur = conn.cursor()
    cur.execute("SELECT direction FROM results WHERE currency = ? ORDER BY date DESC LIMIT 1", (currency,))
    row = cur.fetchone()
    if row:
        return row[0]
    return None
    
def main():
    database = "results.db"

    conn = create_connection(database)
    if conn is not None:
        create_table(conn)
    else:
        print("Error! Cannot create the database connection.")

if __name__ == '__main__':
    main()