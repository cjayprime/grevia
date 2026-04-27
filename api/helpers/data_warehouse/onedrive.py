import os
import msal
import requests
import pandas as pd
from typing import Any, Dict, List, Optional
import io

from .base import BaseConnector

class OneDriveConnector(BaseConnector):
    """
    Connector for Microsoft OneDrive/SharePoint using MS Graph API.
    """

    def __init__(self, client_id: str, client_secret: str, tenant_id: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.authority = f"https://login.microsoftonline.com/{tenant_id}"
        self.access_token = None

    def connect(self) -> None:
        app = msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret,
        )
        result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
        if "access_token" in result:
            self.access_token = result["access_token"]
        else:
            raise Exception(f"Could not acquire access token: {result.get('error_description')}")

    def list_files(self, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.access_token:
            self.connect()
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        # List files in the root of the drive for now
        url = "https://graph.microsoft.com/v1.0/me/drive/root/children"
        # Note: 'me' requires user delegated auth, for client auth use 'users/{id}/drive' or 'drives/{id}'
        # This is a simplified version
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        items = response.json().get('value', [])
        files = []
        for item in items:
            if 'file' in item:
                if not prefix or item['name'].startswith(prefix):
                    files.append({
                        'id': item['id'],
                        'name': item['name'],
                        'size': item['size']
                    })
        return files

    def download_file(self, file_id: str, dest_path: str) -> str:
        if not self.access_token:
            self.connect()
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        with open(dest_path, 'wb') as f:
            f.write(response.content)
        return dest_path

    def load_as_dataframe(self, file_id: str) -> pd.DataFrame:
        if not self.access_token:
            self.connect()
        
        headers = {'Authorization': f'Bearer {self.access_token}'}
        url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        content = response.content
        return pd.read_csv(io.BytesIO(content))
