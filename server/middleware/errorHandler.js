const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.stack || err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'ভ্যালিডেশন ত্রুটি (Validation Error)',
      errors: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} ইতিমধ্যে ব্যবহৃত হয়েছে (${field} already exists)`
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'অবৈধ আইডি ফরম্যাট (Invalid ID format)'
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'সার্ভার ত্রুটি (Internal Server Error)'
  });
};

export default errorHandler;
