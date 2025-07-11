<script lang="ts">
	import { Card } from "m3-svelte";
	import { onMount, onDestroy } from "svelte";

	interface StockItem {
		name: string;
		stock: number;
	}

	type StockCategoryItems = StockItem[];

	interface StockDataPayload {
		seeds?: StockCategoryItems;
		gear?: StockCategoryItems;
		egg?: StockCategoryItems;
		honey?: StockCategoryItems;
		cosmetics?: StockCategoryItems;
		updatedAt?: string;
		[key: string]: StockCategoryItems | string | undefined;
	}

	interface FullStockData {
		Data: StockDataPayload;
	}

	interface RestockInfo {
		timestamp: number;
		countdown: string;
		LastRestock: string;
		timeSinceLastRestock: string;
	}

	interface CategorizedRestockData {
		egg?: RestockInfo;
		gear?: RestockInfo;
		seeds?: RestockInfo;
		cosmetic?: RestockInfo;
		SwarmEvent?: RestockInfo;
		[key: string]: RestockInfo | undefined;
	}

	interface ItemPrices {
		[itemName: string]: { price: number };
	}

	let loading = true;
	let stockData: FullStockData | null = null;
	let weatherData: any = null;
	let restockData: CategorizedRestockData | null = null;
	let itemPrices: ItemPrices | null = null;
	let error: string | null = null;

	let liveRestockCountdowns: { [key: string]: string } = {};
	let countdownInterval: ReturnType<typeof setInterval>;
	let isFetching = false;

	function formatNumber(num: number): string {
		if (num < 1000) {
			return num.toString();
		}
		const suffixes = ["", "K", "M", "B", "T"];
		const i = Math.floor(Math.log10(Math.abs(num)) / 3);
		const scaledNum = num / Math.pow(1000, i);
		let formattedNum = scaledNum.toFixed(
			scaledNum < 10 && i > 0 ? 2 : scaledNum < 100 && i > 0 ? 1 : 0,
		);
		if (formattedNum.endsWith(".00")) {
			formattedNum = formattedNum.slice(0, -3);
		} else if (formattedNum.endsWith(".0")) {
			formattedNum = formattedNum.slice(0, -2);
		}
		return formattedNum + suffixes[i];
	}

	function pad(n: number): string {
		return n < 10 ? "0" + n : n.toString();
	}

	function formatLiveCountdown(ms: number): string {
		if (ms <= 0) return "0s";

		const totalSeconds = Math.floor(ms / 1000);
		const seconds = totalSeconds % 60;
		const totalMinutes = Math.floor(totalSeconds / 60);
		const minutes = totalMinutes % 60;
		const hours = Math.floor(totalMinutes / 60);

		if (hours > 0) {
			return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
		} else if (minutes > 0) {
			return `${pad(minutes)}m ${pad(seconds)}s`;
		} else {
			return `${pad(seconds)}s`;
		}
	}

	function initializeAndStartTimers() {
		if (countdownInterval) clearInterval(countdownInterval);
		if (!restockData) return;

		const newLiveCountdowns: { [key: string]: string } = {};
		for (const key in restockData) {
			if (
				Object.prototype.hasOwnProperty.call(restockData, key) &&
				restockData[key]
			) {
				const targetTimestamp = restockData[key]!.timestamp;
				const remainingMs = Math.max(0, targetTimestamp - Date.now());
				newLiveCountdowns[key.toLowerCase()] =
					formatLiveCountdown(remainingMs);
			}
		}
		liveRestockCountdowns = newLiveCountdowns;

		countdownInterval = setInterval(() => {
			if (!restockData) return;
			const updatedCountdowns = { ...liveRestockCountdowns };
			let activeTimersExist = false;
			let shouldFetchNewData = false;

			for (const key in restockData) {
				if (
					Object.prototype.hasOwnProperty.call(restockData, key) &&
					restockData[key]
				) {
					const targetTimestamp = restockData[key]!.timestamp;
					const remainingMs = targetTimestamp - Date.now();
					const categoryKey = key.toLowerCase();

					if (remainingMs > 0) {
						updatedCountdowns[categoryKey] =
							formatLiveCountdown(remainingMs);
						activeTimersExist = true;
					} else {
						updatedCountdowns[categoryKey] = "Refreshing...";
						if (
							liveRestockCountdowns[categoryKey] &&
							liveRestockCountdowns[categoryKey] !== "0s"
						) {
							shouldFetchNewData = true;
						}
					}
				}
			}
			liveRestockCountdowns = updatedCountdowns;

			if (shouldFetchNewData && !isFetching) {
				if (countdownInterval) clearInterval(countdownInterval);
				fetchAllData();
			} else if (!activeTimersExist && !isFetching) {
			}
		}, 1000);
	}

	async function fetchAllData() {
		if (isFetching) return;
		isFetching = true;

		try {
			loading = true;
			error = null;

			const [
				stockResponse,
				weatherResponse,
				restockResponse,
				pricesResponse,
			] = await Promise.all([
				fetch("/api/stock/get-stock"),
				fetch("/api/get-weather"),
				fetch("/api/stock/restock-time"),
				fetch("/prices.json"),
			]);
			/*
			if (!stockResponse.ok) throw new Error(`Failed to fetch stock data: ${stockResponse.statusText}`);
			if (!weatherResponse.ok) throw new Error(`Failed to fetch weather data: ${weatherResponse.statusText}`);
			if (!restockResponse.ok) throw new Error(`Failed to fetch restock data: ${restockResponse.statusText}`);
			if (!pricesResponse.ok) throw new Error(`Failed to fetch prices: ${pricesResponse.statusText}`);
*/
			stockData = (await stockResponse.json()) as FullStockData;
			weatherData = await weatherResponse.json();
			restockData =
				(await restockResponse.json()) as CategorizedRestockData;
			itemPrices = (await pricesResponse.json()) as ItemPrices;

			initializeAndStartTimers();
		} catch (err) {
			console.error("Error fetching data:", err);
			error =
				err instanceof Error
					? err.message
					: "An unknown error occurred";
		} finally {
			loading = false;
			isFetching = false;
		}
	}

	onMount(async () => {
		await fetchAllData();
	});

	onDestroy(() => {
		if (countdownInterval) clearInterval(countdownInterval);
	});
