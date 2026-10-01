import os
import shutil
from typing import Optional
from backend.config import settings

class S3Service:
    def __init__(self):
        self.mode = settings.RUN_MODE
        self.bucket = settings.S3_BUCKET_NAME
        self.s3_client = None
        self.local_dir = os.path.join(settings.LOCAL_STORAGE_DIR, "docs")
        os.makedirs(self.local_dir, exist_ok=True)

        if self.mode == "aws":
            try:
                import boto3
                kwargs = {"region_name": settings.AWS_REGION}
                if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
                    kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
                    kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
                self.s3_client = boto3.client("s3", **kwargs)
            except Exception as e:
                print(f"[S3Service] Could not initialize boto3 S3 client: {e}. Falling back to local storage.")
                self.mode = "local"

    def upload_file(self, file_bytes: bytes, file_name: str, doc_id: str) -> str:
        """
        Store raw document in S3 or local storage. Returns file URI.
        """
        key = f"documents/{doc_id}_{file_name}"
        if self.mode == "aws" and self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket,
                    Key=key,
                    Body=file_bytes,
                    ContentType="application/pdf" if file_name.endswith(".pdf") else "text/plain"
                )
                return f"s3://{self.bucket}/{key}"
            except Exception as e:
                print(f"[S3Service] S3 upload failed: {e}. Saving locally.")

        local_path = os.path.join(self.local_dir, f"{doc_id}_{file_name}")
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return f"file://{local_path}"

    def delete_file(self, doc_id: str, file_name: str):
        key = f"documents/{doc_id}_{file_name}"
        if self.mode == "aws" and self.s3_client:
            try:
                self.s3_client.delete_object(Bucket=self.bucket, Key=key)
            except Exception as e:
                print(f"[S3Service] S3 delete error: {e}")

        local_path = os.path.join(self.local_dir, f"{doc_id}_{file_name}")
        if os.path.exists(local_path):
            os.remove(local_path)

s3_service = S3Service()
