import type { APIRoute } from 'astro';
import { utapi } from "src/server/uploadthing.ts";
import { promises as fs } from 'fs';
import * as path from 'path';
import axios from 'axios';
import { zip } from 'zip-a-folder';

export const POST: APIRoute = async ({ request }) => {
    const editedImagesDir = path.join('/tmp', 'edited-images');
    const zipPath = path.join('/tmp', 'edited-images.zip');
    
    await fs.mkdir(editedImagesDir, { recursive: true });
    
    const body = await request.json();
    const response = await utapi.getFileUrls(body);
    const urls = response.data.map(item => item.url);
    
    // Download each file
    const downloadPromises = urls.map(async (url, index) => {
        const response = await axios.get<Buffer>(url, { responseType: 'arraybuffer' });
        const fileName = `image-${index}.png`;
        const filePath = path.join(editedImagesDir, fileName);
        await fs.writeFile(filePath, response.data);
        return fileName;
    });
    
    // Wait for all downloads to complete
    const downloadedFiles = await Promise.all(downloadPromises);
    console.log('Downloaded files:', downloadedFiles);
    
    // Zip the folder
    await zip(editedImagesDir, zipPath);
    
    // Read the zip file and return it directly
    const zipFile = await fs.readFile(zipPath);
    
    console.log(zipFile);
    
    return new Response(zipFile, {
        status: 200,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="edited-images.zip"'
        }
    });
};
