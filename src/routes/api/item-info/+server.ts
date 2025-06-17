import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

interface Item {
	name: string;
	category: string;
	rarity: string;
	[key: string]: any;
}

interface ItemResponse {
	items: Item[];
}

let cachedData: ItemResponse | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchAndUpdateData(): Promise<ItemResponse> {
	const url = "https://growagarden.gg/api/v1/items/Gag/all?page=1&limit=1000000&sortBy=position";
	
	const response = await fetch(url, {
		headers: {
			accept: "*/*",
			"accept-language": "en-US,en;q=0.9",
			priority: "u=1, i",
			referer: "https://growagarden.gg/values",
			"Content-Length": "0",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const jsonResponse = await response.json() as ItemResponse & { pagination?: any };

	// Clean up the response
	delete jsonResponse.pagination;

	if (jsonResponse.items && Array.isArray(jsonResponse.items)) {
		jsonResponse.items.forEach(item => {
			delete item.id;
			delete item.trend;
		});
	}

	cachedData = jsonResponse;
	lastFetch = Date.now();
	console.log(`[Item-Info] Database updated successfully`);

	return jsonResponse;
}

function filterItems(items: Item[], filters: { category?: string; rarity?: string; name?: string }): Item[] {
	return items.filter(item => {
		const matchesCategory = filters.category ? item.category.toLowerCase() === filters.category.toLowerCase() : true;
		const matchesRarity = filters.rarity ? item.rarity.toLowerCase() === filters.rarity.toLowerCase() : true;
		const matchesName = filters.name ? item.name.toLowerCase().includes(filters.name.toLowerCase()) : true;
		return matchesCategory && matchesRarity && matchesName;
	});
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		// Check if we need to fetch new data
		if (!cachedData || Date.now() - lastFetch > CACHE_DURATION) {
			await fetchAndUpdateData();
		}

		if (!cachedData || !cachedData.items) {
			throw error(500, "Item data not available");
		}

		const filters = {
			category: url.searchParams.get('filter') || url.searchParams.get('category') || undefined,
			rarity: url.searchParams.get('rarity') || undefined,
			name: url.searchParams.get('name') || undefined
		};

		const filtered = filterItems(cachedData.items, filters);
		return json(filtered);
	} catch (err) {
		console.error('[Item-Info] Error:', err);
		throw error(500, { message: err instanceof Error ? err.message : 'Failed to fetch item data' });
	}
};
