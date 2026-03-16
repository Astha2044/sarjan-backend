import User from "../models/User.js";

export const checkPlanLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.plan === "free" && user.messageCount >= 10) {
      return res.status(403).json({
        error: "limit_reached",
        message: "Free plan limit reached. Upgrade to Pro.",
      });
    }
    user.messageCount += 1;
    await user.save();
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

export const checkImageAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.plan === "free" && req.files && req.files.length > 0) {
      return res.status(403).json({
        error: "upgrade_required",
        message: "Image analysis is only available for Pro users.",
      });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};