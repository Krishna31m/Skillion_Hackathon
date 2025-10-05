import sqlite3
import os
DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')
conn = sqlite3.connect(DB)
c = conn.cursor()
try:
    c.execute('SELECT id, serial_hash, issued_at, title, recipient_name FROM enrollment_certificate')
    rows = c.fetchall()
    if not rows:
        print('No certificate rows')
    for r in rows:
        print('id:', r[0])
        print('serial_hash repr:', repr(r[1]))
        print('issued_at:', r[2])
        print('title:', r[3])
        print('recipient_name:', r[4])
        print('---')
except Exception as e:
    print('Error querying DB:', e)
finally:
    conn.close()
