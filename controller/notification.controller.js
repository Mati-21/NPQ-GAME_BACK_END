import NotificationModel from "../model/notification.model.js";

// Fetch notifications for the logged-in user
export const getNotifications = async (req, res, next) => {
  try {
    const recipientId = req.userId;

    const notifications = await NotificationModel.find({ recipient: recipientId })
      .populate("sender", "username avatar firstName lastName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res, next) => {
  try {
    const recipientId = req.userId;

    await NotificationModel.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};

// Mark one notification as read
export const markOneAsRead = async (req, res, next) => {
  try {
    const recipientId = req.userId;
    const { id } = req.params;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, recipient: recipientId },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    next(error);
  }
};
