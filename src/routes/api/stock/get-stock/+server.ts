import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface StockItem {
	name: string;
	stock: string;
}

interface StockResponse {
	gear?: string[];
	seeds?: string[];
	egg?: string[];
	updatedAt?: number;
}

interface SpecialStockResponse {
	honey?: string[];
	cosmetics?: string[];
}

async function fetchStockData(path: string): Promise<StockResponse | SpecialStockResponse> {
	const url = `https://growagardenstock.com${path}`;
	
	const response = await fetch(url, {
		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			referer: "https://growagardenstock.com/api/stock",
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	return await response.json();
}

function extractCounts(items: string[]): StockItem[] {
	return items.map(item => {
		const match = item.match(/\*\*x(\d+)\*\*/);
		const stock = match ? match[1] : "0";
		const name = item.replace(/\s*\*\*x\d+\*\*$/, "").trim();
		return { name, stock };
	});
}

export const GET: RequestHandler = async () => {
	try {
		const [mainStock, specialStock] = await Promise.all([
			fetchStockData("/api/stock") as Promise<StockResponse>,
			fetchStockData("/api/special-stock") as Promise<SpecialStockResponse>
		]);

		const formattedData = {
			Data: {
				updatedAt: mainStock.updatedAt || Date.now(),
				gear: extractCounts(mainStock.gear || []),
				seeds: extractCounts(mainStock.seeds || []),
				egg: extractCounts(mainStock.egg || []),
				honey: extractCounts(specialStock.honey || []),
				cosmetics: extractCounts(specialStock.cosmetics || []),
			},
		};

		return json(formattedData);
	} catch (err) {
		console.error('Failed to fetch stock data:', err);
		throw error(500, { message: err instanceof Error ? err.message : 'Failed to fetch stock data' });
	}
};
