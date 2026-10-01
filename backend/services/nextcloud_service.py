import os
import requests
from typing import List, Dict, Any
from backend.config import settings

class NextcloudService:
    """
    Nextcloud WebDAV & REST API Client for Document Ingestion.
    Synchronizes PDFs and documents stored in Nextcloud into the Vector Database.
    """
    def __init__(self):
        self.url = os.getenv("NEXTCLOUD_URL", "http://localhost:8080").rstrip("/")
        self.username = os.getenv("NEXTCLOUD_USERNAME", "admin")
        self.password = os.getenv("NEXTCLOUD_PASSWORD", "admin123")
        self.dav_url = f"{self.url}/remote.php/dav/files/{self.username}"

    def test_connection(self) -> bool:
        """
        Check if Nextcloud instance is reachable.
        """
        try:
            res = requests.get(
                f"{self.url}/status.php",
                timeout=3
            )
            return res.status_code == 200
        except Exception:
            return False

    def list_documents(self, folder: str = "") -> List[Dict[str, Any]]:
        """
        List files in Nextcloud folder via WebDAV PROPFIND.
        """
        target_path = f"{self.dav_url}/{folder.strip('/')}".rstrip('/') + '/'
        headers = {"Depth": "1"}
        try:
            res = requests.request(
                "PROPFIND",
                target_path,
                auth=(self.username, self.password),
                headers=headers,
                timeout=5
            )
            if res.status_code not in (200, 207):
                return []

            # Basic parsing of PROPFIND XML response
            files = []
            import xml.etree.ElementTree as ET
            root = ET.fromstring(res.content)
            for response in root.findall("{DAV:}response"):
                href = response.find("{DAV:}href").text
                fname = href.split('/')[-1] if href.split('/')[-1] else href.split('/')[-2]
                if fname.lower().endswith(('.pdf', '.txt', '.md', '.docx')):
                    files.append({
                        "name": fname,
                        "path": href,
                        "source": "Nextcloud Drive"
                    })
            return files
        except Exception as e:
            print(f"[NextcloudService] Error listing files: {e}")
            return []

    def download_file(self, file_path: str) -> bytes:
        """
        Download a file from Nextcloud via WebDAV.
        """
        full_url = f"{self.url}{file_path}" if file_path.startswith("/") else f"{self.dav_url}/{file_path}"
        res = requests.get(full_url, auth=(self.username, self.password), timeout=10)
        res.raise_for_status()
        return res.content

nextcloud_service = NextcloudService()
