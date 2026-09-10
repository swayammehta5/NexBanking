const { prisma } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');
const { serialize } = require('../utils/serializers');

const getBeneficiaries = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { userId: req.user.id };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { nickname: { contains: search, mode: 'insensitive' } },
      ];
    }

    const beneficiaries = await prisma.beneficiary.findMany({
      where,
      orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
    });
    sendSuccess(res, 200, 'Beneficiaries retrieved', {
      beneficiaries: serialize(beneficiaries),
    });
  } catch {
    sendError(res, 500, 'Failed to retrieve beneficiaries');
  }
};

const addBeneficiary = async (req, res) => {
  try {
    const { name, accountNumber, nickname } = req.body;

    const existing = await prisma.beneficiary.findFirst({
      where: { userId: req.user.id, accountNumber },
    });
    if (existing) {
      return sendError(res, 400, 'Beneficiary with this account number already exists');
    }

    const beneficiary = await prisma.beneficiary.create({
      data: {
        userId: req.user.id,
        name,
        accountNumber,
        nickname: nickname || null,
      },
    });

    await createNotification(req.user.id, 'beneficiary_added', [name]);
    await logActivity(req.user.id, 'beneficiary_added', `Added beneficiary ${name}`, {}, req);
    sendSuccess(res, 201, 'Beneficiary added successfully', {
      beneficiary: serialize(beneficiary),
    });
  } catch (err) {
    if (err.code === 'P2002') return sendError(res, 400, 'Beneficiary already exists');
    sendError(res, 500, 'Failed to add beneficiary');
  }
};

const updateBeneficiary = async (req, res) => {
  try {
    const { name, nickname, isFavorite } = req.body;

    const existing = await prisma.beneficiary.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!existing) return sendError(res, 404, 'Beneficiary not found');

    const data = {};
    if (name !== undefined) data.name = name;
    if (nickname !== undefined) data.nickname = nickname;
    if (isFavorite !== undefined) data.isFavorite = isFavorite;

    const beneficiary = await prisma.beneficiary.update({
      where: { id: existing.id },
      data,
    });
    sendSuccess(res, 200, 'Beneficiary updated', { beneficiary: serialize(beneficiary) });
  } catch {
    sendError(res, 500, 'Failed to update beneficiary');
  }
};

const deleteBeneficiary = async (req, res) => {
  try {
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!beneficiary) return sendError(res, 404, 'Beneficiary not found');

    await prisma.beneficiary.delete({ where: { id: beneficiary.id } });
    await logActivity(
      req.user.id,
      'beneficiary_deleted',
      `Deleted beneficiary ${beneficiary.name}`,
      {},
      req
    );
    sendSuccess(res, 200, 'Beneficiary deleted');
  } catch {
    sendError(res, 500, 'Failed to delete beneficiary');
  }
};

const toggleFavorite = async (req, res) => {
  try {
    const beneficiary = await prisma.beneficiary.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!beneficiary) return sendError(res, 404, 'Beneficiary not found');

    const updated = await prisma.beneficiary.update({
      where: { id: beneficiary.id },
      data: { isFavorite: !beneficiary.isFavorite },
    });
    sendSuccess(
      res,
      200,
      `${updated.isFavorite ? 'Added to' : 'Removed from'} favorites`,
      { beneficiary: serialize(updated) }
    );
  } catch {
    sendError(res, 500, 'Failed to toggle favorite');
  }
};

module.exports = {
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  toggleFavorite,
};
