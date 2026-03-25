import express from 'express';
import { 
  createPayable, 
  getPayables, 
  getPayableById,
  updatePayable, 
  deletePayable,
  triggerAccumulation,
  getDuePriority
} from '../controllers/payableController.js';

const router = express.Router();

router.post('/simulate', triggerAccumulation);
router.post('/', createPayable);
router.get('/', getPayables);
router.get('/:id', getPayableById);
router.put('/:id', updatePayable);
router.delete('/:id', deletePayable);

export default router;
