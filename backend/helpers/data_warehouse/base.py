from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import pandas as pd

class BaseConnector(ABC):
    """
    Abstract base class for data warehouse connectors.
    """

    @abstractmethod
    def connect(self) -> None:
        """
        Authenticate and establish a connection to the data source.
        """
        pass

    @abstractmethod
    def list_files(self, prefix: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List files available in the data warehouse.
        """
        pass

    @abstractmethod
    def download_file(self, file_id: str, dest_path: str) -> str:
        """
        Download a specific file by its ID or path.
        Returns the path to the downloaded file.
        """
        pass
        
    @abstractmethod
    def load_as_dataframe(self, file_id: str) -> pd.DataFrame:
        """
        Download a file and load it directly into a pandas DataFrame.
        """
        pass
