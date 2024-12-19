import type { APIRoute } from 'astro';
import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { utapi } from "src/server/uploadthing.ts";
import { v4 as uuidv4 } from 'uuid';
import { Worker } from 'worker_threads';
import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { UploadThingToken } from 'uploadthing/types';
import { Schema } from 'effect';

// import * as weave from 'weave'  

dotenv.config();

export const POST: APIRoute = async ({ request }) => {
    console.log("process.env.UPLOADTHING_TOKEN", process.env.UPLOADTHING_TOKEN);
    const token = Schema.decodeUnknownSync(UploadThingToken)(
        process.env.UPLOADTHING_TOKEN,
    );
    console.log("token", token);

    const imagesDir = path.join('/tmp', 'images');
    const client = new Cerebras({ apiKey: process.env['CERBERAS_API_KEY'] });

    // console.log("Cleaning up previous images...");
    try {
        await new Promise((resolve, _) => {
            exec(
                `rm -rf ${imagesDir}`,
                (error: any, _: string, stderr: string) => {
                    if (error) {
                        console.warn('Warning: Could not clean up images directory:', stderr);
                    }
                    // console.log('Images cleanup completed');
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

    // Process up to 10 files
    for (let i = 0; i < 10; i++) {
        const imageFile = formData.get(`file${i}`) as File;
        if (!imageFile) {
            if (i === 0) {
                throw new Error('No image file provided');
            }
            break;
        }
        const extension = imageFile.name.split('.').pop() || 'png';
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        await writeFile(path.join(imagesDir, `file${i}.${extension}`), buffer);
        imageFiles.push(imageFile);
        fileNames.push(`file${i}.${extension}`);
    }

    // console.log("imageFiles", imageFiles);
    const systemPrompt = `
    Given the input return a node js script that can do the photo editing work described by the user  
    | use ES module imports (import syntax) instead of require 
    | for image resizing use the sharp library, like so: import sharp from 'sharp'; 
    | when you use sharp or other async libs remember to await them. for example // Process the image
    await sharp(imagePath1)
      .toFormat('png')
      .toFile(path.join(outputDir, outputFileName)); 
    | the files are located at " + imagesDir + " 
    | Don't include any characters like '\\n' 
    | I need the code to just be the syntax, not formatted as text 
    | do NOT include any leading text or trailing text such as: Here's a Node.js script that creates three copies of the specified file: 
    | Do not wrap your responses in backticks 
    | there are up to 10 images to work with, if theres one the file will be called file0.[some extension], 
    if there are two the files will be called file0.[some extension] and file1.[some extension] and so on, 
    if there are three the files will be called file0.[some extension], file1.[some extension], and file2.[some extension] 
    | after all the scripts are done running send the files back to the server using import { parentPort, workerData } from 'worker_threads'; 
    parentPort.postMessage([possibleFileName1, possibleFileName2, possibleFileName3]); }; 
    This array will be the names of the files that were created 
    | when responding with file names, only include the file name, not the path. for example return 'resized_100x100.png' 
    and not '/tmp/images/resized_100x100.png'  
    | if this is a file conversion be sure to include the file extension in the file names, and come up with a new name for the file 
    | do not import path twice 
    | save your edited images to the /tmp/images directory using const outputDir = '/tmp/images'; 
    | do not provide multiple versions of the script 
    | do not include any additonal words, phrases, text, characters, or anything else besides the script 
    | Do not import import { console } from 'console'; or add anything extra 
    
    IMPORTANT:  
    1. Only process the files that are explicitly named in the fileNames array 
    2. Do not search for additional files or use loops to find files
    3. Use direct file processing - no need to check if files exist 
    4. Keep the code simple and linear 
    5. Each file will be available at /tmp/images/file0.[extension], file1.[extension], etc. 
    6. Do not use fs.access or file searching logic 
    7. Process only the files mentioned in the prompt 
    8. Return an array of the output filenames using parentPort.postMessage([filename1, filename2, ...])     
    import sharp from 'sharp';    
    import path from 'path';    
    Example structure:import { parentPort } from 'worker_threads'; 
    const outputDir = '/tmp/images'; // Process specific files directly // Send results back 
    | here is an example prompt and example output script you would return: convert to png 
    import sharp from 'sharp';
    import path from 'path';
    import { parentPort, workerData } from 'worker_threads';

    async function processImages() {
      const { imagePath1 } = workerData;
      const outputDir = '/tmp/images';
      const outputFilenames = [];

      try {
        // Get the input filename
        const fileName = path.basename(imagePath1);
        const outputFileName = 'png_' + path.parse(fileName).name + '.png';
        outputFilenames.push(outputFileName);

        // Process the image
        await sharp(imagePath1)
          .toFormat('png')
          .toFile(path.join(outputDir, outputFileName));

        // Send the processed filenames back to the main thread
        parentPort.postMessage(outputFilenames);
      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    }

    processImages().catch(error => {
      console.error('Worker error:', error);
      process.exit(1);
    });   
    `

    try {
        const prompt = formData.get('prompt') as string;
        // console.log('Prompt:', prompt);

        const cerebrasPrompt = `system: ${systemPrompt} \n\n\n user: ${prompt} \n your input files are located at /tmp/images the file names are ${fileNames.join(', ')}
        access them by declaring them like this: const imagePath1 = path.join('/tmp/images', 'file0.png');
        `;

        const chatCompletion: any = await client.chat.completions.create({
            messages: [{ role: 'user', content: cerebrasPrompt }],
            model: 'llama3.1-70b',
        });

        // console.log("cerebras response", chatCompletion?.choices[0]?.message);
        // console.log("cerebras response", chatCompletion?.choices[0].text);
        const msg = chatCompletion?.choices[0].message.content;
        console.log("cerebras response", chatCompletion.choices);
        // console.log("cerebras response", msg);

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


        // console.log("Installing worker dependencies...");
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
                (error: any, _: string, stderr: string) => {
                    if (error) {
                        console.error('Error installing dependencies:', error);
                        console.error('stderr:', stderr);
                        reject(error);
                        return;
                    }
                    // console.log('stdout:', stdout);
                    resolve(null);
                }
            );
        });

        // console.log("listing directory contents");
        await new Promise((resolve, reject) => {
            exec('ls -a', (error: any, __: string, _: string) => {
                if (error) {
                    console.error('Error listing directory:', error);
                    reject(error);
                }
                // console.log('Directory contents:', stdout);
                resolve(null)
            });
        });

        const content = msg;

        let imagePaths: Record<string, string> = {};
        for (let i = 0; i < imageFiles.length; i++) {
            imagePaths[`imagePath${i + 1}`] = path.join(imagesDir, `file${i}.${imageFiles[i].name.split('.').pop() || 'png'}`);
        }

        await mkdir(workersDir, { recursive: true });

        // Write the worker file
        if (typeof content === 'string') {
            const workerContentTemp = `
                ${content}
            `;
            const workerContent = workerContentTemp;
            await writeFile(workerFilePath, workerContent);
            console.log(content);
        } else {
            throw new Error('Unexpected content type in response');
        }

        return new Promise((resolve, reject) => {
            const worker = new Worker(workerFilePath, { workerData: imagePaths });

            worker.on('message', async (message) => {
                // console.log('Message from worker:', message);

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
                // console.log(`Worker exited with code ${code}`);
                // Clean up the workerfile
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