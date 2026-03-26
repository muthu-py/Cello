/*
  Executive brief via Google Gemini — API key stays on the server.
  Set GEMINI_API_KEY (and optional GEMINI_MODEL, default gemini-2.0-flash).
*/
const { GoogleGenerativeAI } = require('@google/generative-ai');

function buildPrompt(payload) {
    const { riskCounts, totalRestockCost, topInventory, topPayables, combinedHeadline } = payload;

    return `You are a clinical pharmacy and hospital finance advisor. Using ONLY the JSON facts below (do not invent numbers), write a concise executive brief for the leadership team.

Output structure:
1) **Situation** — 2–3 short sentences on inventory risk vs treasury pressure.
2) **Priorities** — numbered list of the top 3–5 actions (which SKUs to restock first, which payables need cash attention), referencing names/IDs from the data.
3) **Risks** — bullet list of concrete risks (stock-out, overdue payables, supplier reliability) if visible in the data.
4) **Finance–inventory trade-off** — one short paragraph on how to sequence decisions this week.

Tone: professional, Indian hospital context (₹). No markdown tables unless essential. Total length under 350 words.

FACTS (JSON):
${JSON.stringify({
        risk_band_counts: riskCounts,
        estimated_restock_cost_inr: totalRestockCost,
        top_restock_skus: topInventory,
        top_payables: topPayables,
        queue_headline: combinedHeadline
    }, null, 2)}`;
}

function prepareExecutiveBriefPayload({ plan, payables, combinedCount }) {
    const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    let totalRestockCost = 0;
    for (const row of plan) {
        if (riskCounts[row.risk_level] !== undefined) {
            riskCounts[row.risk_level]++;
        }
        totalRestockCost += row.total_cost || 0;
    }

    const topInventory = plan.slice(0, 8).map((p) => ({
        rank: p.rank,
        id: p.medicine_id,
        name: p.medicine_name,
        risk: p.risk_level,
        score: p.priority_score,
        stockout_label: p.days_to_stockout,
        ideal_qty: p.ideal_quantity,
        est_cost_inr: p.total_cost,
        supplier: p.supplier_name,
        reason: p.reason,
    }));

    const topPayables = (payables || []).slice(0, 8).map((x) => ({
        name: x.name,
        type: x.type,
        ref: x.reference,
        amount_inr: x.accumulated_amount ?? x.base_amount,
        flexibility: x.flexibility,
        risk: x.risk_level,
        reason: x.reason,
    }));

    const combinedHeadline =
        combinedCount != null
            ? `Unified priority queue length: ${combinedCount} (inventory + payables).`
            : null;

    return {
        riskCounts,
        totalRestockCost: Math.round(totalRestockCost * 100) / 100,
        topInventory,
        topPayables,
        combinedHeadline,
    };
}

function isQuotaOrRateLimitError(err) {
    const status = err?.status || err?.response?.status;
    const msg = String(err?.message || '');
    if (status === 429) return true;
    return (
        msg.includes('429') ||
        msg.toLowerCase().includes('too many requests') ||
        msg.toLowerCase().includes('quota exceeded')
    );
}

function safeInr(value) {
    return `INR ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function generateFallbackExecutiveBrief(payload) {
    const { riskCounts, totalRestockCost, topInventory, topPayables, combinedHeadline } = payload;
    const invTop = (topInventory || []).slice(0, 4);
    const payTop = (topPayables || []).slice(0, 4);

    const priorities = [];
    invTop.forEach((row) => {
        priorities.push(
            `Restock ${row.name || row.id} (${row.id}) in ${row.risk} risk band with target qty ${row.ideal_qty ?? '-'} and estimated spend ${safeInr(row.est_cost_inr)}.`
        );
    });
    payTop.forEach((row) => {
        priorities.push(
            `Prioritize payable ${row.name || row.ref || 'unknown'} (${row.type || 'payable'}) at ${row.risk || 'unspecified'} risk for ${safeInr(row.amount_inr)}.`
        );
    });

    const risks = [];
    if ((riskCounts.CRITICAL || 0) > 0) {
        risks.push(`Immediate stock-out risk on ${riskCounts.CRITICAL} critical SKU(s) if replenishment is delayed.`);
    }
    if ((riskCounts.HIGH || 0) > 0) {
        risks.push(`High-risk inventory pressure across ${riskCounts.HIGH} SKU(s) this week.`);
    }
    if (payTop.some((p) => String(p.risk || '').toUpperCase() === 'HIGH')) {
        risks.push('High-risk payables may trigger supplier stress or service disruption if not sequenced with cash releases.');
    }
    if (!risks.length) {
        risks.push('No extreme signals detected, but near-term stock and payable cadence should still be monitored daily.');
    }

    const lines = [
        'Situation:',
        `Inventory pressure is led by CRITICAL=${riskCounts.CRITICAL}, HIGH=${riskCounts.HIGH}, MEDIUM=${riskCounts.MEDIUM}, LOW=${riskCounts.LOW}. Current estimated restock exposure is ${safeInr(totalRestockCost)}.`,
        combinedHeadline ? `${combinedHeadline}` : 'Unified inventory-finance queue is available for coordinated action this week.',
        '',
        'Priorities:',
        ...priorities.map((p, i) => `${i + 1}. ${p}`),
        '',
        'Risks:',
        ...risks.map((r) => `- ${r}`),
        '',
        'Finance-inventory trade-off:',
        'Sequence cash toward CRITICAL and HIGH clinical SKUs first to protect patient care, while scheduling high-risk payables in parallel windows to preserve supplier confidence and avoid compounding operational risk.',
        '',
        'Note: AI provider quota was exceeded, so this report is generated from deterministic business rules using live data.',
    ];

    return lines.join('\n');
}

/**
 * @param {object} params
 * @param {Array<object>} params.plan — decision engine rows
 * @param {Array<object>} params.payables — from finance service
 * @param {number} [params.combinedCount]
 */
async function generateExecutiveBrief({ plan, payables, combinedCount }) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey || !String(apiKey).trim()) {
        const err = new Error('GEMINI_API_KEY is not configured on the server');
        err.code = 'MISSING_API_KEY';
        throw err;
    }

    const modelId = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelId,
        generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 2048,
        },
    });
    const payload = prepareExecutiveBriefPayload({ plan, payables, combinedCount });
    const prompt = buildPrompt(payload);

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (!text || !text.trim()) {
            throw new Error('Empty response from Gemini');
        }
        return {
            summary: text.trim(),
            payload,
            source: 'gemini',
        };
    } catch (err) {
        if (isQuotaOrRateLimitError(err)) {
            return {
                summary: generateFallbackExecutiveBrief(payload),
                payload,
                source: 'fallback',
                warning: 'Gemini quota exceeded; generated deterministic report from live data.',
            };
        }
        throw err;
    }
}

module.exports = { generateExecutiveBrief, prepareExecutiveBriefPayload };
