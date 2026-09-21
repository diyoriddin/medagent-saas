"""Runner to execute DB seed with proper script-relative imports."""
from app import db_seed


if __name__ == "__main__":
    db_seed.seed()
