import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { Anthropic } from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';
import { utapi } from "src/server/uploadthing.ts";
import sharp from 'sharp';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
    const imagesDir = path.join('/tmp', 'images');

    // Ensure the images directory exists
    await fs.mkdir(imagesDir, { recursive: true });
    const formData = await request.formData();


    let imageFiles: File[] = [];
    const imageFile1 = formData.get('file0') as File;
    if (!imageFile1) {
        throw new Error('No image file provided');
    } else {
        const buffer = Buffer.from(await imageFile1.arrayBuffer());
        await fs.writeFile(path.join(imagesDir, 'file0.png'), buffer);
        imageFiles.push(imageFile1);
    }
    const imageFile2 = formData.get('file1') as File;
    if (imageFile2) {
        const buffer = Buffer.from(await imageFile2.arrayBuffer());
        await fs.writeFile(path.join(imagesDir, 'file1.png'), buffer);
        imageFiles.push(imageFile2);
    }

    const imageFile3 = formData.get('file2') as File;
    if (imageFile3) {
        const buffer = Buffer.from(await imageFile3.arrayBuffer());
        await fs.writeFile(path.join(imagesDir, 'file2.png'), buffer);
        imageFiles.push(imageFile3);
    }
    console.log(imageFiles,);
    const systemPrompt = "Given the input return a node js script | use the require syntax in the script | for image resizing use the sharp library, do not include the const sharp = require('sharp'); in the script | that can do the photo editing work described by the user | the files are located at " + imagesDir + " | Don't include any characters like '\\n' | I need the code to just be the syntax, not formatted as text | do not include any leading text or trailing text such as: Here's a Node.js script that creates three copies of the specified file: | there are up to 3 images to work with, if theres one the file will be called file0.png, if there are two the files will be called file0.png and file1.png, if there are three the files will be called file0.png, file1.png, and file2.png | after all the scripts are done running send the files back to the server using import { parentPort, workerData } from 'worker_threads'; parentPort.postMessage([possibleFileName1, possibleFileName2, possibleFileName3]); }; This array will be the names of the files that were created";

    try {
        const prompt = formData.get('prompt') as string;
        console.log('Prompt:', prompt);

        // Send prompt to Anthropic
        const msg = await anthropic.messages.create({
            model: "claude-3-5-sonnet-20240620",
            max_tokens: 1000,
            temperature: 0,
            system: systemPrompt,
            messages: [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ]
        });

        // Create a unique filename for the worker
        const workerFileName = `worker.${uuidv4()}.js`;
        const workersDir = path.join('/tmp', 'workers');
        const workerFilePath = path.join(workersDir, workerFileName);
        const content = msg.content[0];
        let imagePath1: any;
        let imagePath2: any;
        let imagePath3: any;
        if (imageFile1) {
            imagePath1 = path.join(imagesDir, `${imageFiles[0].name}.png`);
        }
        if (imageFile2) {
            imagePath2 = path.join(imagesDir, `${imageFiles[1].name}.png`);
        }
        if (imageFile3) {
            imagePath3 = path.join(imagesDir, `${imageFiles[2].name}.png`);
        }

        await fs.mkdir(workersDir, { recursive: true });

        // Write the worker file
        if ('text' in content) {
            const workerContentTemp = `
            const sharp = ${sharp.toString()};
            const imagePath1 = '${imagePath1}';
            const imagePath2 = '${imagePath2}';
            const imagePath3 = '${imagePath3}';
            ${content.text}
        `;
            const workerContent = workerContentTemp
            await fs.writeFile(workerFilePath, workerContent);
            console.log(content);
        } else {
            throw new Error('Unexpected content type in response');
        }

        return new Promise((resolve, reject) => {
            const worker = new Worker(workerFilePath, { workerData: { imagePath1, imagePath2, imagePath3 } });

            worker.on('message', async (message) => {
                console.log('Message from worker:', message);
                
                // Read the files from the images directory and create File objects
                const files = await Promise.all(message.map(async (filename: string) => {
                    const filePath = path.join(process.cwd(), 'images', filename);
                    const fileBuffer = await fs.readFile(filePath);
                    return new File([fileBuffer], filename, { type: "image/png" });
                }));
                
                console.log("files", files);

                await utapi.uploadFiles(files).then((result) => {
                    console.log("result", result);
                    const fileKeys = result.map(item => item.data?.key);
                    console.log("fileKeys", fileKeys);
                    resolve(new Response(JSON.stringify(fileKeys), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }));    
                });
                //TODO: get the files from the message, upload them to UT via server side upload, on onUploadComplete return all the keys to the client in an object 
                
                resolve(new Response(JSON.stringify(message), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }));    
            });

            worker.on('error', (error) => {
                console.error('Worker error:', error);
                reject(new Response(JSON.stringify({ message: 'Worker error', error: error.message }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }));
            });

            worker.on('exit', (code) => {
                console.log(`Worker exited with code ${code}`);
                // Clean up the worker file
                fs.unlink(workerFilePath).catch(console.error);
                if (code !== 0) {
                    reject(new Response(JSON.stringify({ message: 'Worker exited with non-zero code', code }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }));
                }
            });
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
