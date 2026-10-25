function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(', ')}`;
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }
  if (status === 500) console.error(err);

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
