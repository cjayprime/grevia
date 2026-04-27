import os

from models.hot_store import FileType

# Extension to FileType mapping
EXTENSION_MAP: dict[str, FileType] = {
    ".pdf": FileType.PDF,
    ".docx": FileType.DOCX,
    ".doc": FileType.DOCX,
    ".xlsx": FileType.XLSX,
    ".xls": FileType.XLSX,
    ".csv": FileType.CSV,
    ".txt": FileType.TXT,
    # ".jpg": FileType.JPG,
    # ".jpeg": FileType.JPG,
    # ".png": FileType.PNG,
}


def detect_file_type(filename: str) -> FileType:
    ext = os.path.splitext(filename)[1].lower()
    return EXTENSION_MAP.get(ext, FileType.OTHER)
