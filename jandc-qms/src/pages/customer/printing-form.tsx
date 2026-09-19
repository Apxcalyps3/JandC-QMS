import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Upload, X, FileText, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOrder } from "@/components/order-provider";
import { uploadFile } from "@/lib/upload-utils";
import { UploadedFile } from "@workspace/api-client-react";

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png"
];

const formSchema = z.object({
  paperSize: z.string(),
  printColor: z.string(),
  copies: z.coerce.number().min(1).max(1000),
});

export function PrintingForm() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { state, updateState } = useOrder();
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(state.files || []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paperSize: state.paperSize || "A4",
      printColor: state.printColor || "bw",
      copies: state.copies || 1,
    },
  });

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const newUploads = await Promise.all(
        selectedFiles.map(async (file) => {
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File ${file.name} is too large (max 200MB)`);
          }
          if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
            throw new Error(`File ${file.name} has an unsupported format`);
          }
          return await uploadFile(file);
        })
      );

      setFiles((prev) => [...prev, ...newUploads]);
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Failed to upload file(s)",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (files.length === 0) {
      toast({
        title: "No files",
        description: "Please upload at least one file to print.",
        variant: "destructive",
      });
      return;
    }

    updateState({
      serviceType: "printing",
      ...values,
      files,
    });

    setLocation("/order/review");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">Document Printing</h1>
        <p className="text-muted-foreground">Upload your files and select print options.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Files to Print</CardTitle>
          <CardDescription>PDF, Word, Excel, PowerPoint, or Images (max 200MB per file)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30">
            <Upload className="w-8 h-8 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-2">Click to browse or drag and drop files here</p>
            <p className="text-xs text-muted-foreground mb-4">Supported formats: .pdf, .docx, .xlsx, .pptx, .jpg, .png</p>
            <div className="relative">
              <Input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={onFileChange}
                accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png"
                disabled={isUploading}
              />
              <Button type="button" variant="secondary" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Select Files"}
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 mt-6">
              <h3 className="text-sm font-medium">Uploaded Files ({files.length})</h3>
              <div className="grid gap-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-md bg-card">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB {file.pageCount ? `• ${file.pageCount} pages` : ''}</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Print Options</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="paperSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paper Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A4">A4 (8.27" x 11.69")</SelectItem>
                        <SelectItem value="Short">Short / Letter (8.5" x 11")</SelectItem>
                        <SelectItem value="Long">Long / Legal (8.5" x 13")</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="printColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bw">Black & White</SelectItem>
                        <SelectItem value="colored">Colored</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="copies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Copies</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <Button type="button" variant="outline" onClick={() => setLocation("/")}>Back</Button>
              <Button type="submit" disabled={isUploading || files.length === 0}>
                Continue to Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
