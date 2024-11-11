import { Anthropic } from "@anthropic-ai/sdk";
import type { APIRoute } from 'astro';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { utapi } from "src/server/uploadthing.ts";
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
    const imagesDir = path.join('/tmp', 'images');

    console.log("Cleaning up previous images...");
    try {
        await new Promise((resolve, _) => {
            exec(
                `rm -rf ${imagesDir}`,
                (error: any, _: string, stderr: string) => {
                    if (error) {
                        console.warn('Warning: Could not clean up images directory:', stderr);
                    }
                    console.log('Images cleanup completed');
                    resolve(null);
                }
            );
        });

        // Recreate the images directory
        await mkdir(imagesDir, { recursive: true });
    } catch (error) {
        console.warn('Warning: Error during cleanup/setup:', error);
        // Continue execution as the next steps will attempt to create the directory anyway
    }

    const tmpDir = '/tmp';

    // Add package.json and install sharp
    const packageJson = {
        "type": "module",
        "dependencies": {
            "sharp": "latest"
        }
    };
    await writeFile(path.join(tmpDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Ensure the images directory exists
    await mkdir(imagesDir, { recursive: true });
    const formData = await request.formData();


    let imageFiles: File[] = [];
    let fileNames: string[] = [];
    const imageFile1 = formData.get('file0') as File;
    if (!imageFile1) {
        throw new Error('No image file provided');
    } else {
        const extension = imageFile1.name.split('.').pop() || 'png';
        const buffer = Buffer.from(await imageFile1.arrayBuffer());
        await writeFile(path.join(imagesDir, `file0.${extension}`), buffer);
        imageFiles.push(imageFile1);
        fileNames.push(`file0.${extension}`);
    }
    const imageFile2 = formData.get('file1') as File;
    if (imageFile2) {
        const extension = imageFile2.name.split('.').pop() || 'png';
        const buffer = Buffer.from(await imageFile2.arrayBuffer());
        await writeFile(path.join(imagesDir, `file1.${extension}`), buffer);
        imageFiles.push(imageFile2);
        fileNames.push(`file1.${extension}`);
    }

    const imageFile3 = formData.get('file2') as File;
    if (imageFile3) {
        const extension = imageFile3.name.split('.').pop() || 'png';
        const buffer = Buffer.from(await imageFile3.arrayBuffer());
        await writeFile(path.join(imagesDir, `file2.${extension}`), buffer);
        imageFiles.push(imageFile3);
        fileNames.push(`file2.${extension}`);
    }

    console.log("imageFiles", imageFiles);
    const systemPrompt = "Given the input return a node js script | use ES module imports (import syntax) instead of require | for image resizing use the sharp library | that can do the photo editing work described by the user | the files are located at " + imagesDir + " | Don't include any characters like '\\n' | I need the code to just be the syntax, not formatted as text | do not include any leading text or trailing text such as: Here's a Node.js script that creates three copies of the specified file: | there are up to 3 images to work with, if theres one the file will be called file0.[some extension], if there are two the files will be called file0.[some extension] and file1.[some extension], if there are three the files will be called file0.[some extension], file1.[some extension], and file2.[some extension] | after all the scripts are done running send the files back to the server using import { parentPort, workerData } from 'worker_threads'; parentPort.postMessage([possibleFileName1, possibleFileName2, possibleFileName3]); }; This array will be the names of the files that were created | when responding with file names, only include the file name, not the path. for example return 'resized_100x100.png' and not '/tmp/images/resized_100x100.png'  | if this is a file conversion be sure to include the file extension in the file names, and come up with a new name for the file | do not import path twice";

    try {
        const prompt = formData.get('prompt') as string;
        console.log('Prompt:', prompt);

        const fixedPrompt = `${prompt} \n your input files are located at /tmp/images the file names are ${fileNames.join(', ')}
        access them by declaring them like this: const imagePath1 = path.join('/tmp/images', 'file0.png');
        `;

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
                            "text": fixedPrompt
                        }
                    ]
                }
            ]
        });

        // Create a unique filename for the worker
        const workersDir = path.join('/tmp', 'workers');
        const workerFileName = `worker.${uuidv4()}.js`;
        const workerFilePath = path.join(workersDir, workerFileName);

        // Create workers directory and package.json
        await mkdir(workersDir, { recursive: true });

        const workerPackageJson = {
            "type": "module",
            "dependencies": {
                "sharp": "latest"
            }
        };
        await writeFile(path.join(workersDir, 'package.json'), JSON.stringify(workerPackageJson, null, 2));


        console.log("Installing worker dependencies...");
        await new Promise((resolve, reject) => {
            exec(
                'npm install --no-audit --no-fund --prefix /tmp --cache /tmp/npm-cache',
                {
                    env: {
                        ...process.env,
                        HOME: '/tmp',
                        npm_config_cache: '/tmp/npm-cache'
                    }
                },
                (error: any, stdout: string, stderr: string) => {
                    if (error) {
                        console.error('Error installing dependencies:', error);
                        console.error('stderr:', stderr);
                        reject(error);
                        return;
                    }
                    console.log('stdout:', stdout);
                    resolve(null);
                }
            );
        });

        console.log("listing directory contents");
        await new Promise((resolve, reject) => {
            exec('ls -a', (error: any, stdout: string, _: string) => {
                if (error) {
                    console.error('Error listing directory:', error);
                    reject(error);
                }
                console.log('Directory contents:', stdout);
                resolve(null);
            });
        });

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

        await mkdir(workersDir, { recursive: true });

        // Write the worker file
        if ('text' in content) {
            const workerContentTemp = `
            // const imagePath1 = '${imagePath1}';
            // const imagePath2 = '${imagePath2}';
            // const imagePath3 = '${imagePath3}';
            ${content.text}
        `;
            const workerContent = workerContentTemp
            await writeFile(workerFilePath, workerContent);
            console.log(content);
        } else {
            throw new Error('Unexpected content type in response');
        }

        return new Promise((resolve, reject) => {

            const worker = new Worker(workerFilePath, { workerData: { imagePath1, imagePath2, imagePath3 } });

            worker.on('message', async (message) => {
                console.log('Message from worker:', message);

                try {
                    if (!Array.isArray(message)) {
                        throw new Error('Worker message must be an array of filenames');
                    }

                    const files = await Promise.all(message.map(async (filename: string) => {
                        const filePath = path.join('/tmp', 'images', filename);
                        try {
                            const fileBuffer = await readFile(filePath);
                            return new File([fileBuffer], filename, { type: "image/png" });
                        } catch (err: unknown) {
                            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                            throw new Error(`Failed to read file ${filename}: ${errorMessage}`);
                        }
                    }));

                    console.log("Processing files:", files);

                    if (!files.length) {
                        throw new Error('No files were processed');
                    }

                    const result = await utapi.uploadFiles(files);
                    if (!result) {
                        throw new Error('Upload failed - no result returned');
                    }

                    const fileKeysAndFilenames = result.map(item => {
                        if (!item.data?.key || !item.data?.name) {
                            throw new Error(`Invalid upload result: ${JSON.stringify(item)}`);
                        }
                        return {
                            key: item.data.key,
                            filename: item.data.name
                        };
                    });

                    resolve(new Response(JSON.stringify(fileKeysAndFilenames), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }));
                } catch (error) {
                    console.error('Error processing worker message:', error);
                    reject(new Response(JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                        details: error instanceof Error ? error.stack : undefined
                    }), {
                        status: 500,
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }));
                }
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
                unlink(workerFilePath).catch(console.error);
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