import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import LedgerAccount from '../models/LedgerAccount.js';
import Account from '../models/Account.js';
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      
      // ── Seed system LedgerAccounts on login (idempotent) ──────────────────
      try {
        const systemAccounts = [
          { name: 'Accounts Receivable',      type: 'Asset'   },
          { name: 'Sales Revenue',            type: 'Revenue' },
          { name: 'Purchase / Cost of Goods', type: 'Expense' },
          { name: 'General Expense',          type: 'Expense' },
        ];
        for (const acc of systemAccounts) {
          await LedgerAccount.findOneAndUpdate(
            { userId: user._id, name: acc.name },
            { $setOnInsert: { userId: user._id, ...acc, isSystem: true, isActive: true } },
            { upsert: true }
          );
        }
        const existingBanks = await Account.find({ userId: user._id });
        for (const bank of existingBanks) {
          await LedgerAccount.findOneAndUpdate(
            { userId: user._id, name: bank.bankName },
            { $setOnInsert: { userId: user._id, name: bank.bankName, type: 'Asset', isSystem: false, isActive: true } },
            { upsert: true }
          );
        }
      } catch (seedErr) {
        console.warn('System account seeding failed:', seedErr.message);
      }
      // ────────────────────────────────────────────────────────────────────────

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });

    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
   res.json({
  _id: user._id,
  name: user.name,
  email: user.email,
  businessName: user.businessName,
  currency: user.currency,
  taxRate: user.taxRate,
  phone: user.phone || '',
  businessAddress: user.businessAddress || '',
  state: user.state || '',
  gstNumber: user.gstNumber || '',
  logo: user.logo || '',
  profilePhoto: user.profilePhoto || '',
  googleId: user.googleId || null,
  authMethod: user.authMethod || null,
  bankName:    user.bankName    || '',
  bankAccount: user.bankAccount || '',
  bankIfsc:    user.bankIfsc    || '',
  bankBranch:  user.bankBranch  || '',
  upiId:       user.upiId       || '',
});
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

export const updateUserSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.businessName = req.body.businessName || user.businessName;
      user.currency = req.body.currency || user.currency;
      user.taxRate = req.body.taxRate || user.taxRate;
      user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
      user.businessAddress = req.body.businessAddress !== undefined ? req.body.businessAddress : user.businessAddress;
      user.state = req.body.state !== undefined ? req.body.state : user.state;
      user.gstNumber = req.body.gstNumber !== undefined ? req.body.gstNumber : user.gstNumber;
      user.logo = req.body.logo !== undefined ? req.body.logo : user.logo;
      user.profilePhoto = req.body.profilePhoto !== undefined ? req.body.profilePhoto : user.profilePhoto;
      user.bankName    = req.body.bankName    !== undefined ? req.body.bankName    : user.bankName;
      user.bankAccount = req.body.bankAccount !== undefined ? req.body.bankAccount : user.bankAccount;
      user.bankIfsc    = req.body.bankIfsc    !== undefined ? req.body.bankIfsc    : user.bankIfsc;
      user.bankBranch  = req.body.bankBranch  !== undefined ? req.body.bankBranch  : user.bankBranch;
      user.upiId       = req.body.upiId       !== undefined ? req.body.upiId       : user.upiId;
      const updatedUser = await user.save();

      res.json({
      _id: updatedUser._id,
      businessName: updatedUser.businessName,
      currency: updatedUser.currency,
      taxRate: updatedUser.taxRate,
      phone: updatedUser.phone,
      businessAddress: updatedUser.businessAddress,
      gstNumber: updatedUser.gstNumber
    });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const googleLogin = async (req, res) => {
  const { name, email, googleId } = req.body;
  try {
    // Check if user exists by email or googleId
    let user = await User.findOne({ email });

    if (user) {
      user.googleId = googleId; // Update id if they previously used email/pass
      await user.save();
    } else {
      // Create new user if they don't exist
      user = await User.create({ name, email, googleId });
    }

    // Generate your usual JWT token here
    const token = generateToken(user._id); 
    res.json({ _id: user._id, name: user.name, email: user.email, token });
  } catch (error) {
    res.status(500).json({ message: "Google auth failed" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (user.googleId || user.authMethod === 'google') {
      return res.status(400).json({ 
        message: "Accounts using Google Auth cannot change passwords here." 
      });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }
    // Assign plain text — the User model's pre('save') hook will hash it automatically.
    // Do NOT manually bcrypt here, or the password will be double-hashed in MongoDB.
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error during password update" });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const streamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'profile_photos', transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }] },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        streamifier.createReadStream(buffer).pipe(stream);
      });

    const result = await streamUpload(req.file.buffer);

    // Save URL to user
    const user = await User.findById(req.user._id);
    user.profilePhoto = result.secure_url;
    await user.save();

    res.json({ profilePhoto: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
};