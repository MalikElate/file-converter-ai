import type { APIRoute } from 'astro';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { Worker } from 'worker_threads';
import { Anthropic } from "@anthropic-ai/sdk";
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
    const imagesDir = path.join(process.cwd(), 'images');
    
    // Ensure the images directory exists
    await fs.mkdir(imagesDir, { recursive: true });
    const formData = await request.formData();
   
    const imageFile = formData.get('file0') as File;
    if (!imageFile) {
        throw new Error('No image file provided');
    }
    const imageBuffer = await imageFile.arrayBuffer();
    await fs.writeFile(path.join(imagesDir, imageFile.name), Buffer.from(imageBuffer));
    
    console.log('Image file:', imageFile.name);

    const systemPrompt = "Given the input return a node js script | use import and not require syntax in the script | for image resizing use the sharp library | that can do the photo editing work described by the user | the files are located at " + imagesDir + " | Don't include any characters like '\\n' | I need the code to just be the syntax, not formatted as text | do not include any leading text or trailing text such as: Here's a Node.js script that creates three copies of the specified file:";

    try {
        // const formData = await request.formData();
        const prompt = formData.get('prompt') as string;
        const imageFile = formData.get('file0') as File;
        console.log('Prompt:', prompt);
        console.log('Image file:', imageFile);
        

        if (!imageFile) {
            console.log('No image file provided');
            return new Response(JSON.stringify({ error: 'No image file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Save the uploaded image
        const imageBuffer = await imageFile.arrayBuffer();
        const imageFileName = `image_${uuidv4()}.png`;
        const imagePath = path.join(imagesDir, imageFileName);
        await fs.writeFile(imagePath, Buffer.from(imageBuffer));

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
        const workersDir = path.join(process.cwd(), 'src', 'workers');
        const workerFilePath = path.join(workersDir, workerFileName);

        // Ensure the workers directory exists
        await fs.mkdir(workersDir, { recursive: true });

        // Write the worker file
        const content = msg.content[0];
        if ('text' in content) {
            // Update the worker file content to include the image path
            const workerContent = `
                const imagePath = '${imagePath}';
                ${content.text}
            `;
            await fs.writeFile(workerFilePath, workerContent);
            console.log(content);
        } else {
            throw new Error('Unexpected content type in response');
        }

        // Start the worker in a new thread
        const worker = new Worker(workerFilePath, { workerData: { imagePath } });

        worker.on('message', (message) => {
            console.log('Message from worker:', message);
        });

        worker.on('error', (error) => {
            console.error('Worker error:', error);
        });

        worker.on('exit', (code) => {
            console.log(`Worker exited with code ${code}`);
            // Clean up the worker file
            fs.unlink(workerFilePath).catch(console.error);
        });

        return new Response(JSON.stringify({ message: 'Worker started successfully' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
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
