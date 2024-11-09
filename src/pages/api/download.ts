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
    if (urls.length === 0) {
        return new Response(JSON.stringify({ error: 'No files were downloaded' }), {
            status: 400,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    
    // Download each file
    const downloadPromises = urls.map(async (url, index) => {
        const response = await axios.get<Buffer>(url, { responseType: 'arraybuffer' });
        
        // Get filename from Content-Disposition header or fallback to URL
        let fileName = `image-${index}.png`;  // default fallback
        
        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
            if (matches && matches[1]) {
                fileName = matches[1].replace(/['"]/g, '');
            }
        }
        
        // If no filename in headers, try to get it from URL
        if (fileName === `image-${index}.png`) {
            const urlFileName = new URL(url).pathname.split('/').pop();
            if (urlFileName) {
                fileName = decodeURIComponent(urlFileName);
            }
        }

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
