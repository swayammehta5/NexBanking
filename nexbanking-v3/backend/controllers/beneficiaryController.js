const Beneficiary = require('../models/Beneficiary');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createNotification }     = require('../services/notificationService');
const { logActivity }            = require('../services/activityLogService');

/** GET /api/beneficiaries */
const getBeneficiaries = async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { userId: req.user._id };
    if (search) {
      const q = new RegExp(search, 'i');
      filter.$or = [{ name: q }, { accountNumber: q }, { nickname: q }, { bankName: q }];
    }
    const beneficiaries = await Beneficiary.find(filter).sort({ isFavorite: -1, createdAt: -1 });
    sendSuccess(res, 200, 'Beneficiaries retrieved', { beneficiaries });
  } catch { sendError(res, 500, 'Failed to retrieve beneficiaries'); }
};

/** POST /api/beneficiaries */
const addBeneficiary = async (req, res) => {
  try {
    const { name, accountNumber, bankName, ifscCode, nickname } = req.body;
    const existing = await Beneficiary.findOne({ userId: req.user._id, accountNumber });
    if (existing) return sendError(res, 400, 'Beneficiary with this account number already exists');

    const beneficiary = await Beneficiary.create({ userId: req.user._id, name, accountNumber, bankName, ifscCode, nickname });
    await createNotification(req.user._id, 'beneficiary_added', [name]);
    await logActivity(req.user._id, 'beneficiary_added', `Added beneficiary ${name}`, {}, req);
    sendSuccess(res, 201, 'Beneficiary added successfully', { beneficiary });
  } catch (err) {
    if (err.code === 11000) return sendError(res, 400, 'Beneficiary already exists');
    sendError(res, 500, 'Failed to add beneficiary');
  }
};

/** PUT /api/beneficiaries/:id */
const updateBeneficiary = async (req, res) => {
  try {
    const { name, bankName, ifscCode, nickname, isFavorite } = req.body;
    const beneficiary = await Beneficiary.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, bankName, ifscCode, nickname, isFavorite },
      { new: true, runValidators: true }
    );
    if (!beneficiary) return sendError(res, 404, 'Beneficiary not found');
    sendSuccess(res, 200, 'Beneficiary updated', { beneficiary });
  } catch { sendError(res, 500, 'Failed to update beneficiary'); }
};

/** DELETE /api/beneficiaries/:id */
const deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!beneficiary) return sendError(res, 404, 'Beneficiary not found');
    await logActivity(req.user._id, 'beneficiary_deleted', `Deleted beneficiary ${beneficiary.name}`, {}, req);
    sendSuccess(res, 200, 'Beneficiary deleted');
  } catch { sendError(res, 500, 'Failed to delete beneficiary'); }
};

/** PATCH /api/beneficiaries/:id/favorite */
const toggleFavorite = async (req, res) => {
  try {
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!beneficiary) return sendError(res, 404, 'Beneficiary not found');
    beneficiary.isFavorite = !beneficiary.isFavorite;
    await beneficiary.save();
    sendSuccess(res, 200, `${beneficiary.isFavorite ? 'Added to' : 'Removed from'} favorites`, { beneficiary });
  } catch { sendError(res, 500, 'Failed to toggle favorite'); }
};

module.exports = { getBeneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary, toggleFavorite };