</script>

{#if loading}
	<div class="fullscreen-loading">
		<div class="loading-content">
			<img src="/loading.png" alt="loading" style="max-height: 10rem;" />
			<p>Loading data...</p>
		</div>
	</div>
{/if}

<h1 style="text-align: center; margin: 2rem;">Stocks</h1>

{#if error}
	<div class="error-container">
		<h2>Error loading data</h2>
		<p>{error}</p>
		<button onclick={fetchAllData} class="retry-button">Retry</button>
	</div>
{:else if !loading && stockData?.Data}
	<div class="cards">
		{#each Object.entries(stockData.Data).filter(([key, value]) => key !== "updatedAt" && Array.isArray(value)) as [categoryName, items]}
			{@const categoryItems = items as StockItem[]}
			{@const restockCategoryKey =
				categoryName.toLowerCase() === "cosmetics"
					? "cosmetic"
					: categoryName.toLowerCase()}
			<Card variant="filled">
				<div class="card-content">
					<h2 style="text-align: center; margin-bottom: 1rem;">
						{categoryName.charAt(0).toUpperCase() +
							categoryName.slice(1)}
					</h2>
					{#if categoryItems && categoryItems.length > 0}
						<div class="items">
							{#each categoryItems as item}
								<Card variant="outlined">
									<div class="item-container">
										<div class="item-image-block">
											<img
												src="/items/{item.name
													.toLowerCase()
													.replace(/ /g, '_')
													.replace(/-/g, '_')}.webp"
												alt={item.name}
												class="item-image-style"
												loading="lazy"
												onerror={(e) => {
													if (e.target) {
														(
															e.target as HTMLImageElement
														).onerror = null;
														(
															e.target as HTMLImageElement
														).src = "/unknown.png";
													}
												}}
											/>
										</div>
										<div class="item-layout-container">
											<div class="item-text-block">
												<span class="item-name-display"
													>{item.name}</span
												>
												<span class="item-stock"
													>x{item.stock}</span
												>
											</div>
											<div class="item-text-block">
												{#if itemPrices && itemPrices[item.name
															.toLowerCase()
															.replace(/ /g, "_")
															.replace(/-/g, "_")]}
													{@const price =
														itemPrices[
															item.name
																.toLowerCase()
																.replace(
																	/ /g,
																	"_",
																)
																.replace(
																	/-/g,
																	"_",
																)
														].price}
													<p>
														Price: {formatNumber(
															price,
														)}
													</p>
													<p>
														Total: {formatNumber(
															price * item.stock,
														)}
													</p>
												{:else}
													<p>Price: N/A</p>
													<p>Total: N/A</p>
												{/if}
											</div>
										</div>
									</div>
								</Card>
							{/each}
						</div>
					{:else}
						<p>No {categoryName} data available</p>
					{/if}

					{#if restockData && restockData[restockCategoryKey]}
						{@const currentRestockInfo = restockData[
							restockCategoryKey
						] as RestockInfo}
						<div class="restock-details">
							<h4>Restock Timer</h4>
							<p>
								<strong>Next:</strong>
								{liveRestockCountdowns[restockCategoryKey] ||
									"..."}
							</p>
							<p>
								<strong>Last:</strong>
								{currentRestockInfo.LastRestock}
								<span
									>({currentRestockInfo.timeSinceLastRestock})</span
								>
							</p>
						</div>
					{/if}
				</div>
			</Card>
		{/each}
	</div>

	{#if stockData?.Data?.updatedAt}
		<div class="update-info">
			<p>
				Last updated: {new Date(
					stockData.Data.updatedAt,
				).toLocaleString()}
			</p>
		</div>
	{/if}
{/if}

<style>
	.cards {
		display: grid;
		gap: 3rem 1.5rem;
		padding: 0 1rem;
		margin-bottom: 1rem;
		grid-column: 1;
	}

	@media (width >= 52.5rem) {
		.cards {
			grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
			padding: 0 1.5rem;
			margin-bottom: 1.5rem;
		}
	}

	.fullscreen-loading {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(var(--m3-scheme-background));
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.item-stock {
		font-weight: bold;
		color: rgba(var(--m3-scheme-secondary));
		background-color: rgba(var(--m3-scheme-secondary-container));
		padding: 0.25rem 0.5rem;
		border-radius: 3px;
		font-size: 0.9rem;
		min-width: fit-content;
	}

	.update-info {
		text-align: center;
		margin-top: 2rem;
		padding: 1rem;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.update-info p {
		margin: 0;
	}

	.restock-details {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(var(--m3-scheme-outline-variant));
	}

	.restock-details h4 {
		margin-top: 0;
		margin-bottom: 0.5rem;
		font-size: 1rem;
		font-weight: 500;
		color: rgba(var(--m3-scheme-on-surface));
	}

	.restock-details p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: rgba(var(--m3-scheme-on-surface-variant));
	}

	.restock-details p strong {
		color: rgba(var(--m3-scheme-on-surface));
	}

	.restock-details p span {
		font-size: 0.8rem;
	}

	.item-container {
		display: flex;
		flex-direction: row;
	}

	.item-layout-container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 0.5rem;
		width: 100%;
	}

	.item-text-block {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		flex-grow: 1;
		margin-right: 0.75rem;
	}

	.item-text-block .item-name-display {
		font-weight: bold;
		margin-bottom: 0.25rem;
		font-size: 1em;
	}

	.item-text-block p {
		margin: 0.15rem 0;
		font-size: 0.85rem;
	}

	.item-text-block .item-stock {
		margin: 0.25rem 0;
	}

	.item-image-block {
		flex-shrink: 0;
	}

	.item-image-style {
		max-width: 3rem;
		height: auto;
		display: block;
	}
</style>
