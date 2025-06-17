import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { calculateFruit } from '$lib/calc/calculate';

export const GET: RequestHandler = async ({ url }) => {
	const name = url.searchParams.get('Name');
	const weight = url.searchParams.get('Weight');
	const variant = url.searchParams.get('Variant');
	const mutation = url.searchParams.get('Mutation');

	if (!name || !weight) {
		throw error(400, 'Missing required parameters: Name, Weight');
	}

	try {
		const weightValue = parseFloat(weight);
		if (isNaN(weightValue)) {
			throw error(400, 'Weight must be a valid number');
		}

		const tool = {
			Name: name,
			Weight: { value: weightValue },
			Variant: { value: variant || 'Normal' },
			attributes: mutation ? mutation.split(',').map((m: string) => m.trim()) : []
		};

		const result = calculateFruit(tool);
		return json({ value: result });
	} catch (err) {
		console.error('Error calculating fruit value:', err);
		throw error(500, 'Internal server error');
	}
};
