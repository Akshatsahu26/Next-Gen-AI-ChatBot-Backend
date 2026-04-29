const Complaint = require('../models/Complaint');

const generateTicketId = () => `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const createComplaint = async (req, res, next) => {
  try {
    const { userId, title, description } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'userId, title, and description are required',
      });
    }

    const complaint = await Complaint.create({
      userId,
      title,
      description,
      ticketId: generateTicketId(),
      status: 'pending',
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    next(error);
  }
};

const getComplaints = async (_req, res, next) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    next(error);
  }
};

const getComplaintByTicketId = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    const complaint = await Complaint.findOne({ ticketId });

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ticketId: complaint.ticketId,
        status: complaint.status,
        title: complaint.title,
        description: complaint.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintByTicketId,
};
