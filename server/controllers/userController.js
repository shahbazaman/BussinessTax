import User from '../models/User.js'; 

export const getCustomUnits = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ customUnits: user.customUnits || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCustomUnits = async (req, res) => {
  try {
    const { customUnits } = req.body;
    console.log("User Model:", User); 
    console.log("Request User:", req.user);
    // Safety Check: Ensure we aren't saving null
    if (!customUnits || !Array.isArray(customUnits)) {
      return res.status(400).json({ message: "Invalid units format" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.customUnits = customUnits;
    await user.save();
    
    res.json({ customUnits: user.customUnits });
  } catch (error) {
    console.error("Backend Error:", error); // This will show in your Render logs
    res.status(500).json({ message: error.message });
  }
};