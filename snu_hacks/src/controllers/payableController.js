import Payable from '../models/Payable.js';
import { updateRecurringPayables } from '../services/payableService.js';
import { calculatePriority, generateReasons } from '../utils/scoring.js';

export const triggerAccumulation = async (req, res) => {
  try {
    const { minutesPassed } = req.body;
    await updateRecurringPayables(minutesPassed);
    res.status(200).json({ message: 'Accumulation step evaluated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPayable = async (req, res) => {
  try {
    // Clone body to mutate locally
    const data = { ...req.body };
    
    // Validation
    if (data.amount === undefined || data.amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }
    if (data.remaining_minutes === undefined) {
      return res.status(400).json({ error: 'remaining_minutes is required' });
    }
    if (!data.flexibility) {
      return res.status(400).json({ error: 'flexibility is required' });
    }

    // IMPORTANT: Do NOT allow accumulated_amount to be manually set via API
    delete data.accumulated_amount;

    const newPayable = new Payable(data);
    
    // Explicit recurring accumulation initialization
    if (newPayable.is_recurring) {
      newPayable.accumulated_amount = newPayable.amount;
    }

    const savedPayable = await newPayable.save();
    res.status(201).json(savedPayable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDuePriority = async (req, res) => {
  try {
    const { business_id } = req.query;

    // 1. Call updateRecurringPayables()
    await updateRecurringPayables();

    // 2. Fetch all pending + overdue with filtering
    const query = { status: { $in: ['pending', 'overdue'] } };
    if (business_id) {
      query.business_id = business_id;
    }
    
    const payables = await Payable.find(query);

    // 3. Compute raw features & classify risk
    const unnormalizedResults = payables.map(payable => {
      const raw_priority = calculatePriority(payable);
      const reason = generateReasons(payable);
      
      let risk_level = 'LOW';
      if (raw_priority >= 8) {
        risk_level = 'HIGH';
      } else if (raw_priority >= 5) {
        risk_level = 'MEDIUM';
      }

      return {
        id: payable._id,
        type: payable.type,
        name: payable.name,
        reference: payable.reference || '',
        base_amount: payable.amount,
        accumulated_amount: payable.accumulated_amount,
        remaining_minutes: payable.remaining_minutes,
        flexibility: payable.flexibility,
        status: payable.status,
        raw_priority,
        risk_level,
        reason
      };
    });

    // 4. Calculate Softmax algorithm over the query dataset
    const sumExp = unnormalizedResults.reduce((sum, item) => sum + Math.exp(item.raw_priority), 0);

    const results = unnormalizedResults.map(item => {
      // Avoid division by zero
      const softmax_score = sumExp > 0 ? (Math.exp(item.raw_priority) / sumExp) : 0;
      
      return {
        id: item.id,
        type: item.type,
        name: item.name,
        reference: item.reference,
        base_amount: item.base_amount,
        accumulated_amount: item.accumulated_amount,
        remaining_minutes: item.remaining_minutes,
        flexibility: item.flexibility,
        status: item.status,
        priority_score: parseFloat(softmax_score.toFixed(6)), // Softmaxed Output Overwrite
        risk_level: item.risk_level, // Unchanged from raw logic classification
        reason: item.reason
      };
    });

    // 5. Sort by normalized priority DESC
    results.sort((a, b) => b.priority_score - a.priority_score);

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayables = async (req, res) => {
  try {
    const payables = await Payable.find({});
    res.status(200).json(payables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPayableById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Proactively calculate elapsed time down to the minute on fetch request
    await updateRecurringPayables();

    const payable = await Payable.findById(id);
    if (!payable) {
      return res.status(404).json({ error: 'Payable not found' });
    }
    
    res.status(200).json(payable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePayable = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    // IMPORTANT: Do NOT allow accumulated_amount to be manually set via API
    delete data.accumulated_amount;

    // Validation if amount is being updated
    if (data.amount !== undefined && data.amount <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }

    const updatedPayable = await Payable.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updatedPayable) {
      return res.status(404).json({ error: 'Payable not found' });
    }
    res.status(200).json(updatedPayable);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePayable = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPayable = await Payable.findByIdAndDelete(id);
    if (!deletedPayable) {
      return res.status(404).json({ error: 'Payable not found' });
    }
    res.status(200).json({ message: 'Payable deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
