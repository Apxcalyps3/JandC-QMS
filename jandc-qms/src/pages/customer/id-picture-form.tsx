import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Upload, X, Image as ImageIcon, ArrowRight } from "lucide-react";
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
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];

const formSchema = z.object({
  photoSize: z.string(),
  copies: z.coerce.number().min(1).max(100),
});

export function IdPictureForm() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { state, updateState } = useOrder();
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(state.files || []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      photoSize: state.photoSize || "1x1",
      copies: state.copies || 4,
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
            throw new Error(`File ${file.name} has an unsupported format. Please upload JPG or PNG.`);
          }
          return await uploadFile(file);
        })
      );
      
      // Limit to 1 photo for ID pictures usually, but we'll append if they upload more
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
        title: "No photo",
        description: "Please upload a photo for your ID picture.",
        variant: "destructive",
      });
      return;
    }

    updateState({
      serviceType: "id-picture",
      ...values,
      files,
    });
    
    setLocation("/order/review");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">ID Picture</h1>
        <p className="text-muted-foreground">Upload your photo and select size options.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photo Upload</CardTitle>
          <CardDescription>JPG or PNG only (max 200MB per file)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center bg-muted/30">
            <Upload className="w-8 h-8 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-2">Click to browse or drag and drop your photo here</p>
            <div className="relative">
              <Input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={onFileChange}
                accept=".jpg,.jpeg,.png"
                disabled={isUploading}
              />
              <Button type="button" variant="secondary" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Select Photo"}
              </Button>
            </div>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              {files.map((file, i) => (
                <div key={i} className="relative group rounded-md overflow-hidden border">
                  <img 
                    src={file.url} 
                    alt={file.originalName} 
                    className="w-full aspect-square object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeFile(i)}>
                      <X className="w-4 h-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Picture Options</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="photoSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo Size</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1x1">1 x 1</SelectItem>
                        <SelectItem value="2x2">2 x 2</SelectItem>
                        <SelectItem value="Passport">Passport Size</SelectItem>
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
