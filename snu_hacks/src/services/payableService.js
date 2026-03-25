import Payable from '../models/Payable.js';

export const updateRecurringPayables = async (simulatedMinutes = null) => {
  // Only process payables that are not already paid
  const payables = await Payable.find({ status: { $ne: 'paid' } });
  const now = new Date();

  for (const payable of payables) {
    let elapsedMinutes = 0;

    // Optional override for demo fast-forwarding
    if (simulatedMinutes !== null && simulatedMinutes !== undefined) {
      elapsedMinutes = Number(simulatedMinutes);
      // Fast-forward last_updated_time so real-time calculation won't double count
      payable.last_updated_time = new Date(payable.last_updated_time.getTime() + elapsedMinutes * 60000);
    } else {
      const elapsedMs = now - payable.last_updated_time;
      elapsedMinutes = Math.floor(elapsedMs / 60000);
      
      // BUG FIX: Do not overwrite with 'now' because it throws away partial minutes
      // (e.g. if you hit the API every 30 seconds, it resets the counter and never reaches 60s).
      // Instead, we only advance last_updated_time by the exact full minutes consumed.
      if (elapsedMinutes > 0) {
        payable.last_updated_time = new Date(payable.last_updated_time.getTime() + (elapsedMinutes * 60000));
      }
    }

    // 1. Decrease remaining_minutes based on elapsed time
    if (elapsedMinutes > 0) {
      payable.remaining_minutes -= elapsedMinutes;
    }

    // 2. Core Accumulation Logic
    // If it has a valid interval (> 0), process the recurring bucket
    if (payable.is_recurring === true && payable.recurrence_interval_minutes > 0) {
      
      // Using a while-loop guarantees exact accumulation even if massive time
      // blocks (like 3600 minutes) are simulated at once, triggering multiple cycles!
      let cycles = 0;
      while (payable.remaining_minutes <= 0) {
        payable.accumulated_amount += payable.amount;
        payable.remaining_minutes += payable.recurrence_interval_minutes;
        cycles++;
      }
      
      // If it accumulated and returned to > 0, status is pending
      if (cycles > 0 && payable.remaining_minutes > 0) {
        payable.status = 'pending';
      } else if (payable.remaining_minutes <= 0) {
        payable.status = 'overdue';
      }

    } else {
      // 3. No Interval (-1 bypass) / One-Time Payable
      // It does not accumulate amount! The remaining_minutes just goes into the 
      // negatives indicating exactly how overdue it is.
      if (payable.remaining_minutes <= 0) {
        payable.status = 'overdue';
      }
    }

    // 4. Update last_updated_time was handled during elapsed time calculation above
    await payable.save();
  }
};
