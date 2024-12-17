import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing<FileRouter>()({
    image: {
        maxFileSize: "4MB",
        maxFileCount: 10
    }
});

export const uploadRouter = f;
export const utapi = createUploadthing({
    apiKey: process.env.UPLOADTHING_SECRET!,
    appId: process.env.UPLOADTHING_APP_ID!,
});