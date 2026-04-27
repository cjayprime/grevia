import os
import boto3
import pandas as pd
from typing import Any, Dict, List, Optional
import io

from .base import BaseConnector

class S3Connector(BaseConnector):
    """
    Connector for AWS S3 using boto3.
    """

    def __init__(self, bucket_name: str, region_name: Optional[str] = None):
        self.bucket_name = bucket_name
        self.region_name = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.s3_client = None

    def connect(self) -> None:
        # Uses default credential provider chain (env vars, ~/.aws/credentials, etc.)
        self.s3_client = boto3.client('s3', region_name=self.region_name)

    def list_files(self, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        if not self.s3_client:
            self.connect()
        
        params = {'Bucket': self.bucket_name}
        if prefix:
            params['Prefix'] = prefix
            
        results = self.s3_client.list_objects_v2(**params)
        files = []
        for obj in results.get('Contents', []):
            files.append({
                'id': obj['Key'],
                'name': obj['Key'],
                'size': obj['Size']
            })
        return files

    def download_file(self, file_id: str, dest_path: str) -> str:
        if not self.s3_client:
            self.connect()
        
        self.s3_client.download_file(self.bucket_name, file_id, dest_path)
        return dest_path

    def load_as_dataframe(self, file_id: str) -> pd.DataFrame:
        if not self.s3_client:
            self.connect()
        
        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_id)
        content = response['Body'].read()
        
        # Determine format from extension
        if file_id.endswith('.csv'):
            return pd.read_csv(io.BytesIO(content))
        elif file_id.endswith('.xlsx') or file_id.endswith('.xls'):
            return pd.read_excel(io.BytesIO(content))
        else:
            # Fallback to CSV
            return pd.read_csv(io.BytesIO(content))
