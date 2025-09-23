const express = require('express');

// BigInt serialization middleware
function bigIntSerializer(req, res, next) {
  // Override the json method to handle BigInt serialization
  const originalJson = res.json;

  res.json = function(body) {
    try {
      // Custom replacer function to handle BigInt values
      const bigIntReplacer = (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };

      // Serialize and parse to handle BigInt values consistently
      const sanitized = JSON.parse(JSON.stringify(body, bigIntReplacer));
      return originalJson.call(this, sanitized);
    } catch (error) {
      console.error('BigInt serialization error:', error);
      // Fallback to original behavior if serialization fails
      return originalJson.call(this, body);
    }
  };

  next();
}

// Other serialization utilities
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

function sanitizeForLogging(data) {
  // Remove sensitive information from logs
  const sensitive = ['password', 'token', 'authorization', 'cookie', 'session'];

  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitize(value);
      }
    }
    return result;
  };

  return sanitize(data);
}

module.exports = {
  bigIntSerializer,
  sanitizeObject,
  sanitizeForLogging
};