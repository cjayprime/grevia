import os
import pandas as pd
from typing import Any, Dict, List, Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io

from .base import BaseConnector

class GoogleDriveConnector(BaseConnector):
    """
    Connector for Google Drive using a Service Account or OAuth2 credentials.
    """

    def __init__(self, credentials_path: Optional[str] = None):
        self.credentials_path = credentials_path or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.service = None

    def connect(self) -> None:
        if not self.credentials_path:
            raise ValueError("Google credentials path not provided.")
        
        creds = service_account.Credentials.from_service_account_file(
            self.credentials_path, 
            scopes=['https://www.googleapis.com/auth/drive.readonly']
        )
        self.service = build('drive', 'v3', credentials=creds)

    def list_files(self, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.service:
            self.connect()
        
        query = "mimeType != 'application/vnd.google-apps.folder'"
        if prefix:
            query += f" and name contains '{prefix}'"
        
        results = self.service.files().list(
            q=query, 
            fields="nextPageToken, files(id, name, mimeType)"
        ).execute()
        return results.get('files', [])

    def download_file(self, file_id: str, dest_path: str) -> str:
        if not self.service:
            self.connect()
        
        request = self.service.files().get_media(fileId=file_id)
        with io.FileIO(dest_path, 'wb') as fh:
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
        return dest_path

    def load_as_dataframe(self, file_id: str) -> pd.DataFrame:
        if not self.service:
            self.connect()
        
        request = self.service.files().get_media(fileId=file_id)
        file_stream = io.BytesIO()
        downloader = MediaIoBaseDownload(file_stream, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
        
        file_stream.seek(0)
        # Assume CSV for now, but could be extended based on mimeType
        return pd.read_csv(file_stream)
