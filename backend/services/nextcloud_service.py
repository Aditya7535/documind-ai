import os
import requests
import urllib.parse
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from backend.config import settings

class NextcloudService:
    """
    Nextcloud WebDAV & REST API Client for Document Ingestion and Storage.
    Stores and synchronizes documents in Nextcloud and vectors into the RAG engine.
    """
    def __init__(self):
        self.url = os.getenv("NEXTCLOUD_URL", "http://localhost:8080").rstrip("/")
        self.username = os.getenv("NEXTCLOUD_USERNAME", "admin")
        self.password = os.getenv("NEXTCLOUD_PASSWORD", "admin123")
        self.dav_url = f"{self.url}/remote.php/dav/files/{self.username}"

    def update_config(self, url: str, username: str, password: str):
        """
        Dynamically update Nextcloud connection credentials.
        """
        self.url = url.rstrip("/")
        self.username = username
        self.password = password
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

    def ensure_folder(self, folder_name: str = "DocuMind") -> bool:
        """
        Create a folder in Nextcloud via WebDAV MKCOL (no-op if it already exists).
        """
        safe_folder = urllib.parse.quote(folder_name.strip('/'))
        folder_url = f"{self.dav_url}/{safe_folder}"
        try:
            res = requests.request(
                "MKCOL",
                folder_url,
                auth=(self.username, self.password),
                timeout=5
            )
            # 201 = created, 405 = already exists — both mean folder is present
            return res.status_code in (201, 405)
        except Exception as e:
            print(f"[NextcloudService] Error creating folder '{folder_name}': {e}")
            return False

    def _query_folder(self, folder: str = "") -> List[Dict[str, Any]]:
        """
        Query a single folder via WebDAV PROPFIND.
        """
        clean_folder = folder.strip('/')
        safe_folder = urllib.parse.quote(clean_folder) if clean_folder else ""
        target_path = f"{self.dav_url}/{safe_folder}".rstrip('/') + '/'
        headers = {"Depth": "1"}
        try:
            res = requests.request(
                "PROPFIND",
                target_path,
                auth=(self.username, self.password),
                headers=headers,
                timeout=7
            )
            if res.status_code not in (200, 207):
                return []

            files = []
            root = ET.fromstring(res.content)
            for response in root.findall("{DAV:}response"):
                href_elem = response.find("{DAV:}href")
                if href_elem is None or not href_elem.text:
                    continue
                raw_href = href_elem.text
                decoded_href = urllib.parse.unquote(raw_href)

                # Check if it's a directory / collection
                resourcetype = response.find(".//{DAV:}resourcetype")
                if resourcetype is not None and resourcetype.find("{DAV:}collection") is not None:
                    continue

                fname = decoded_href.rstrip('/').split('/')[-1]
                if not fname:
                    continue

                if fname.lower().endswith(('.pdf', '.txt', '.md', '.docx', '.csv', '.json')):
                    # Extract file size
                    size_elem = response.find(".//{DAV:}getcontentlength")
                    file_size = int(size_elem.text) if (size_elem is not None and size_elem.text and size_elem.text.isdigit()) else 0

                    # Extract last modified
                    mod_elem = response.find(".//{DAV:}getlastmodified")
                    last_mod = mod_elem.text if mod_elem is not None else ""

                    current_folder = clean_folder if clean_folder else "Root"
                    web_url = f"{self.url}/index.php/apps/files/files?dir=/{urllib.parse.quote(clean_folder)}" if clean_folder else f"{self.url}/index.php/apps/files"

                    files.append({
                        "name": fname,
                        "path": decoded_href,
                        "folder": current_folder,
                        "size": file_size,
                        "last_modified": last_mod,
                        "web_url": web_url,
                        "dav_url": f"{self.url}{raw_href}",
                        "source": "Nextcloud Storage"
                    })
            return files
        except Exception as e:
            print(f"[NextcloudService] Error querying folder '{folder}': {e}")
            return []

    def list_documents(self, folder: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List files in Nextcloud. If folder is None, scans both 'DocuMind' and Root,
        returning all unique available documents.
        """
        if folder is not None:
            return self._query_folder(folder)

        # Default: scan DocuMind folder first, then Root folder
        all_files = []
        seen_names = set()

        # 1. Dedicated DocuMind folder
        self.ensure_folder("DocuMind")
        documind_files = self._query_folder("DocuMind")
        for f in documind_files:
            if f["name"] not in seen_names:
                all_files.append(f)
                seen_names.add(f["name"])

        # 2. Root folder
        root_files = self._query_folder("")
        for f in root_files:
            if f["name"] not in seen_names:
                all_files.append(f)
                seen_names.add(f["name"])

        return all_files

    def download_file(self, file_path: str) -> bytes:
        """
        Download a file from Nextcloud via WebDAV.
        Accepts full href path or relative path.
        """
        clean_path = urllib.parse.unquote(file_path).strip()
        if clean_path.startswith("/remote.php/dav/files/"):
            # Clean path after /remote.php/dav/files/{user}/
            parts = clean_path.split(f"/remote.php/dav/files/{self.username}/")
            rel_path = parts[1] if len(parts) > 1 else clean_path
        else:
            rel_path = clean_path.lstrip('/')

        safe_rel_path = "/".join(urllib.parse.quote(segment) for segment in rel_path.split('/'))
        full_url = f"{self.dav_url}/{safe_rel_path}"

        res = requests.get(full_url, auth=(self.username, self.password), timeout=20)
        res.raise_for_status()
        return res.content

    def upload_file(self, file_bytes: bytes, filename: str, folder: str = "DocuMind") -> Dict[str, Any]:
        """
        Upload a file to Nextcloud via WebDAV PUT.
        Stores files in a dedicated 'DocuMind' folder by default.
        Returns upload status and Nextcloud URLs.
        """
        self.ensure_folder(folder)
        clean_folder = folder.strip('/')
        safe_filename = urllib.parse.quote(filename)
        safe_folder = urllib.parse.quote(clean_folder)
        upload_url = f"{self.dav_url}/{safe_folder}/{safe_filename}"

        try:
            res = requests.put(
                upload_url,
                data=file_bytes,
                auth=(self.username, self.password),
                headers={"Content-Type": "application/octet-stream"},
                timeout=30
            )
            if res.status_code in (200, 201, 204):
                nc_path = f"/remote.php/dav/files/{self.username}/{clean_folder}/{filename}"
                dav_url = f"{self.dav_url}/{safe_folder}/{safe_filename}"
                web_url = f"{self.url}/index.php/apps/files/files?dir=/{safe_folder}"

                print(f"[NextcloudService] Uploaded '{filename}' to Nextcloud Storage -> {nc_path}")
                return {
                    "success": True,
                    "filename": filename,
                    "folder": clean_folder,
                    "nextcloud_path": nc_path,
                    "dav_url": dav_url,
                    "web_url": web_url,
                    "storage_location": f"Nextcloud Storage (/{clean_folder})",
                    "url": web_url
                }
            else:
                print(f"[NextcloudService] Upload failed: HTTP {res.status_code} — {res.text[:200]}")
                return {"success": False, "error": f"HTTP {res.status_code}"}
        except Exception as e:
            print(f"[NextcloudService] Upload error: {e}")
            return {"success": False, "error": str(e)}

    def delete_file(self, filename: str, folder: str = "DocuMind") -> bool:
        """
        Delete a file from Nextcloud WebDAV.
        """
        clean_folder = folder.strip('/')
        safe_filename = urllib.parse.quote(filename)
        safe_folder = urllib.parse.quote(clean_folder) if clean_folder else ""
        target_url = f"{self.dav_url}/{safe_folder}/{safe_filename}" if safe_folder else f"{self.dav_url}/{safe_filename}"

        try:
            res = requests.delete(
                target_url,
                auth=(self.username, self.password),
                timeout=10
            )
            return res.status_code in (200, 204)
        except Exception as e:
            print(f"[NextcloudService] Error deleting file '{filename}': {e}")
            return False

nextcloud_service = NextcloudService()
