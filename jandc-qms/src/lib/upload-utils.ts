import { UploadedFile } from "@workspace/api-client-react";

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch("/api/files/upload", { 
    method: "POST", 
    body: formData 
  });
  
  if (!res.ok) {
    throw new Error("Failed to upload file");
  }
  
  return res.json();
}
