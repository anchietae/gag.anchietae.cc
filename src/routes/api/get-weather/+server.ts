import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

function extractJSONFromText(text: string, key: string): string | null {
	const keyPos = text.indexOf(`"${key}"`);
	if (keyPos === -1) return null;

	const colonPos = text.indexOf(":", keyPos);
	if (colonPos === -1) return null;

	const startPos = text.indexOf("{", colonPos);
	if (startPos === -1) return null;

	let bracketCount = 0;
	let endPos = startPos;

	for (let i = startPos; i < text.length; i++) {
		if (text[i] === "{") bracketCount++;
		else if (text[i] === "}") bracketCount--;

		if (bracketCount === 0) {
			endPos = i;
			break;
		}
	}

	if (bracketCount !== 0) return null;

	return text.slice(startPos, endPos + 1);
}

async function fetchWeatherData(): Promise<any> {
	const url = "https://growagarden.gg/weather?_rsc=2pcbz";
	
	const response = await fetch(url, {
		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			"next-router-state-tree": "%5B%22%22%2C%7B%22children%22%3A%5B%22stocks%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2Fstocks%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2C%22refetch%22%5D",
			priority: "u=1, i",
			referer: "https://growagarden.gg/weather",
			rsc: "1",
			"sec-fetch-dest": "empty",
			"sec-fetch-mode": "cors",
			"sec-fetch-site": "same-origin",
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
			"Content-Length": "0",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const text = await response.text();
	const jsonString = extractJSONFromText(text, "weatherDataSSR");

	if (!jsonString) {
		throw new Error("weatherDataSSR not found");
	}

	try {
		return JSON.parse(jsonString);
	} catch (e) {
		throw new Error("Failed to parse extracted JSON: " + (e instanceof Error ? e.message : 'Unknown error'));
	}
}

export const GET: RequestHandler = async () => {
	try {
		const data = await fetchWeatherData();
		return json(data);
	} catch (err) {
		console.error('Failed to fetch weather data:', err);
		throw error(500, { message: err instanceof Error ? err.message : 'Failed to fetch weather data' });
	}
};
