import * as Hash from "effect/Hash";
import SQIds, { defaultOptions } from "sqids";
import * as crypto from "crypto";
import * as dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.UPLOADTHING_API_KEY ?? "";

// A simple function to shuffle the alphabet for the Sqids
function shuffle(str: string, seed: string) {
    const chars = str.split("");
    const seedNum = Hash.string(seed);

    let temp: string;
    let j: number;
    for (let i = 0; i < chars.length; i++) {
        j = ((seedNum % (i + 1)) + i) % chars.length;
        temp = chars[i];
        chars[i] = chars[j];
        chars[j] = temp;
    }

    return chars.join("");
}

function generateKey(appId: string, fileSeed: string) {
    // Hash and Encode the parts and apiKey as sqids
    const alphabet = shuffle(defaultOptions.alphabet, appId);

    const encodedAppId = new SQIds({ alphabet, minLength: 12 }).encode([
        Math.abs(Hash.string(appId)),
    ]);

    // Using Buffer for base64 encoding
    const encodedFileSeed = Buffer.from(fileSeed).toString('base64');

    return `${encodedAppId}${encodedFileSeed}`;
}

let fileKey: string = generateKey("MY_APP_ID", "my-file.png");

const searchParams = new URLSearchParams({
    // Required
    expires: String(Math.floor(Date.now() / 1000) + 3600), // Convert number to string
    "x-ut-identifier": "MY_APP_ID",
    "x-ut-file-name": "my-file.png",
    "x-ut-file-size": String(131072), // Convert number to string
    // Optional
    "x-ut-file-type": "image/png",
    "x-ut-custom-id": "MY_CUSTOM_ID",
    "x-ut-content-disposition": "inline",
    "x-ut-acl": "public-read",
} as const);

const url = new URL(
    `https://cle1.ingest.uploadthing.com/${fileKey}`,
);

url.search = searchParams.toString();

const signature = hmacSha256(url, apiKey);
url.searchParams.append("signature", signature);

function hmacSha256(url: URL, key: string): string {
    return crypto
        .createHmac("sha256", key)
        .update(url.toString())
        .digest("hex");
}
