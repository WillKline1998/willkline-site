"""Shared helpers for the Python test scripts: run SQL against DATABASE_URL (.env)."""
import os, re, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PSQL = shutil.which("psql") or "/opt/homebrew/opt/postgresql@17/bin/psql"


def database_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    m = re.search(r'^DATABASE_URL="?([^"\n]+)"?', (ROOT / ".env").read_text(), re.M)
    return m.group(1)


def sql(q: str) -> None:
    subprocess.run([PSQL, database_url(), "-q", "-v", "ON_ERROR_STOP=1", "-c", q], check=True, capture_output=True)


def sql_value(q: str) -> str:
    r = subprocess.run([PSQL, database_url(), "-tA", "-c", q], check=True, capture_output=True, text=True)
    return r.stdout.rstrip("\n")


def remove_user(email: str) -> None:
    """Delete a test user (sessions cascade)."""
    sql(f"""DELETE FROM "User" WHERE email = '{email}';""")
