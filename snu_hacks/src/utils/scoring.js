export const calculatePriority = (payable) => {
  // 1. Urgency
  let urgency = 3;
  if (payable.remaining_minutes <= 60) {
    urgency = 10;
  } else if (payable.remaining_minutes <= 180) {
    urgency = 8;
  } else if (payable.remaining_minutes <= 720) {
    urgency = 6;
  }

  // 2. Penalty
  let penalty = 0;
  if (payable.penalty && payable.penalty.type !== 'none' && payable.penalty.value > 0) {
    penalty = 10;
  }

  // 3. Operational impact
  let operational = 5; // Default for support
  if (payable.operational_category === 'core') {
    operational = 10;
  }

  // 4. Dependency
  // is_critical_supplier boolean
  let dependency = payable.is_critical_supplier ? 10 : 0;

  // 5. Overdue
  let overdue = payable.status === 'overdue' ? 10 : 0;

  // 6. Accumulation
  // Formula: accumulated_amount / amount, clamped between 1 and 10
  const ratio = payable.amount > 0 ? (payable.accumulated_amount / payable.amount) : 1;
  let accumulation = Math.max(1, Math.min(ratio, 10));

  // 7. Flexibility
  // Since flexibility is Subtracted in the final formula, 
  // high flexibility = higher value (subtracts more -> lower priority)
  let flexibility = 0; // low flexibility -> subtracts 0
  if (payable.flexibility === 'high') {
    flexibility = 10;
  } else if (payable.flexibility === 'medium') {
    flexibility = 5;
  }

  // FINAL FORMULA
  let priority = 
    (urgency * 0.20) +
    (penalty * 0.20) +
    (operational * 0.20) +
    (dependency * 0.15) +
    (overdue * 0.10) +
    (accumulation * 0.10) -
    (flexibility * 0.15);

  // Clamp between 0-10
  priority = Math.max(0, Math.min(priority, 10));

  return parseFloat(priority.toFixed(2));
};

export const generateReasons = (payable) => {
  const reasons = [];

  if (payable.status === 'overdue') {
    // Exact mapping for overdue
    reasons.push('Overdue');
  } else if (payable.remaining_minutes <= 180) {
    // Remaining minutes considered low 
    reasons.push('Due soon');
  }

  if (payable.accumulated_amount > (payable.amount || 0)) {
    // Accumulation cycles counting
    const cycles = Math.floor(payable.accumulated_amount / (payable.amount || 1));
    reasons.push(`accumulated over ${cycles} cycles`);
  }

  if (payable.is_critical_supplier) {
    reasons.push('critical supplier');
  }

  if (payable.penalty && payable.penalty.type !== 'none' && payable.penalty.value > 0) {
    reasons.push('high penalty risk');
  }

  return reasons.join('; ');
};
