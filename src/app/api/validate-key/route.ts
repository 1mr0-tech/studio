import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ valid: false, error: 'API key is missing from request body.' }, { status: 400 });
    }

    // A lightweight way to validate the key is to try to list the models via the official REST API.
    // If the key is invalid, the fetch call will result in a non-ok response.
    const validationUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const googleResponse = await fetch(validationUrl);
    
    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      const errorMessage = data.error?.message || 'The provided API key is invalid or does not have the required permissions.';
      // Return a 401 Unauthorized status from our own API if the underlying check fails.
      // This allows the client's `response.ok` check to work correctly.
      return NextResponse.json({ valid: false, error: errorMessage }, { status: 401 });
    }
    
    // If the request to Google's API was successful, the key is valid.
    return NextResponse.json({ valid: true }, { status: 200 });

  } catch (error) {
    console.error('[Validate API Key Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
    return NextResponse.json({ valid: false, error: errorMessage }, { status: 500 });
  }
}
