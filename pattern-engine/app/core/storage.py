"""File storage behind an interface so we can move to S3-compatible storage (MinIO) later."""
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.config import settings


class Storage(ABC):
    @abstractmethod
    def save(self, data: bytes, folder: str, extension: str) -> str:
        """Store bytes and return a storage key (relative path)."""

    @abstractmethod
    def read(self, key: str) -> bytes:
        ...

    @abstractmethod
    def path_for(self, key: str) -> Path:
        """Local filesystem path (used by the PDF renderer)."""


class LocalStorage(Storage):
    def __init__(self, root: str | None = None):
        self.root = Path(root or settings.STORAGE_DIR).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _safe_path(self, key: str) -> Path:
        path = (self.root / key).resolve()
        if self.root not in path.parents and path != self.root:
            raise ValueError("Storage key escapes storage root")
        return path

    def save(self, data: bytes, folder: str, extension: str) -> str:
        ext = extension.lstrip(".").lower()
        key = f"{folder}/{uuid.uuid4().hex}.{ext}"
        path = self._safe_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    def read(self, key: str) -> bytes:
        return self._safe_path(key).read_bytes()

    def path_for(self, key: str) -> Path:
        return self._safe_path(key)


# MinIO / S3 implementation goes here when needed (MinIO server is AGPL-3.0; the
# `minio` Python client is Apache-2.0). Not added yet: no approval needed until used.

_storage: Storage | None = None


def get_storage() -> Storage:
    global _storage
    if _storage is None:
        _storage = LocalStorage()
    return _storage
