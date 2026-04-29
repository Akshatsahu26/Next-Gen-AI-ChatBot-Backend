const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaintByTicketId,
} = require('../controllers/complaintController');

const router = express.Router();

router.post('/', createComplaint);
router.get('/', getComplaints);
router.get('/:ticketId', getComplaintByTicketId);

module.exports = router;
