import { UploadedFile } from "@workspace/api-client-react";

export async function uploadFile(file: File): Promise<UploadedFile> {
  const isImage = file.type.startsWith("image/");
  try {
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await fetch("/api/files/upload", { 
      method: "POST", 
      body: formData 
    });
    
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Upload fallback to local object URL:", err);
  }
  
  const blobUrl = URL.createObjectURL(file);
  return {
    filename: file.name,
    originalName: file.name,
    mimeType: file.type || (isImage ? "image/jpeg" : "application/pdf"),
    size: file.size,
    url: blobUrl,
    assetType: isImage ? "image" : "document",
    pageCount: isImage ? 1 : 2,
  };
}

